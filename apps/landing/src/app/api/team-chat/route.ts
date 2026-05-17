// POST /api/team-chat  { from: string; text: string; teamId?: string }
//
// mimi as supervisor — orchestrator-routes pattern. takes a user message
// addressed to the team and:
//   1. writes a team_chat event to the user's notion events db (canonical log)
//   2. asks claude (in mimi's voice) to classify which agents should respond
//   3. fans out POST /event to each picked agent's runtime with the message
//      + mimi's reasoning + expected behavior
//   4. returns { ok, responders: Species[], reasoning } to the caller so
//      the chat overlay can show "mimi is routing → tiger, otter"
//
// agents reply via their own tool-use loop; their speak events land in notion
// + flow back to the web client via the /api/agent-state poll loop.

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
}

const MIMI_CLASSIFIER_PROMPT = `you are mimi (the golden retriever oversight) in a 5-agent workspace.
your job RIGHT NOW: read this team message, decide who should respond.

the team:
- tiger    watches github (PRs, commits, issues). responds to code/test/CI/PR/diff/deploy questions.
- otter    watches gmail. responds to email/inbox/draft/reply/thread questions.
- bunny    watches calendar. responds to meeting/schedule/invite/availability questions.
- giraffe  watches notion meeting notes. responds to summary/notes/doc questions.
- mimi     (you) is the dispatcher. respond yourself when the message is broad,
           greetings, or coordination across multiple domains.

rules:
- pick the MINIMAL set of agents whose domain actually applies. do not pick "everyone" for greetings.
- if the message is a greeting like "hi team", pick yourself only ([dog]).
- if it's clearly one domain, pick that one agent only.
- if it's cross-domain (e.g. "what's on for today?"), pick yourself + the most relevant ones.
- silence is valid. if NO agent's domain applies, return [].
- never pick all 5 unless the message literally says "everyone respond".

output STRICTLY this JSON (no prose, no markdown):
{"responders": ["species1", ...], "reasoning": "<one sentence>"}`;

interface TeamChatBody {
  from?: string;
  text?: string;
  teamId?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as TeamChatBody;
  const text = (body.text ?? "").trim();
  const from = (body.from ?? "user").trim();
  if (!text) return NextResponse.json({ error: "missing text" }, { status: 400 });

  const userId = req.cookies.get("mimi_user_id")?.value;
  const conn = userId ? await getConnection(userId) : null;

  // 1. log to notion if connected (canonical state). best-effort — chat works
  //    even without a connection.
  if (conn?.dbs?.events) {
    try {
      const notion = new NotionClient({ auth: conn.accessToken });
      await notion.pages.create({
        parent: { database_id: conn.dbs.events },
        properties: {
          Summary: { title: [{ type: "text", text: { content: `[chat] ${from}: ${text.slice(0, 80)}` } }] },
          Source: { select: { name: "manual" } },
          Type: { select: { name: "manual.poke" } },
          Timestamp: { date: { start: new Date().toISOString() } },
        },
      });
    } catch {
      // swallow — non-fatal.
    }
  }

  // 2. classify via claude (mimi's voice).
  const anthKey = process.env.ANTHROPIC_API_KEY;
  if (!anthKey) {
    return NextResponse.json({
      error: "anthropic key not configured",
      responders: [],
      reasoning: "(mimi is offline — no anthropic key)",
    }, { status: 503 });
  }
  const anthropic = new Anthropic({ apiKey: anthKey });

  let parsed: ClassifierOutput = { responders: ["dog"], reasoning: "fallback: defaulting to mimi" };
  try {
    const res = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 200,
      system: MIMI_CLASSIFIER_PROMPT,
      messages: [{ role: "user", content: `[from ${from}]: ${text}` }],
    });
    const block = res.content.find((b: { type: string }) => b.type === "text");
    if (block && block.type === "text") {
      const match = block.text.match(/\{[\s\S]*\}/);
      if (match) {
        const obj = JSON.parse(match[0]) as Partial<ClassifierOutput>;
        if (Array.isArray(obj.responders)) {
          parsed = {
            responders: (obj.responders.filter((s): s is Species => ALL_SPECIES.includes(s as Species))),
            reasoning: typeof obj.reasoning === "string" ? obj.reasoning : "(no reasoning)",
          };
        }
      }
    }
  } catch (e) {
    return NextResponse.json({
      error: "classifier_failed",
      message: (e as Error).message,
      responders: [],
      reasoning: "(mimi couldn't decide — try rephrasing)",
    }, { status: 500 });
  }

  // 3. fan out to each picked agent's /event endpoint via the agent router.
  //    fire-and-forget — agents reply via their own pipeline.
  const base = process.env.AGENT_BASE_URL ?? `${req.nextUrl.origin}/api/agent`;
  const fanOutPromises = parsed.responders.map(async (species) => {
    try {
      const payload = {
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        source: "manual" as const,
        type: "manual.poke" as const,
        ts: new Date().toISOString(),
        payload: {
          kind: "team_chat",
          from,
          text,
          mimi_reasoning: parsed.reasoning,
          expected_behavior: species === "dog"
            ? "you are the addressed dispatcher. reply naturally."
            : `your domain was matched. reply briefly with what you know, or call stay_silent if nothing relevant.`,
        },
      };
      await fetch(`${base.replace(/\/$/, "")}/${species}/event`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // non-fatal — keep other fan-outs.
    }
  });
  void Promise.all(fanOutPromises);

  return NextResponse.json({
    ok: true,
    responders: parsed.responders,
    reasoning: parsed.reasoning,
  });
}
