// anthropic tool schemas + dispatcher.
//
// each tool maps to a real side effect: broadcaster (visual state) and/or
// notion (durable writes). schemas are json-schema as required by anthropic.

import type Anthropic from "@anthropic-ai/sdk";

import {
  SPECIES_DESK,
  type ArtifactRow,
  type Mood,
  type Position,
  type Species,
} from "@mimi/types";
import type { MimiNotion } from "@mimi/notion-client";

import type { LiveKitBroadcaster } from "./broadcaster.js";

// ─── tool input shapes (mirrored from json schema, for type safety) ─────────

export interface WalkToInput {
  x: number;
  z: number;
}
export interface TypeAtKeyboardInput {
  ms: number;
}
export interface SpeakInput {
  text: string;
}
export interface SetMoodInput {
  mood: Mood;
}
export interface CurlUpInput {
  reason?: string;
}
export interface ResetPoseInput {
  /* no fields */
}
export interface FileArtifactInput {
  kind: ArtifactRow["kind"];
  title: string;
  body: string;
  url?: string;
}

// ─── tool definitions for anthropic.messages.create({ tools }) ──────────────

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "walk_to",
    description:
      "walk to a position in the room. agent walks at 2 units/sec toward target. use this before working at a desk.",
    input_schema: {
      type: "object",
      properties: {
        x: { type: "number", description: "world x coordinate" },
        z: { type: "number", description: "world z coordinate" },
      },
      required: ["x", "z"],
    },
  },
  {
    name: "type_at_keyboard",
    description:
      "play the keyboard-slam working animation for the given duration in ms. use after walking to a desk to represent 'doing work'.",
    input_schema: {
      type: "object",
      properties: {
        ms: {
          type: "number",
          description: "how long to type, in milliseconds. typical: 1500-5000.",
        },
      },
      required: ["ms"],
    },
  },
  {
    name: "speak",
    description:
      "say a single line aloud in animalese with a subtitle. keep it short — one sentence is ideal, two is the absolute ceiling.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "the subtitle text. lowercase." },
      },
      required: ["text"],
    },
  },
  {
    name: "set_mood",
    description:
      "change the mood expression on your face. options: happy, focused, sleepy, sad, panicked, sparkly, down.",
    input_schema: {
      type: "object",
      properties: {
        mood: {
          type: "string",
          enum: ["happy", "focused", "sleepy", "sad", "panicked", "sparkly", "down"],
        },
      },
      required: ["mood"],
    },
  },
  {
    name: "curl_up",
    description:
      "curl into a slime puddle. use only when you genuinely cannot continue. the runtime usually calls this for you on errors.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "short reason, lowercase." },
      },
      required: [],
    },
  },
  {
    name: "reset_pose",
    description: "stand back up at your home desk in idle state.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "file_artifact",
    description:
      "save a durable artifact to notion. use for things worth remembering: a pr draft, a decision, a calendar entry, an email reply, a note.",
    input_schema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["pr_draft", "calendar_entry", "email_reply", "decision", "note"],
        },
        title: { type: "string" },
        body: { type: "string" },
        url: { type: "string", description: "optional external link" },
      },
      required: ["kind", "title", "body"],
    },
  },
];

// ─── dispatcher context — passed into runTool ──────────────────────────────

export interface ToolContext {
  species: Species;
  identity: string;
  broadcaster: LiveKitBroadcaster;
  notion: MimiNotion;
  // mutable runtime state — updated by tool side effects.
  state: {
    pos: Position;
    mood: Mood;
  };
  // append-only buffer of conversation lines this turn; flushed once at end.
  speakLog: string[];
  // artifacts created this turn; returned to /dialogue callers.
  artifactsCreated: Array<{ id: string; title: string }>;
}

// ─── tool execution — one dispatcher for all tools ─────────────────────────

export async function runTool(
  name: string,
  rawInput: unknown,
  ctx: ToolContext,
): Promise<string> {
  switch (name) {
    case "walk_to": {
      const input = rawInput as WalkToInput;
      return walkTo(input, ctx);
    }
    case "type_at_keyboard": {
      const input = rawInput as TypeAtKeyboardInput;
      return typeAtKeyboard(input, ctx);
    }
    case "speak": {
      const input = rawInput as SpeakInput;
      return speak(input, ctx);
    }
    case "set_mood": {
      const input = rawInput as SetMoodInput;
      return setMood(input, ctx);
    }
    case "curl_up": {
      const input = rawInput as CurlUpInput;
      return curlUp(input, ctx);
    }
    case "reset_pose": {
      return resetPose(ctx);
    }
    case "file_artifact": {
      const input = rawInput as FileArtifactInput;
      return fileArtifact(input, ctx);
    }
    default:
      return `unknown tool: ${name}`;
  }
}

// ─── individual tool implementations ───────────────────────────────────────

const WALK_SPEED = 2; // world units per second
const WALK_TICK_MS = 200; // broadcast cadence while walking

async function walkTo(input: WalkToInput, ctx: ToolContext): Promise<string> {
  const start = { ...ctx.state.pos };
  const dx = input.x - start.x;
  const dz = input.z - start.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 0.05) {
    return `already at (${input.x}, ${input.z})`;
  }
  const totalMs = (dist / WALK_SPEED) * 1000;
  const steps = Math.max(1, Math.ceil(totalMs / WALK_TICK_MS));
  await ctx.broadcaster.broadcastState("walking", start, ctx.state.mood);

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const pos: Position = {
      x: start.x + dx * t,
      z: start.z + dz * t,
    };
    ctx.state.pos = pos;
    await ctx.broadcaster.broadcastState("walking", pos, ctx.state.mood);
    if (i < steps) await sleep(WALK_TICK_MS);
  }
  await ctx.broadcaster.broadcastState("idle", ctx.state.pos, ctx.state.mood);
  return `arrived at (${input.x}, ${input.z}) after ${Math.round(totalMs)}ms`;
}

async function typeAtKeyboard(input: TypeAtKeyboardInput, ctx: ToolContext): Promise<string> {
  const ms = clamp(input.ms, 200, 10_000);
  await ctx.broadcaster.broadcastState("working", ctx.state.pos, ctx.state.mood);
  await sleep(ms);
  await ctx.broadcaster.broadcastState("idle", ctx.state.pos, ctx.state.mood);
  return `worked for ${ms}ms`;
}

async function speak(input: SpeakInput, ctx: ToolContext): Promise<string> {
  const text = input.text.trim();
  if (!text) return "speak called with empty text";
  await ctx.broadcaster.broadcastSpeak(text);
  ctx.speakLog.push(text);
  // log the line as a single-turn conversation. cheap, append-only.
  try {
    await ctx.notion.appendConversation({
      ts: new Date().toISOString(),
      participants: [ctx.identity],
      transcript: [{ from: ctx.identity, text, ts: new Date().toISOString() }],
      topic: `${ctx.identity} speak`,
    });
  } catch (err) {
    // do not fail the tool over notion latency / hiccups.
    console.warn(`[${ctx.identity}] conversation log failed:`, err);
  }
  return `spoke: ${text}`;
}

async function setMood(input: SetMoodInput, ctx: ToolContext): Promise<string> {
  ctx.state.mood = input.mood;
  await ctx.broadcaster.broadcastState("idle", ctx.state.pos, input.mood);
  return `mood set to ${input.mood}`;
}

async function curlUp(input: CurlUpInput, ctx: ToolContext): Promise<string> {
  ctx.state.mood = "down";
  await ctx.broadcaster.broadcastState("down", ctx.state.pos, "down");
  const reason = input.reason ?? "needs a sec";
  try {
    await ctx.notion.appendEvent({
      source: "manual",
      type: "manual.poke",
      ts: new Date().toISOString(),
      summary: `${ctx.identity} curled up: ${reason}`,
      agent: ctx.species,
    });
  } catch (err) {
    console.warn(`[${ctx.identity}] curl_up event log failed:`, err);
  }
  return `curled up: ${reason}`;
}

async function resetPose(ctx: ToolContext): Promise<string> {
  const home = SPECIES_DESK[ctx.species];
  ctx.state.pos = { x: home[0], z: home[1] };
  ctx.state.mood = "happy";
  await ctx.broadcaster.broadcastState("idle", ctx.state.pos, "happy");
  return `reset to home (${home[0]}, ${home[1]})`;
}

async function fileArtifact(input: FileArtifactInput, ctx: ToolContext): Promise<string> {
  const row: ArtifactRow = {
    kind: input.kind,
    title: input.title,
    body: input.body,
    createdBy: ctx.species,
    ts: new Date().toISOString(),
    ...(input.url ? { url: input.url } : {}),
  };
  const id = await ctx.notion.createArtifact(row);
  ctx.artifactsCreated.push({ id, title: input.title });
  return `filed artifact ${id} (${input.kind}: ${input.title})`;
}

// ─── small helpers ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
