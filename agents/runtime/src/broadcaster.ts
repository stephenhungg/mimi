// agent broadcaster — formerly a livekit data-channel publisher. livekit is
// removed in v1: mimi. uses notion as the canonical state surface, and
// apps/web polls a derived /api/agent-state endpoint instead of subscribing
// to a realtime channel. this file keeps a Broadcaster interface so the
// runtime + tools don't have to know whether a live transport exists.
//
// behavior:
//   • LogBroadcaster (default) → console.log each broadcast for visibility
//     during demo runs. notion db writes are still the canonical record;
//     this is just for the dev terminal trail.
//   • NullBroadcaster → silent no-op. used if you want zero log noise.
//
// the runtime calls broadcastState/broadcastSpeak from inside tools, so even
// without a transport those calls succeed (and the actual state lands in
// notion via the tool's notion write).

import type { AgentState, Broadcast, Mood, Position, Species } from "@mimi/types";

export interface Broadcaster {
  start(): Promise<void>;
  broadcast(msg: Broadcast): Promise<void>;
  broadcastState(state: AgentState, pos?: Position, mood?: Mood): Promise<void>;
  broadcastSpeak(text: string): Promise<void>;
  disconnect(): Promise<void>;
}

interface CtorOpts {
  identity: string;
  species: Species;
  name: string;
}

// silent — for tests or background workers.
export class NullBroadcaster implements Broadcaster {
  async start(): Promise<void> {}
  async broadcast(): Promise<void> {}
  async broadcastState(): Promise<void> {}
  async broadcastSpeak(): Promise<void> {}
  async disconnect(): Promise<void> {}
}

// logs to stderr so the demo operator can watch each tool's broadcast land.
export class LogBroadcaster implements Broadcaster {
  private identity: string;
  private species: Species;
  private name: string;
  constructor(opts: CtorOpts) {
    this.identity = opts.identity;
    this.species = opts.species;
    this.name = opts.name;
  }
  async start(): Promise<void> {
    process.stderr.write(`[broadcaster:${this.identity}] ${this.name} online (${this.species})\n`);
  }
  async broadcast(msg: Broadcast): Promise<void> {
    const head = `[broadcaster:${this.identity}]`;
    switch (msg.type) {
      case "presence":
        process.stderr.write(`${head} presence kind=${msg.kind}${msg.species ? ` species=${msg.species}` : ""}\n`);
        return;
      case "agent_state":
        process.stderr.write(`${head} state=${msg.state}${msg.mood ? ` mood=${msg.mood}` : ""}${msg.pos ? ` pos=(${msg.pos.x},${msg.pos.z})` : ""}\n`);
        return;
      case "agent_speak":
        process.stderr.write(`${head} speak: ${msg.text.slice(0, 80)}\n`);
        return;
      case "chat":
      case "npc_request":
      case "event_echo":
        return; // not used by the runtime side
    }
  }
  async broadcastState(state: AgentState, pos?: Position, mood?: Mood): Promise<void> {
    await this.broadcast({
      type: "agent_state",
      identity: this.identity,
      species: this.species,
      state,
      ...(pos ? { pos } : {}),
      ...(mood ? { mood } : {}),
    });
  }
  async broadcastSpeak(text: string): Promise<void> {
    await this.broadcast({
      type: "agent_speak",
      identity: this.identity,
      species: this.species,
      text,
      animalese: true,
    });
  }
  async disconnect(): Promise<void> {}
}

// factory — keeps the previous signature so main.ts doesn't change.
// always returns LogBroadcaster in v1. swap to a real transport here later
// (server-sent events, websocket, vercel pubsub, etc) without touching callers.
export function broadcasterFromEnv(
  _env: Record<string, string | undefined>,
  opts: CtorOpts,
): Broadcaster {
  return new LogBroadcaster(opts);
}
