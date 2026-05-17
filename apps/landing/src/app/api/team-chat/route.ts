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
//   4. each agent's speak lands as an agent_speak event in notion. apps/web's
//      chat overlay observes fresh agent_speak rows via /api/agent-state and
//      posts the next transcript slice back here until TURN_LIMIT.
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

the 5 chibi animal agents (each species has STRONG domain ownership):
- tiger    (github — code, PRs, tests, CI, commits, deploys, diffs, branches)
- otter    (gmail — email, threads, replies, drafts, inbox, vendors)
- bunny    (calendar — meetings, schedule, availability, invites, times, agenda)
- giraffe  (notion — meeting notes, summaries, docs, recaps, decisions written down)
- mimi     (oversight — greetings, vibes, coordination, multi-domain check-ins. that's YOU.)

domain mapping is STRICT. the right specialist OWNS their domain. don't substitute.

routing rules (apply in order):
1. greeting / hello / "hey team" / "good morning" → ["dog"] only. mimi greets, others stay quiet.
2. single domain match → pick that ONE specialist + optionally mimi to chime in.
   - "tests failing" / "PR broken" / "commit pushed" → ["tiger"]
   - "recap standup" / "what did we decide" / "summary of notes" → ["giraffe"]
   - "reply to email" / "did we email back" / "inbox" → ["otter"]
   - "what's my schedule" / "free time" / "meeting at 3" → ["bunny"]
3. multi-domain → mimi + each owning specialist. e.g. "check in, anyone got time?" → ["dog", "bunny", "otter"]
4. agent-to-agent banter (someone made a take in the transcript) → pick agent who would push back.

the ECHO CHAMBER vibe: agents can riff off each other after the first round of correct routing.
but the FIRST round MUST hit the right domain. don't pick otter for a github question
just because otter is friendly.

silence is rare. only return [] if the conversation has truly ended.

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
  if (!text) return json(req, { error: "missing text" }, { status: 400 });

  // build or extend the transcript.
  const transcript: TranscriptTurn[] = [
    ...(body.transcript ?? []),
    { speaker: from, text },
  ];
  const round = (body.round ?? 0) + 1;

  // hard cap — silent termination.
  if (round > TURN_LIMIT) {
    return json(req, {
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
    return json(req, {
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
    return json(req, {
      error: "classifier_failed",
      message: (e as Error).message,
      responders: [],
      reasoning: "(mimi couldn't decide)",
      round,
    }, { status: 500 });
  }

  // if classifier says terminate, return early.
  if (!parsed.shouldContinue || parsed.responders.length === 0) {
    return json(req, {
      ok: true,
      responders: [],
      reasoning: parsed.reasoning,
      round,
      terminated: true,
    });
  }

  // 3. fan out to each picked agent. for each, pass the FULL transcript as
  //    context — that's what makes the doom spiral feel natural.
  // agent /event endpoints are fire-and-forget on the runtime side: they
  // return {ok, accepted} quickly and process claude in the background. we
  // still await the POST here so next.js actually sends it before finalizing
  // this response.
  const agentBase = process.env.AGENT_BASE_URL ?? `${req.nextUrl.origin}/api/agent`;
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
    try {
      await fetch(`${agentBase.replace(/\/$/, "")}/${species}/event`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // non-fatal — log + move on. agent may be down.
    }
  }));

  return json(req, {
    ok: true,
    responders: parsed.responders,
    reasoning: parsed.reasoning,
    round,
    transcriptLength: transcript.length,
  });
}

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

function json(req: NextRequest, body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  for (const [key, value] of Object.entries(cors(req))) {
    res.headers.set(key, value);
  }
  return res;
}

function cors(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}
