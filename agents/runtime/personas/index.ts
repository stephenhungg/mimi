// persona registry — one entry per species. import these by name.

import type { EventSource, Species } from "@mimi/types";

import { tiger } from "./tiger.js";
import { otter } from "./otter.js";
import { bunny } from "./bunny.js";
import { dog } from "./dog.js";
import { giraffe } from "./giraffe.js";

export interface PersonaConfig {
  species: Species;
  identity: string;
  name: string;
  watches: EventSource;
  systemPromptFile: string;
}

export const PERSONAS: Record<Species, PersonaConfig> = {
  tiger,
  otter,
  bunny,
  dog,
  giraffe,
};

export function isSpecies(s: string): s is Species {
  return s in PERSONAS;
}

export { tiger, otter, bunny, dog, giraffe };
