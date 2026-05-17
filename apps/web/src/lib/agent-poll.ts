// /api/agent-state poll loop. fetches per-species state every few seconds,
// pushes into agentStateStore + chatStore. replaces the old realtime channel.

import { useEffect, useState } from "react";
import { agentStateStore, chatStore, type AgentLiveState } from "./room-context";
import { SPECIES_DESK, type Species } from "@mimi/types";

interface PollOpts { enabled?: boolean; intervalMs?: number }

interface PollSnapshot {
  agents: Array<{
    species: Species;
    identity: string;
    state: AgentLiveState["state"];
    mood?: AgentLiveState["mood"];
    pos?: { x: number; z: number };
    speaking?: string;
    lastSpeakTs?: number;
  }>;
}

const POLL_URL =
  (import.meta as { env?: { VITE_AGENT_STATE_URL?: string } }).env?.VITE_AGENT_STATE_URL ??
  "http://localhost:3000/api/agent-state";

export function useAgentPollLoop(opts: PollOpts = {}): {
  connected: boolean;
  lastEventCount: number;
} {
  const enabled = opts.enabled ?? true;
  const intervalMs = opts.intervalMs ?? 2500;
  const [connected, setConnected] = useState(false);
  const [lastEventCount, setLastEventCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const seenSpeak = new Map<string, number>(); // identity → last ts emitted
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const res = await fetch(POLL_URL, { credentials: "include" });
        if (!cancelled) {
          if (!res.ok) {
            setConnected(false);
          } else {
            const body = (await res.json()) as PollSnapshot;
            setConnected(true);
            setLastEventCount(body.agents.length);
            const entries: AgentLiveState[] = body.agents.map((a) => ({
              species: a.species,
              identity: a.identity,
              state: a.state,
              mood: a.mood,
              pos: a.pos ?? homeOf(a.species),
              speaking: a.speaking,
              lastSpeakTs: a.lastSpeakTs,
            }));
            agentStateStore.replace(entries);
            // push fresh speaks to chat store (dedup by identity@ts).
            for (const a of entries) {
              if (!a.speaking || !a.lastSpeakTs) continue;
              const prev = seenSpeak.get(a.identity) ?? 0;
              if (a.lastSpeakTs <= prev) continue;
              seenSpeak.set(a.identity, a.lastSpeakTs);
              chatStore.push({
                kind: "agent_speak",
                identity: a.identity,
                name: a.species,
                species: a.species,
                text: a.speaking,
                ts: a.lastSpeakTs,
              });
            }
          }
        }
      } catch {
        if (!cancelled) setConnected(false);
      } finally {
        if (!cancelled) timer = setTimeout(tick, intervalMs);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, intervalMs]);

  return { connected, lastEventCount };
}

function homeOf(s: Species): { x: number; z: number } {
  const d = SPECIES_DESK[s];
  return { x: d[0], z: d[1] };
}
