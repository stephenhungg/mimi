// shared context for the single useMimiRoom() instance. created once at the
// App root and consumed by RemotePeers (inside Canvas), ChatOverlay (DOM),
// NPCDialogue (DOM), and the proximity hint logic in Room.

import { createContext, useContext, type ReactNode } from "react";
import type { UseMimiRoomResult } from "./livekit";

const MimiRoomContext = createContext<UseMimiRoomResult | null>(null);

export function MimiRoomProvider({
  value,
  children,
}: {
  value: UseMimiRoomResult;
  children: ReactNode;
}) {
  return <MimiRoomContext.Provider value={value}>{children}</MimiRoomContext.Provider>;
}

export function useMimiRoomContext(): UseMimiRoomResult {
  const ctx = useContext(MimiRoomContext);
  if (!ctx) {
    throw new Error("useMimiRoomContext must be used inside <MimiRoomProvider>");
  }
  return ctx;
}

// hook for the player's current camera position. r3f Canvas creates an
// isolated React root, so we can't share a normal ref across Canvas/DOM —
// instead we expose a tiny pub/sub the player can write to and DOM can read.

export interface PlayerPos {
  x: number;
  z: number;
  // facing yaw, radians. used by presence broadcast.
  rot: number;
}

class PlayerPosStore {
  private pos: PlayerPos = { x: 0, z: 0, rot: 0 };
  private listeners = new Set<(p: PlayerPos) => void>();

  set(p: PlayerPos): void {
    this.pos = p;
    this.listeners.forEach((l) => l(p));
  }

  get(): PlayerPos {
    return this.pos;
  }

  subscribe(fn: (p: PlayerPos) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

export const playerPosStore = new PlayerPosStore();

// active trainer card store — same pub/sub pattern so the in-Canvas billboard
// click handler can open the DOM-rendered TrainerCard.

import type { TrainerCardData } from "../components/TrainerCard";

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
  get(): TrainerCardData | null {
    return this.active;
  }
  subscribe(fn: (c: TrainerCardData | null) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

export const trainerCardStore = new TrainerCardStore();

