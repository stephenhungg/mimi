// shared stores for cross-canvas/dom state.
//
// realtime vendor transport is removed. do not re-add room providers,
// socket-style room hooks, or realtime vendor sdks to this app. transport is
// HTTP — apps/web polls /api/agent-state in apps/landing.
//
// stores (plain pub/sub — no react context, so they bridge canvas/dom):
//   • playerPosStore   — local player camera pose, written by PlayerController.
//   • trainerCardStore — which agent's trainer card is open.
//   • agentStateStore  — latest agent state per identity (polled from notion).
//   • chatStore        — recent chat lines (user messages + agent speaks).
//                        replaces the old room-context chat array.

import type { Species, AgentState, Mood } from "@mimi/types";
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

// ─── agent state (polled from notion via /api/agent-state) ─────────────────

export interface AgentLiveState {
  species: Species;
  identity: string;
  state: AgentState;
  mood?: Mood;
  pos?: { x: number; z: number };
  speaking?: string;
  lastSpeakTs?: number;
}

class AgentStateStore {
  private map = new Map<string, AgentLiveState>();
  private listeners = new Set<(snap: Map<string, AgentLiveState>) => void>();
  upsert(s: AgentLiveState): void {
    this.map.set(s.identity, s);
    this.listeners.forEach((l) => l(this.map));
  }
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

// ─── chat (user + agent speech) ────────────────────────────────────────────

export interface ChatRow {
  kind: "chat" | "agent_speak";
  identity: string;
  name: string;
  species?: Species;
  text: string;
  ts: number;
}

class ChatStore {
  private rows: ChatRow[] = [];
  private listeners = new Set<(rows: ChatRow[]) => void>();
  push(row: ChatRow): void {
    this.rows = [...this.rows, row].slice(-50);
    this.listeners.forEach((l) => l(this.rows));
  }
  all(): ChatRow[] { return this.rows; }
  subscribe(fn: (rows: ChatRow[]) => void): () => void {
    this.listeners.add(fn);
    fn(this.rows);
    return () => { this.listeners.delete(fn); };
  }
}
export const chatStore = new ChatStore();

// ─── identity helper ───────────────────────────────────────────────────────

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
