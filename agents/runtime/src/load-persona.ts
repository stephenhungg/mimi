// persona loader — given a species name, return its config + system prompt body.

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Species } from "@mimi/types";

import { PERSONAS, type PersonaConfig } from "../personas/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const personasDir = resolve(here, "..", "personas");

export interface LoadedPersona {
  config: PersonaConfig;
  systemPrompt: string;
}

export async function loadPersona(species: Species): Promise<LoadedPersona> {
  const config = PERSONAS[species];
  const promptPath = resolve(personasDir, config.systemPromptFile);
  const systemPrompt = await readFile(promptPath, "utf8");
  return { config, systemPrompt };
}
