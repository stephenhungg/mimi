// sprite url resolution + fallback logic for agent billboards.
// only some species/state combos exist on disk; fall back to idle for missing.

import type { AgentState, Species } from "@mimi/types";

// which (species, state) combos actually have a sprite file in public/sprites/.
// keep in sync with apps/web/public/sprites/ contents.
const AVAILABLE: Record<Species, ReadonlySet<AgentState>> = {
  tiger: new Set<AgentState>(["idle", "down", "working"]),
  otter: new Set<AgentState>(["idle", "down"]),
  bunny: new Set<AgentState>(["idle", "down"]),
  dog: new Set<AgentState>(["idle", "down"]),
  giraffe: new Set<AgentState>(["idle", "down"]),
};

// states that are not modeled as their own sprite — fall back to idle.
// 'walking' and 'talking' read as idle visually; only 'working' and 'down' diverge.
export function effectiveState(species: Species, state: AgentState): AgentState {
  if (AVAILABLE[species].has(state)) return state;
  return "idle";
}

export function spriteUrl(species: Species, state: AgentState): string {
  const eff = effectiveState(species, state);
  return `/sprites/${species}-${eff}.png`;
}

// preload list — every sprite we might swap to during a session.
export const PRELOAD_URLS: string[] = (
  Object.entries(AVAILABLE) as Array<[Species, ReadonlySet<AgentState>]>
).flatMap(([species, states]) =>
  Array.from(states).map((s) => `/sprites/${species}-${s}.png`),
);
