// dog — mimi herself, the oversight. leader, warm, dispatch-mode.
// watches "manual" because dog reads the events stream and dispatches the others.

import type { PersonaConfig } from "./index.js";

export const dog: PersonaConfig = {
  species: "dog",
  identity: "mimi",
  name: "mimi",
  watches: "manual",
  systemPromptFile: "dog.md",
};

export default dog;
