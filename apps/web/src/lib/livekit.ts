// livekit room hook + connection helpers for apps/web (humans).
// fetches a token from VITE_TOKEN_ENDPOINT, joins the configured room,
// and exposes a peers map keyed by identity (humans + agents alike) plus a
// broadcast() that sends Broadcast envelopes over the room's reliable data channel.
//
// the wire format is exactly the @mimi/types Broadcast discriminated union —
// agents/runtime/src/broadcaster.ts JSON.stringify()s the same shape, so receivers
// can JSON.parse straight into a Broadcast.

import {
  DataPacket_Kind,
  Room,
  RoomEvent,
  type RemoteParticipant,
} from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AgentState,
  Broadcast,
  Mood,
  Position,
  Species,
} from "@mimi/types";

// ─── per-peer state cached locally from broadcasts ──────────────────────────

export interface PeerState {
  identity: string;
  kind: "human" | "agent";
  name: string;
  species?: Species;
  pos: Position;
  state?: AgentState;
  mood?: Mood;
  // last time we received any broadcast for this peer (ms epoch) — useful for
  // GC of stale peers if we ever want it. not currently pruned.
  lastSeen: number;
}

// ─── chat ring buffer (last N messages) ─────────────────────────────────────

export interface ChatMessage {
  // mirror the wire format closely. agent_speak entries set kind=agent_speak
  // and carry species so the UI can render italicized "<species> ~chirped~ …".
  kind: "chat" | "agent_speak";
  identity: string;
  name: string;
  text: string;
  species?: Species;
  ts: number;
}

const CHAT_BUFFER = 20;

// ─── env + endpoint resolution ──────────────────────────────────────────────

const TOKEN_ENDPOINT =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vite env typing varies; this is intentional
  (import.meta as any).env?.VITE_TOKEN_ENDPOINT ?? "http://localhost:3000/api/livekit-token";

const ROOM_NAME =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vite env typing varies
  (import.meta as any).env?.VITE_LIVEKIT_ROOM ?? "mimi-house-main";

interface TokenResponse {
  token: string;
  url: string;
  room: string;
  identity: string;
}

async function fetchToken(identity: string, name: string): Promise<TokenResponse> {
  const url = new URL(TOKEN_ENDPOINT);
  url.searchParams.set("identity", identity);
  url.searchParams.set("name", name);
  url.searchParams.set("room", ROOM_NAME);
  url.searchParams.set("kind", "human");
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`livekit token endpoint ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as TokenResponse;
  if (!body.token || !body.url) {
    throw new Error("livekit token endpoint returned empty token/url");
  }
  return body;
}

// ─── hook ───────────────────────────────────────────────────────────────────

export interface UseMimiRoomResult {
  room: Room | null;
  connected: boolean;
  peers: Map<string, PeerState>;
  chat: ChatMessage[];
  /** publish a Broadcast on the reliable data channel. no-op if not connected. */
  broadcast: (msg: Broadcast) => void;
  /** push local pos — throttled internally (per-second heartbeat + delta gate). */
  publishLocalPos: (pos: Position) => void;
  disconnect: () => void;
}

const PRESENCE_HEARTBEAT_MS = 1000;
const PRESENCE_POS_DELTA = 0.05;

export function useMimiRoom(identity: string, name: string): UseMimiRoomResult {
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  // peers + chat are stored in refs and shadowed into state with a version
  // bump so React re-renders without us cloning the Map on every update.
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const chatRef = useRef<ChatMessage[]>([]);
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // local pos tracking for heartbeat publish.
  const lastPosRef = useRef<Position>({ x: 0, z: 0 });
  const lastBroadcastPosRef = useRef<Position>({ x: Number.NaN, z: Number.NaN });
  const roomRef = useRef<Room | null>(null);

  const handleBroadcast = useCallback(
    (msg: Broadcast) => {
      const peers = peersRef.current;
      const now = Date.now();
      switch (msg.type) {
        case "presence": {
          const prev = peers.get(msg.identity);
          peers.set(msg.identity, {
            identity: msg.identity,
            kind: msg.kind,
            name: msg.name,
            species: msg.species ?? prev?.species,
            pos: msg.pos,
            state: prev?.state,
            mood: prev?.mood,
            lastSeen: now,
          });
          bump();
          return;
        }
        case "agent_state": {
          const prev = peers.get(msg.identity);
          peers.set(msg.identity, {
            identity: msg.identity,
            kind: "agent",
            name: prev?.name ?? msg.species,
            species: msg.species,
            pos: msg.pos ?? prev?.pos ?? { x: 0, z: 0 },
            state: msg.state,
            mood: msg.mood ?? prev?.mood,
            lastSeen: now,
          });
          bump();
          return;
        }
        case "agent_speak": {
          // surface as chat + leave the agent's billboard speaking flag to the
          // RemotePeers renderer (which reads `chat` for the latest line).
          const entry: ChatMessage = {
            kind: "agent_speak",
            identity: msg.identity,
            name: msg.species,
            text: msg.text,
            species: msg.species,
            ts: now,
          };
          chatRef.current = [...chatRef.current, entry].slice(-CHAT_BUFFER);
          bump();
          return;
        }
        case "chat": {
          const entry: ChatMessage = {
            kind: "chat",
            identity: msg.identity,
            name: msg.name,
            text: msg.text,
            ts: now,
          };
          chatRef.current = [...chatRef.current, entry].slice(-CHAT_BUFFER);
          bump();
          return;
        }
        case "npc_request":
        case "event_echo": {
          // not rendered in the v1 ui — accepted but ignored on the wire.
          return;
        }
      }
    },
    [bump],
  );

  // connect on mount.
  useEffect(() => {
    let cancelled = false;
    let activeRoom: Room | null = null;

    (async () => {
      try {
        const { token, url } = await fetchToken(identity, name);
        if (cancelled) return;
        const r = new Room();
        activeRoom = r;
        roomRef.current = r;

        r.on(RoomEvent.DataReceived, (payload: Uint8Array, _participant?: RemoteParticipant) => {
          try {
            const text = new TextDecoder().decode(payload);
            const msg = JSON.parse(text) as Broadcast;
            if (msg && typeof msg === "object" && "type" in msg) {
              handleBroadcast(msg);
            }
          } catch (err) {
            console.warn("livekit: failed to decode data packet", err);
          }
        });
        r.on(RoomEvent.Disconnected, () => {
          if (cancelled) return;
          setConnected(false);
        });
        r.on(RoomEvent.ParticipantDisconnected, (p) => {
          if (peersRef.current.delete(p.identity)) bump();
        });

        await r.connect(url, token);
        if (cancelled) {
          await r.disconnect();
          return;
        }
        setRoom(r);
        setConnected(true);
      } catch (err) {
        console.error("livekit: connect failed", err);
      }
    })();

    return () => {
      cancelled = true;
      roomRef.current = null;
      if (activeRoom) {
        activeRoom.disconnect().catch(() => undefined);
      }
      setRoom(null);
      setConnected(false);
    };
  }, [identity, name, handleBroadcast, bump]);

  // shared broadcast function — JSON-encodes the Broadcast and ships it.
  const broadcast = useCallback((msg: Broadcast) => {
    const r = roomRef.current;
    if (!r || r.state !== "connected") return;
    const bytes = new TextEncoder().encode(JSON.stringify(msg));
    void r.localParticipant
      .publishData(bytes, { reliable: true })
      .catch((err: unknown) => console.warn("livekit: publishData failed", err));
  }, []);

  // publishLocalPos stores the latest local pos and the heartbeat loop below
  // decides when to actually emit a presence broadcast.
  const publishLocalPos = useCallback((pos: Position) => {
    lastPosRef.current = pos;
  }, []);

  // presence heartbeat — sends `presence` once per second, or immediately on
  // a position delta > PRESENCE_POS_DELTA. runs on a fixed interval while
  // connected; cleans up on disconnect / unmount.
  useEffect(() => {
    if (!connected) return;
    let stopped = false;

    // emit immediately so peers see us right away.
    const initial: Position = { ...lastPosRef.current };
    broadcast({
      type: "presence",
      identity,
      kind: "human",
      name,
      pos: initial,
    });
    lastBroadcastPosRef.current = initial;

    const id = window.setInterval(() => {
      if (stopped) return;
      const cur = lastPosRef.current;
      const last = lastBroadcastPosRef.current;
      const dx = cur.x - last.x;
      const dz = cur.z - last.z;
      const moved = Math.hypot(dx, dz) > PRESENCE_POS_DELTA;
      // always heartbeat once per second so newcomers see us; moved is
      // already handled by the delta-emit path below, but the periodic tick
      // doubles as the keepalive.
      broadcast({
        type: "presence",
        identity,
        kind: "human",
        name,
        pos: cur,
      });
      if (moved) {
        lastBroadcastPosRef.current = { ...cur };
      }
    }, PRESENCE_HEARTBEAT_MS);

    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [connected, identity, name, broadcast]);

  // also do a fast delta-emit loop — checks 10x/sec and broadcasts on big moves.
  useEffect(() => {
    if (!connected) return;
    let stopped = false;
    const id = window.setInterval(() => {
      if (stopped) return;
      const cur = lastPosRef.current;
      const last = lastBroadcastPosRef.current;
      const dx = cur.x - last.x;
      const dz = cur.z - last.z;
      if (Math.hypot(dx, dz) > PRESENCE_POS_DELTA) {
        broadcast({
          type: "presence",
          identity,
          kind: "human",
          name,
          pos: cur,
        });
        lastBroadcastPosRef.current = { ...cur };
      }
    }, 100);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [connected, identity, name, broadcast]);

  const disconnect = useCallback(() => {
    const r = roomRef.current;
    if (r) void r.disconnect();
  }, []);

  // memoize result so consumers don't re-render on every internal ref bump
  // unless something actually changed. we deliberately include the version
  // bump via peersRef/chatRef identity stability — the Map reference itself is
  // stable, but consumers iterate it each render anyway.
  return useMemo<UseMimiRoomResult>(
    () => ({
      room,
      connected,
      peers: peersRef.current,
      chat: chatRef.current,
      broadcast,
      publishLocalPos,
      disconnect,
    }),
    // include connected so consumers re-render when connection state flips.
    // peersRef / chatRef bumps trigger our own re-render via setVersion, which
    // re-runs this useMemo and yields a fresh object — that's intentional.
    [room, connected, broadcast, publishLocalPos, disconnect],
  );
}

// ─── identity helpers (used by App.tsx) ─────────────────────────────────────

const ID_KEY = "mimi_identity";
const NAME_KEY = "mimi_name";

export function loadOrCreateIdentity(): { identity: string; name: string } {
  if (typeof window === "undefined") {
    return { identity: "guest", name: "guest" };
  }
  let id = window.localStorage.getItem(ID_KEY);
  if (!id) {
    id = `guest-${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(ID_KEY, id);
  }
  let nm = window.localStorage.getItem(NAME_KEY);
  if (!nm) {
    nm = id;
    window.localStorage.setItem(NAME_KEY, nm);
  }
  return { identity: id, name: nm };
}

// re-export for components that want to publish raw DataPacket_Kind etc.
export { DataPacket_Kind };
