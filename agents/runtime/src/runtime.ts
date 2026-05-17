// AgentRuntime — the core loop.
//
// one process per persona. listens for ExternalEvents on /event, calls
// anthropic with the persona's system prompt + tools, executes each
// tool_use in a loop until the model returns end_turn.
//
// failure path (the whole point of mimi.): rate limit / api timeout /
// unknown error → curl_up + log + auto-recover after backoff. never crash.

import Anthropic from "@anthropic-ai/sdk";
import { APIError, RateLimitError } from "@anthropic-ai/sdk/error";

import {
  SPECIES_DESK,
  type ExternalEvent,
  type Mood,
  type Position,
  type Species,
} from "@mimi/types";
import type { MimiNotion } from "@mimi/notion-client";

import type { LiveKitBroadcaster } from "./broadcaster.js";
import type { PersonaConfig } from "../personas/index.js";
import { TOOLS, runTool, type ToolContext } from "./tools.js";

export interface AgentRuntimeOptions {
  species: Species;
  identity: string;
  persona: PersonaConfig;
  systemPrompt: string;
  notion: MimiNotion;
  broadcaster: LiveKitBroadcaster;
  anthropic: Anthropic;
  model: string;
}

export interface HandleEventResult {
  handled: boolean;
  reason?: string;
  speakLog: string[];
  artifactsCreated: Array<{ id: string; title: string }>;
}

const MAX_TOOL_TURNS = 12; // hard ceiling on tool_use loops per event
const DEFAULT_DOWN_MS = 60_000;

export class AgentRuntime {
  readonly species: Species;
  readonly identity: string;
  private readonly persona: PersonaConfig;
  private readonly systemPrompt: string;
  private readonly notion: MimiNotion;
  private readonly broadcaster: LiveKitBroadcaster;
  private readonly anthropic: Anthropic;
  private readonly model: string;

  // mutable runtime state — read by /health, written by tools + failure path.
  private pos: Position;
  private mood: Mood = "happy";
  private downUntil: number | null = null;
  private downReason: string | null = null;

  constructor(opts: AgentRuntimeOptions) {
    this.species = opts.species;
    this.identity = opts.identity;
    this.persona = opts.persona;
    this.systemPrompt = opts.systemPrompt;
    this.notion = opts.notion;
    this.broadcaster = opts.broadcaster;
    this.anthropic = opts.anthropic;
    this.model = opts.model;
    const home = SPECIES_DESK[this.species];
    this.pos = { x: home[0], z: home[1] };
  }

  async start(): Promise<void> {
    process.stderr.write(`[${this.identity}] starting…\n`);
    await this.broadcaster.start();
    process.stderr.write(`[${this.identity}] broadcaster started\n`);
    // resident upsert + joining event — best-effort + bounded so a notion 401
    // or 5s+ cloudflare hiccup doesn't keep the listener from binding.
    const joinedAt = new Date().toISOString();
    const TIMEOUT = 5000;
    const timed = <T>(p: Promise<T>): Promise<T | null> =>
      Promise.race([
        p,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT)),
      ]).catch((err) => {
        console.warn(`[${this.identity}] notion call failed:`, (err as Error).message);
        return null;
      });
    await timed(
      this.notion.upsertResident({
        identity: this.identity,
        kind: "agent",
        name: this.persona.name,
        species: this.species,
        watches: this.persona.watches,
        joinedAt,
      }),
    );
    process.stderr.write(`[${this.identity}] resident upsert done\n`);
    await timed(
      this.notion.appendEvent({
        source: "manual",
        type: "manual.poke",
        ts: joinedAt,
        summary: `${this.identity} joined the room`,
        agent: this.species,
      }),
    );
    process.stderr.write(`[${this.identity}] join event logged\n`);
    process.stderr.write(`[${this.identity}] online — species=${this.species} watches=${this.persona.watches} model=${this.model}\n`);
    // mimi (the dog) runs a periodic dispatch loop on top of the normal /event loop:
    // every 30s, she reads the last 2 min of events from notion and decides whether
    // to speak a dispatch line. this is what makes her feel like the room's coordinator.
    if (this.identity === "mimi") this.startDispatchLoop();
  }

  // mimi-only oversight loop. polls events db, asks claude (with persona) whether
  // anything warrants a dispatch line right now. if yes, calls handleEvent with a
  // synthetic manual.poke so the normal tool-use loop drives walk_to + speak.
  // safe to no-op when nothing's happening — keeps token use low.
  private startDispatchLoop(): void {
    const TICK_MS = 30_000;
    const tick = async () => {
      if (this.isDown().down) return;
      try {
        const events = await this.notion.queryRecentEvents(8);
        const cutoff = Date.now() - 2 * 60 * 1000;
        const recent = events.filter((e) => new Date(e.ts).getTime() >= cutoff);
        if (recent.length === 0) return; // quiet room, nothing to say
        const summary = recent
          .map((e) => `- [${e.ts}] ${e.agent ?? "?"}: ${e.summary}`)
          .join("\n");
        const synthetic: ExternalEvent = {
          id: `dispatch-${Date.now()}`,
          source: "manual",
          type: "manual.poke",
          ts: new Date().toISOString(),
          payload: {
            kind: "dispatch_check",
            roster: ["tiger", "otter", "bunny", "giraffe"],
            recent_events: summary,
            note: "you're mimi, the oversight. decide if any of this warrants a one-line dispatch to the team. if nothing needs you, call reset_pose and stay quiet. don't speak unless it adds signal.",
          },
        };
        await this.handleEvent(synthetic);
      } catch (err) {
        console.warn(`[mimi] dispatch tick failed:`, err);
      }
    };
    // first tick after 10s so we don't talk before agents have joined.
    setTimeout(() => {
      tick().catch(() => {});
      setInterval(() => tick().catch(() => {}), TICK_MS);
    }, 10_000);
    console.log(`[mimi] dispatch loop armed (every ${TICK_MS}ms)`);
  }

  isDown(): { down: boolean; until?: number; reason?: string } {
    if (this.downUntil === null) return { down: false };
    if (Date.now() >= this.downUntil) {
      // auto-recover
      const reason = this.downReason ?? "recovered";
      this.downUntil = null;
      this.downReason = null;
      this.mood = "happy";
      // best-effort idle broadcast (don't await to keep isDown cheap).
      this.broadcaster
        .broadcastState("idle", this.pos, "happy")
        .catch((err) => console.warn(`[${this.identity}] reset broadcast failed:`, err));
      console.log(`[${this.identity}] back up (was: ${reason})`);
      return { down: false };
    }
    return { down: true, until: this.downUntil, reason: this.downReason ?? "down" };
  }

  health(): {
    species: Species;
    identity: string;
    state: "idle" | "down";
    pos: Position;
    mood: Mood;
    downUntil: number | null;
    downReason: string | null;
  } {
    const downState = this.isDown();
    return {
      species: this.species,
      identity: this.identity,
      state: downState.down ? "down" : "idle",
      pos: this.pos,
      mood: this.mood,
      downUntil: this.downUntil,
      downReason: this.downReason,
    };
  }

  async down(reason: string, ms: number = DEFAULT_DOWN_MS): Promise<void> {
    this.downUntil = Date.now() + ms;
    this.downReason = reason;
    this.mood = "down";
    try {
      await this.broadcaster.broadcastState("down", this.pos, "down");
    } catch (err) {
      console.warn(`[${this.identity}] down broadcast failed:`, err);
    }
    try {
      await this.notion.appendEvent({
        source: "manual",
        type: "manual.poke",
        ts: new Date().toISOString(),
        summary: `${this.identity} went down: ${reason} (back in ${Math.round(ms / 1000)}s)`,
        agent: this.species,
      });
    } catch (err) {
      console.warn(`[${this.identity}] down event log failed:`, err);
    }
    console.log(`[${this.identity}] DOWN: ${reason} (recovering in ${ms}ms)`);
  }

  async handleEvent(event: ExternalEvent): Promise<HandleEventResult> {
    const downState = this.isDown();
    if (downState.down) {
      console.log(`[${this.identity}] agent down (${downState.reason}), dropping event ${event.id}`);
      return {
        handled: false,
        reason: `agent down: ${downState.reason}`,
        speakLog: [],
        artifactsCreated: [],
      };
    }

    // log the inbound event for the trail. best-effort.
    try {
      await this.notion.appendEvent({
        source: event.source,
        type: event.type,
        ts: event.ts,
        summary: summarizeEvent(event),
        agent: this.species,
        rawPayload: JSON.stringify(event.payload),
      });
    } catch (err) {
      console.warn(`[${this.identity}] event log failed:`, err);
    }

    const ctx: ToolContext = {
      species: this.species,
      identity: this.identity,
      broadcaster: this.broadcaster,
      notion: this.notion,
      state: { pos: this.pos, mood: this.mood },
      speakLog: [],
      artifactsCreated: [],
    };

    const userText = renderEventForModel(event);
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: userText },
    ];

    try {
      for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
        const response = await this.anthropic.messages.create({
          model: this.model,
          max_tokens: 1024,
          system: this.systemPrompt,
          tools: TOOLS,
          messages,
        });

        // collect tool_use blocks; execute each; append to messages.
        const toolUses = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
        );

        // record the assistant turn (full content, not just tool_use).
        messages.push({ role: "assistant", content: response.content });

        if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
          // end_turn (or stop / max_tokens / etc) — done.
          break;
        }

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const tu of toolUses) {
          const result = await runTool(tu.name, tu.input, ctx);
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: result,
          });
        }
        messages.push({ role: "user", content: toolResults });
      }
      // commit ctx mutations back to runtime fields.
      this.pos = ctx.state.pos;
      this.mood = ctx.state.mood;

      return {
        handled: true,
        speakLog: ctx.speakLog,
        artifactsCreated: ctx.artifactsCreated,
      };
    } catch (err) {
      // failure as first-class state.
      const { reason, backoffMs } = classifyError(err);
      // still commit any partial state from the run.
      this.pos = ctx.state.pos;
      this.mood = ctx.state.mood;
      await this.down(reason, backoffMs);
      return {
        handled: false,
        reason,
        speakLog: ctx.speakLog,
        artifactsCreated: ctx.artifactsCreated,
      };
    }
  }
}

// ─── helpers ───────────────────────────────────────────────────────────────

function summarizeEvent(event: ExternalEvent): string {
  const head = `${event.source}:${event.type}`;
  const payloadHint = pickHint(event.payload);
  return payloadHint ? `${head} — ${payloadHint}` : head;
}

function pickHint(payload: Record<string, unknown>): string {
  for (const key of ["title", "subject", "summary", "text", "message", "ref"]) {
    const v = payload[key];
    if (typeof v === "string" && v.length > 0) return v.slice(0, 120);
  }
  return "";
}

function renderEventForModel(event: ExternalEvent): string {
  const lines = [
    `event id: ${event.id}`,
    `source: ${event.source}`,
    `type: ${event.type}`,
    `time: ${event.ts}`,
    `payload:`,
    JSON.stringify(event.payload, null, 2),
  ];
  if (event.routeTo) lines.push(`routed to: ${event.routeTo}`);
  return lines.join("\n");
}

function classifyError(err: unknown): { reason: string; backoffMs: number } {
  if (err instanceof RateLimitError) {
    return { reason: `rate limit: ${err.message}`, backoffMs: 90_000 };
  }
  if (err instanceof APIError) {
    return { reason: `api error: ${err.message}`, backoffMs: 60_000 };
  }
  if (err instanceof Error) {
    return { reason: err.message, backoffMs: DEFAULT_DOWN_MS };
  }
  return { reason: "unknown error", backoffMs: DEFAULT_DOWN_MS };
}
