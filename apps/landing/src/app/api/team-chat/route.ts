// POST /api/team-chat  { from: string; text: string; teamId?: string }
//
// ECHO CHAMBER MODE — agents talk to each other, not just to the user.
//
// flow per turn:
//   1. log the speaker's message (user or agent) as a team_chat event in notion
//   2. claude (the "chaos classifier") reads the conversation so far, picks
//      who should respond NEXT (1-3 agents). their persona is told they can
//      respond to each other, not just the user. mimi can't dispatch out of it.
//   3. fan-out POST /event to each picked agent with the FULL transcript as
//      context (so they riff off what was just said, not just the original msg)
//   4. each agent's speak lands as an agent_speak event in notion. a worker
//      (or apps/web's /api/team-chat-tick handler) detects new speaks and
//      recurses by calling /api/team-chat-next.
//
// soft cap: TURN_LIMIT (default 8) — silent termination, no announcement.
//   without this the chain could rate-limit anthropic mid-demo. agents simply
//   stop being picked once depth hits the limit; they naturally peter out.
//
// returns: { ok, responders, reasoning, round, transcriptLength }

import { NextRequest, NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import Anthropic from "@anthropic-ai/sdk";
import { getConnection } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

type Species = "tiger" | "otter" | "bunny" | "dog" | "giraffe";

const ALL_SPECIES: Species[] = ["tiger", "otter", "bunny", "dog", "giraffe"];

interface ClassifierOutput {
  responders: Species[];
  reasoning: string;
  shouldContinue: boolean;
}

interface TranscriptTurn {
  speaker: string;             // "user" | "tiger" | "otter" | ...
  text: string;
}

const TURN_LIMIT = 8;

const CHAOS_CLASSIFIER_PROMPT = `you are mimi (the golden retriever) and you are running an ECHO CHAMBER agent group chat.

the 5 chibi animal agents:
- tiger    (github watcher, dry tech voice)
- otter    (gmail watcher, warm chatty voice)
- bunny    (calendar watcher, chipper punctual voice)
- giraffe  (notion notes watcher, thoughtful slow voice)
- mimi     (oversight dispatcher — that's YOU)

THIS IS A DOOM SPIRAL. agents are allowed to:
- respond to each other (not just the user)
- bicker, agree, escalate, riff
- chime in even if it's NOT their domain — they have opinions
- get sucked into vibes

your job: pick the next 1-3 agents to speak based on the conversation so far.

rules:
- pick agents who would NATURALLY respond to what was JUST said (last turn matters most)
- duplicates are fine — same agent can speak again in a later round
- if someone made a hot take, pick the agent most likely to disagree
- if mimi (you) was last, pick agents who would push back on her
- ALWAYS keep the chain going for at least 4 rounds unless everyone's clearly out
- silence is rare in echo mode — only return [] if the conversation has truly ended
- you can pick yourself (dog) freely

output STRICTLY this JSON (no prose, no markdown):
{"responders": ["species1", "species2"], "reasoning": "<one short sentence on why>", "shouldContinue": true}

shouldContinue=false ONLY when the conversation has clearly resolved or everyone is repeating themselves.`;

interface TeamChatBody {
  from?: string;
  text?: string;
  teamId?: string;
  // for recursion: the full transcript so far + current round number.
  transcript?: TranscriptTurn[];
  round?: number;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as TeamChatBody;
  const text = (body.text ?? "").trim();
  const from = (body.from ?? "user").trim();
  if (!text) return NextResponse.json({ error: "missing text" }, { status: 400 });

  // build or extend the transcript.
  const transcript: TranscriptTurn[] = [
    ...(body.transcript ?? []),
    { speaker: from, text },
  ];
  const round = (body.round ?? 0) + 1;

  // hard cap — silent termination.
  if (round > TURN_LIMIT) {
    return NextResponse.json({
      ok: true,
      responders: [],
      reasoning: "(silent cap reached — conversation petered out)",
      round,
      capped: true,
    });
  }

  const userId = req.cookies.get("mimi_user_id")?.value;
  const conn = userId ? await getConnection(userId) : null;

  // 1. log the latest turn to notion if connected. best-effort.
  if (conn?.dbs?.events) {
    try {
      const notion = new NotionClient({ auth: conn.accessToken });
      await notion.pages.create({
        parent: { database_id: conn.dbs.events },
        properties: {
          Summary: { title: [{ type: "text", text: { content: `[chat r${round}] ${from}: ${text.slice(0, 80)}` } }] },
          Source: { select: { name: "manual" } },
          Type: { select: { name: "manual.poke" } },
          Timestamp: { date: { start: new Date().toISOString() } },
        },
      });
    } catch {
      // non-fatal
    }
  }

  // 2. classify via claude.
  const anthKey = process.env.ANTHROPIC_API_KEY;
  if (!anthKey) {
    return NextResponse.json({
      error: "anthropic key not configured",
      responders: [],
      reasoning: "(mimi is offline — no anthropic key)",
    }, { status: 503 });
  }
  const anthropic = new Anthropic({ apiKey: anthKey });

  // render transcript as compact lines for the classifier.
  const transcriptStr = transcript
    .slice(-10) // last 10 turns is plenty of context
    .map((t) => `${t.speaker}: ${t.text}`)
    .join("\n");

  let parsed: ClassifierOutput = { responders: [], reasoning: "fallback: no responders", shouldContinue: false };
  try {
    const res = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 300,
      system: CHAOS_CLASSIFIER_PROMPT,
      messages: [{
        role: "user",
        content: `current round: ${round}/${TURN_LIMIT}\n\ntranscript so far:\n${transcriptStr}\n\nwho should speak next?`,
      }],
    });
    const block = res.content.find((b: { type: string }) => b.type === "text");
    if (block && block.type === "text") {
      const match = block.text.match(/\{[\s\S]*\}/);
      if (match) {
        const obj = JSON.parse(match[0]) as Partial<ClassifierOutput>;
        if (Array.isArray(obj.responders)) {
          parsed = {
            responders: obj.responders.filter((s): s is Species => ALL_SPECIES.includes(s as Species)),
            reasoning: typeof obj.reasoning === "string" ? obj.reasoning : "(no reasoning)",
            shouldContinue: obj.shouldContinue !== false,
          };
        }
      }
    }
  } catch (e) {
    return NextResponse.json({
      error: "classifier_failed",
      message: (e as Error).message,
      responders: [],
      reasoning: "(mimi couldn't decide)",
      round,
    }, { status: 500 });
  }

  // if classifier says terminate, return early.
  if (!parsed.shouldContinue || parsed.responders.length === 0) {
    return NextResponse.json({
      ok: true,
      responders: [],
      reasoning: parsed.reasoning,
      round,
      terminated: true,
    });
  }

  // 3. fan out to each picked agent. for each, pass the FULL transcript as
  //    context — that's what makes the doom spiral feel natural.
  const base = process.env.AGENT_BASE_URL ?? `${req.nextUrl.origin}/api/agent`;

  // CRITICAL: each agent /event call hits a synchronous /dialogue-style claude
  // turn that can take 10-30s. we MUST NOT await that, or we'll block the route
  // for half a minute AND get hit by next.js timeouts that retry our own POST.
  // strategy: fire each fan-out with a 1s budget — that's enough to actually
  // begin the request but not enough to wait for the claude reply. the agent
  // runtime still receives + processes the event; its speak event lands in
  // notion + flows through /api/agent-state to apps/web's poll loop, which is
  // how each new round of the echo chamber is OBSERVED.
  //
  // recursion: we do NOT recurse on individual agent replies (that was an
  // infinite-loop bug: same agent's speakLog → re-classify → re-pick same
  // agent → forever). instead, the orchestrator picks the FULL set of
  // responders for THIS round in one shot, and the next round is driven by
  // the user OR a server-side worker (future v2).
  //
  // result: one user message → one classify call → N parallel agent fan-outs.
  // multi-round group dynamics emerge across separate user messages, NOT
  // automatic recursion. simpler + safer + still feels like a chat.
  // fan-out — AWAIT the agent /event POST (it's already fire-and-forget at
  // the runtime side: returns {ok, accepted} in <100ms then processes claude
  // in the background). awaiting here gives next.js a chance to actually send
  // the request before the route response is finalized — `void fetch()` gets
  // killed by next.js's response lifecycle in node runtime.
  //
  // hits the agent runtime DIRECTLY by port (skipping our own router) so we
  // don't recurse through next routes. port mapping mirrors the router's
  // default convention: tiger=8081, otter=8082, bunny=8083, dog=8084, giraffe=8085.
  const PORT_BY_SPECIES: Record<Species, number> = {
    tiger: 8081, otter: 8082, bunny: 8083, dog: 8084, giraffe: 8085,
  };
  const directBase = process.env.AGENT_DIRECT_BASE_URL ?? "http://localhost";
  await Promise.all(parsed.responders.map(async (species) => {
    const payload = {
      id: `chat-r${round}-${species}-${Date.now()}`,
      source: "manual" as const,
      type: "manual.poke" as const,
      ts: new Date().toISOString(),
      payload: {
        kind: "team_chat_echo",
        round,
        transcript: transcript.slice(-10),
        mimi_reasoning: parsed.reasoning,
        expected_behavior: `you are in an ECHO CHAMBER. you may respond to ANY other agent, not just the user. you can be off-domain. you can bicker, agree, escalate, riff. keep it ONE short line. be in character. mimi can't stop the spiral.`,
      },
    };
    const port = PORT_BY_SPECIES[species];
    try {
      await fetch(`${directBase}:${port}/event`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // non-fatal — log + move on. agent may be down.
    }
  }));
  // suppress unused-var warning while keeping `base` for compat with prod.
  void base;

  return NextResponse.json({
    ok: true,
    responders: parsed.responders,
    reasoning: parsed.reasoning,
    round,
    transcriptLength: transcript.length,
  });
}
