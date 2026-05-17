// entry — `bun dev -- --persona tiger` starts one runtime process.
//
// loads persona config + system prompt, constructs broadcaster + notion +
// anthropic client, hands them to AgentRuntime, starts the http listener.

import Anthropic from "@anthropic-ai/sdk";

import { ENV } from "@mimi/types";
import { MimiNotion } from "@mimi/notion-client";

import { isSpecies } from "../personas/index.js";
import { broadcasterFromEnv } from "./broadcaster.js";
import { loadPersona } from "./load-persona.js";
import { AgentRuntime } from "./runtime.js";
import { startListener } from "./event-listener.js";

const DEFAULT_MODEL = "claude-sonnet-4-6";

async function main(): Promise<void> {
  const personaArg = parsePersonaArg(process.argv);
  if (!personaArg) {
    console.error("usage: bun dev -- --persona <tiger|otter|bunny|dog|giraffe>");
    process.exit(1);
  }
  if (!isSpecies(personaArg)) {
    console.error(`unknown persona: ${personaArg}`);
    process.exit(1);
  }

  const { config, systemPrompt } = await loadPersona(personaArg);

  const anthropicKey = required(ENV.ANTHROPIC_API_KEY);
  const model = process.env[ENV.ANTHROPIC_MODEL] ?? DEFAULT_MODEL;

  const anthropic = new Anthropic({ apiKey: anthropicKey });
  const notion = MimiNotion.fromEnv();
  const broadcaster = broadcasterFromEnv(process.env, {
    identity: config.identity,
    species: config.species,
    name: config.name,
  });

  const runtime = new AgentRuntime({
    species: config.species,
    identity: config.identity,
    persona: config,
    systemPrompt,
    notion,
    broadcaster,
    anthropic,
    model,
  });

  await runtime.start();
  const listener = startListener({ runtime });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[${runtime.identity}] ${signal} — shutting down`);
    try {
      await listener.stop();
    } catch (err) {
      console.warn("listener stop failed:", err);
    }
    try {
      await broadcaster.disconnect();
    } catch (err) {
      console.warn("broadcaster disconnect failed:", err);
    }
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

function parsePersonaArg(argv: string[]): string | null {
  // supports both `--persona tiger` and `--persona=tiger`.
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--persona") return argv[i + 1] ?? null;
    if (a !== undefined && a.startsWith("--persona=")) return a.slice("--persona=".length);
  }
  return null;
}

function required(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`missing required env var: ${key}`);
    process.exit(1);
  }
  return v;
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
