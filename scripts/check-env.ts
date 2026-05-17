// preflight checker — run before demo to verify env + auth + reachability.
// usage: bun scripts/check-env.ts
// exit 0 = green to record. exit 1 = something needs fixing.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client as NotionClient } from "@notionhq/client";
import { ENV } from "../packages/types/src/index.js";

const ROOT = join(import.meta.dirname ?? new URL(".", import.meta.url).pathname, "..");
const ENV_LOCAL = join(ROOT, ".env.local");

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = { ...(process.env as Record<string, string>) };
  if (existsSync(ENV_LOCAL)) {
    const raw = readFileSync(ENV_LOCAL, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && m[2] && !m[2].startsWith("#")) out[m[1]!] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  }
  return out;
}

interface Check {
  name: string;
  required: boolean;
  run: (env: Record<string, string>) => Promise<{ ok: boolean; note?: string }>;
}

const CHECKS: Check[] = [
  {
    name: ".env.local exists",
    required: true,
    run: async () => ({
      ok: existsSync(ENV_LOCAL),
      note: existsSync(ENV_LOCAL) ? undefined : `create ${ENV_LOCAL} from .env.example`,
    }),
  },
  {
    name: "NOTION_TOKEN set",
    required: true,
    run: async (env) => ({ ok: !!env[ENV.NOTION_TOKEN], note: "notion integration token" }),
  },
  {
    name: "NOTION_PARENT_PAGE_ID set",
    required: true,
    run: async (env) => ({ ok: !!env[ENV.NOTION_PARENT_PAGE_ID], note: "page id where the 5 dbs live" }),
  },
  {
    name: "notion api reachable + token valid",
    required: true,
    run: async (env) => {
      const tok = env[ENV.NOTION_TOKEN];
      if (!tok) return { ok: false, note: "needs NOTION_TOKEN" };
      try {
        const c = new NotionClient({ auth: tok });
        const me = await c.users.me({});
        return { ok: true, note: `bot id ${(me as any).id?.slice(0, 8)}…` };
      } catch (e) {
        return { ok: false, note: `notion auth failed: ${(e as Error).message.slice(0, 100)}` };
      }
    },
  },
  {
    name: "5 notion dbs provisioned (env has ids)",
    required: true,
    run: async (env) => {
      const keys = [ENV.NOTION_DB_RESIDENTS, ENV.NOTION_DB_EVENTS, ENV.NOTION_DB_ARTIFACTS, ENV.NOTION_DB_CONVERSATIONS, ENV.NOTION_DB_AGENT_MEMORY];
      const missing = keys.filter((k) => !env[k]);
      return {
        ok: missing.length === 0,
        note: missing.length === 0 ? "all 5 db ids present" : `missing: ${missing.join(", ")} — run \`bun run provision:notion\``,
      };
    },
  },
  {
    name: "LIVEKIT_URL + creds set",
    required: true,
    run: async (env) => {
      const u = env[ENV.LIVEKIT_URL];
      const k = env[ENV.LIVEKIT_API_KEY];
      const s = env[ENV.LIVEKIT_API_SECRET];
      if (!u || !k || !s) return { ok: false, note: "LIVEKIT_URL/API_KEY/API_SECRET required" };
      if (!u.startsWith("wss://")) return { ok: false, note: `LIVEKIT_URL should be wss://, got ${u.slice(0, 24)}…` };
      return { ok: true, note: u.replace(/^wss:\/\//, "").slice(0, 32) };
    },
  },
  {
    name: "ANTHROPIC_API_KEY set",
    required: true,
    run: async (env) => {
      const k = env[ENV.ANTHROPIC_API_KEY];
      if (!k) return { ok: false, note: "needs ANTHROPIC_API_KEY" };
      if (!k.startsWith("sk-ant-")) return { ok: false, note: "should start with sk-ant-" };
      return { ok: true, note: `${k.slice(0, 12)}…` };
    },
  },
  {
    name: "anthropic api reachable + key valid",
    required: false,
    run: async (env) => {
      const k = env[ENV.ANTHROPIC_API_KEY];
      if (!k) return { ok: false, note: "skipped (no key)" };
      try {
        const res = await fetch("https://api.anthropic.com/v1/models", {
          headers: { "x-api-key": k, "anthropic-version": "2023-06-01" },
        });
        if (res.status === 401) return { ok: false, note: "401 — key invalid" };
        if (!res.ok) return { ok: false, note: `http ${res.status}` };
        return { ok: true, note: "key works" };
      } catch (e) {
        return { ok: false, note: `network: ${(e as Error).message.slice(0, 80)}` };
      }
    },
  },
  {
    name: "GITHUB_WEBHOOK_SECRET + GITHUB_REPO set",
    required: false,
    run: async (env) => {
      const s = env[ENV.GITHUB_WEBHOOK_SECRET];
      const r = env[ENV.GITHUB_REPO];
      if (!s) return { ok: false, note: "needed for the killshot beat — set GITHUB_WEBHOOK_SECRET" };
      if (!r) return { ok: false, note: "needed for the killshot beat — set GITHUB_REPO=owner/repo" };
      return { ok: true, note: r };
    },
  },
  {
    name: "MIMI_EVENTS_URL set (workers deployed)",
    required: false,
    run: async (env) => {
      const u = env.MIMI_EVENTS_URL;
      if (!u || u.includes("example.workers.dev")) return { ok: false, note: "deploy workers via `ntn workers deploy` then update env" };
      try {
        const res = await fetch(`${u}/health`).catch(() => null);
        return { ok: !!res && res.ok, note: res ? `health ${res.status}` : "unreachable" };
      } catch {
        return { ok: false, note: "unreachable" };
      }
    },
  },
];

async function main() {
  const env = loadEnv();
  console.log("\nmimi. — preflight check\n");

  let failedRequired = 0;
  let failedOptional = 0;

  for (const c of CHECKS) {
    process.stdout.write(`  ${c.name.padEnd(48, " ")} `);
    const { ok, note } = await c.run(env);
    if (ok) {
      console.log(`✓  ${note ?? ""}`);
    } else {
      const tag = c.required ? "✗ REQUIRED" : "·  optional";
      console.log(`${tag}  ${note ?? ""}`);
      if (c.required) failedRequired++;
      else failedOptional++;
    }
  }

  console.log();
  if (failedRequired > 0) {
    console.log(`✗  ${failedRequired} required check(s) failed. fix before demo.`);
    process.exit(1);
  }
  if (failedOptional > 0) {
    console.log(`·  ${failedOptional} optional check(s) failed. demo will work but some beats may not (github killshot, deployed workers).`);
  } else {
    console.log("✓  all green. ready to record.");
  }
}

main().catch((e) => {
  console.error("check failed:", e);
  process.exit(2);
});
