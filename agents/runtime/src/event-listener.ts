// http listener — accepts events from mimi-events worker + dialogue from web client.
// uses Bun.serve so the runtime can `bun dev` without an extra http lib.

import { z } from "zod";

import type { AgentRuntime } from "./runtime.js";
import type { ExternalEvent } from "@mimi/types";

const EVENT_SCHEMA = z.object({
  id: z.string(),
  source: z.enum(["github", "gmail", "calendar", "notion", "manual"]),
  type: z.enum([
    "github.push",
    "github.pull_request",
    "github.issues",
    "gmail.thread",
    "calendar.invite",
    "calendar.starting_soon",
    "notion.meeting_notes",
    "manual.poke",
  ]),
  ts: z.string(),
  payload: z.record(z.unknown()),
  routeTo: z.enum(["tiger", "otter", "bunny", "dog", "giraffe"]).optional(),
});

const DIALOGUE_SCHEMA = z.object({
  from: z.string(),
  text: z.string(),
});

export interface ListenerOptions {
  runtime: AgentRuntime;
  port?: number;
}

export interface ListenerHandle {
  port: number;
  stop: () => Promise<void>;
}

// Bun's global typing isn't pulled in by default with @types/node + lib: DOM.
// declared as `any` so this file compiles in plain node typecheck.
// at runtime we're under bun, which provides Bun.serve.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Bun: any;

export function startListener(opts: ListenerOptions): ListenerHandle {
  const port = opts.port ?? Number(process.env.AGENT_PORT ?? 0);
  const server = Bun.serve({
    port,
    fetch: async (req: Request): Promise<Response> => {
      const url = new URL(req.url);

      if (req.method === "GET" && url.pathname === "/health") {
        return json(opts.runtime.health());
      }

      if (req.method === "POST" && url.pathname === "/event") {
        const body = await safeJson(req);
        const parsed = EVENT_SCHEMA.safeParse(body);
        if (!parsed.success) {
          return json({ error: "invalid event", issues: parsed.error.issues }, 400);
        }
        // fire and forget — we don't want webhook senders blocking on claude.
        const event = parsed.data as ExternalEvent;
        void opts.runtime.handleEvent(event).catch((err: unknown) => {
          console.error(`[${opts.runtime.identity}] handleEvent crashed:`, err);
        });
        return json({ ok: true, accepted: event.id });
      }

      if (req.method === "POST" && url.pathname === "/dialogue") {
        const body = await safeJson(req);
        const parsed = DIALOGUE_SCHEMA.safeParse(body);
        if (!parsed.success) {
          return json({ error: "invalid dialogue", issues: parsed.error.issues }, 400);
        }
        const event: ExternalEvent = {
          id: `dialogue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          source: "manual",
          type: "manual.poke",
          ts: new Date().toISOString(),
          payload: { dialogueText: parsed.data.text, from: parsed.data.from },
        };
        // synchronous — dialogue caller wants the reply.
        const result = await opts.runtime.handleEvent(event);
        return json({
          ok: result.handled,
          reason: result.reason,
          speakLog: result.speakLog,
          artifacts: result.artifactsCreated,
        });
      }

      return json({ error: "not found" }, 404);
    },
  });

  const boundPort: number = server.port;
  console.log(
    `[${opts.runtime.identity}] listening on http://localhost:${boundPort}\n` +
      `  health:    curl http://localhost:${boundPort}/health\n` +
      `  dialogue:  curl -X POST http://localhost:${boundPort}/dialogue -d '{"from":"stephen","text":"hi"}' -H content-type:application/json`,
  );

  return {
    port: boundPort,
    stop: async () => {
      await server.stop();
    },
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function safeJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
