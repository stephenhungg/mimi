// shared stores for cross-canvas/dom state. r3f Canvas is an isolated React
// root so we use plain pub/sub stores instead of context to bridge canvas/dom.
//
// stores:
//   • playerPosStore   — local player camera pose (written by PlayerController).
//   • trainerCardStore — which agent's trainer card is open.
//   • agentStateStore  — latest agent state per identity (polled from notion).
//
// note: this replaces the old livekit-driven MimiRoomProvider. mimi. v1 is
// single-player in the 3D scene; agent state lands here via short polling on
// notion events (apps/landing/api/agent-state).

import { type Species, type AgentState, type Mood } from "@mimi/types";
import type { TrainerCardData } from "../components/TrainerCard";

// ─── player pose ────────────────────────────────────────────────────────────

export interface PlayerPos {
  x: number;
  z: number;
  rot: number; // yaw radians
}

class PlayerPosStore {
  private pos: PlayerPos = { x: 0, z: 0, rot: 0 };
  private listeners = new Set<(p: PlayerPos) => void>();
  set(p: PlayerPos): void {
    this.pos = p;
    this.listeners.forEach((l) => l(p));
  }
  get(): PlayerPos { return this.pos; }
  subscribe(fn: (p: PlayerPos) => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }
}
export const playerPosStore = new PlayerPosStore();

// ─── trainer card ───────────────────────────────────────────────────────────

class TrainerCardStore {
  private active: TrainerCardData | null = null;
  private listeners = new Set<(c: TrainerCardData | null) => void>();
  open(c: TrainerCardData): void {
    this.active = c;
    this.listeners.forEach((l) => l(c));
  }
  close(): void {
    this.active = null;
    this.listeners.forEach((l) => l(null));
  }
  get(): TrainerCardData | null { return this.active; }
  subscribe(fn: (c: TrainerCardData | null) => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }
}
export const trainerCardStore = new TrainerCardStore();

// ─── agent state (polled from notion) ──────────────────────────────────────

export interface AgentLiveState {
  species: Species;
  identity: string;
  state: AgentState;
  mood?: Mood;
  pos?: { x: number; z: number };
  speaking?: string;       // most recent speak text
  lastSpeakTs?: number;    // ms epoch — for dedup across polls
}

class AgentStateStore {
  private map = new Map<string, AgentLiveState>(); // keyed by identity
  private listeners = new Set<(snapshot: Map<string, AgentLiveState>) => void>();
  upsert(s: AgentLiveState): void {
    this.map.set(s.identity, s);
    this.listeners.forEach((l) => l(this.map));
  }
  /** bulk-replace with the latest poll fetch. */
  replace(entries: AgentLiveState[]): void {
    this.map.clear();
    for (const e of entries) this.map.set(e.identity, e);
    this.listeners.forEach((l) => l(this.map));
  }
  get(identity: string): AgentLiveState | undefined { return this.map.get(identity); }
  all(): Map<string, AgentLiveState> { return this.map; }
  subscribe(fn: (snap: Map<string, AgentLiveState>) => void): () => void {
    this.listeners.add(fn);
    fn(this.map);
    return () => { this.listeners.delete(fn); };
  }
}
export const agentStateStore = new AgentStateStore();

// ─── tiny identity helper ──────────────────────────────────────────────────

export function loadOrCreateLocalIdentity(): { identity: string; name: string } {
  if (typeof window === "undefined") return { identity: "guest", name: "guest" };
  let id = window.localStorage.getItem("mimi_identity");
  if (!id) {
    id = `guest-${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem("mimi_identity", id);
  }
  let nm = window.localStorage.getItem("mimi_name");
  if (!nm) {
    nm = id;
    window.localStorage.setItem("mimi_name", nm);
  }
  return { identity: id, name: nm };
}
