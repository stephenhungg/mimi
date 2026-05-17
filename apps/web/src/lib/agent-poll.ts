// agent state poll loop. fetches recent events from /api/agent-state every
// few seconds, derives per-species (state, mood, position, last speak), pushes
// into agentStateStore. components subscribed to that store re-render.
//
// the api endpoint lives in apps/landing (next.js) — for the demo we hit a
// local-dev origin via VITE_AGENT_STATE_URL or fall back to localhost:3000.

import { useEffect, useState } from "react";
import { agentStateStore, type AgentLiveState } from "./room-context";
import { SPECIES_DESK, type Species } from "@mimi/types";

interface PollOptions {
  enabled?: boolean;
  intervalMs?: number;
}

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

export function useAgentPollLoop(opts: PollOptions = {}): {
  connected: boolean;
  lastEventCount: number;
} {
  const enabled = opts.enabled ?? true;
  const intervalMs = opts.intervalMs ?? 2500;
  const [connected, setConnected] = useState(false);
  const [lastEventCount, setLastEventCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
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
            // ensure every species has a home position fallback.
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
