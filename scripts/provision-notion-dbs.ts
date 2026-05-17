// provision the 5 mimi. notion dbs under NOTION_PARENT_PAGE_ID.
// idempotent: looks for existing dbs with the same name first.
// writes results back to .env.local so other packages can find the ids.

import { Client } from "@notionhq/client";
import { NOTION_PROPS, ENV } from "@mimi/types";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname ?? new URL(".", import.meta.url).pathname, "..");
const ENV_LOCAL_PATH = join(ROOT, ".env.local");

// load .env.local if it exists, else fall back to process.env.
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...(process.env as Record<string, string>) };
  if (existsSync(ENV_LOCAL_PATH)) {
    const raw = readFileSync(ENV_LOCAL_PATH, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m) env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

function patchEnvLocal(updates: Record<string, string>) {
  let raw = existsSync(ENV_LOCAL_PATH) ? readFileSync(ENV_LOCAL_PATH, "utf8") : "";
  for (const [k, v] of Object.entries(updates)) {
    const re = new RegExp(`^${k}=.*$`, "m");
    if (re.test(raw)) {
      raw = raw.replace(re, `${k}=${v}`);
    } else {
      raw += `\n${k}=${v}`;
    }
  }
  writeFileSync(ENV_LOCAL_PATH, raw.trim() + "\n");
}

async function main() {
  const env = loadEnv();
  const token = env[ENV.NOTION_TOKEN];
  const parent = env[ENV.NOTION_PARENT_PAGE_ID];
  if (!token) throw new Error("set NOTION_TOKEN in .env.local");
  if (!parent) throw new Error("set NOTION_PARENT_PAGE_ID in .env.local (the page that contains mimi. dbs)");

  const notion = new Client({ auth: token });

  const dbs = [
    {
      envKey: ENV.NOTION_DB_RESIDENTS,
      name: "mimi. residents",
      icon: "🐾",
      properties: residentsSchema(),
    },
    {
      envKey: ENV.NOTION_DB_EVENTS,
      name: "mimi. events",
      icon: "📡",
      properties: eventsSchema(),
    },
    {
      envKey: ENV.NOTION_DB_ARTIFACTS,
      name: "mimi. artifacts",
      icon: "📦",
      properties: artifactsSchema(),
    },
    {
      envKey: ENV.NOTION_DB_CONVERSATIONS,
      name: "mimi. conversations",
      icon: "💬",
      properties: conversationsSchema(),
    },
    {
      envKey: ENV.NOTION_DB_AGENT_MEMORY,
      name: "mimi. agent_memory",
      icon: "🧠",
      properties: agentMemorySchema(),
    },
  ];

  const updates: Record<string, string> = {};
  for (const db of dbs) {
    const existing = await findChildDatabase(notion, parent, db.name);
    let id: string;
    if (existing) {
      console.log(`✓ found existing: ${db.name} (${existing})`);
      id = existing;
    } else {
      const res = await notion.databases.create({
        parent: { type: "page_id", page_id: parent },
        title: [{ type: "text", text: { content: db.name } }],
        icon: { type: "emoji", emoji: db.icon as any },
        properties: db.properties,
      });
      console.log(`+ created: ${db.name} (${res.id})`);
      id = res.id;
    }
    updates[db.envKey] = id;
  }

  patchEnvLocal(updates);
  console.log(`\nwrote ${Object.keys(updates).length} db ids → ${ENV_LOCAL_PATH}`);
}

async function findChildDatabase(notion: Client, parentPageId: string, name: string): Promise<string | null> {
  // search the workspace for a db with this title that is a child of parent.
  // notion search doesn't filter by parent, so we list children of the page.
  const children = await notion.blocks.children.list({ block_id: parentPageId, page_size: 100 });
  for (const block of children.results as any[]) {
    if (block.type === "child_database") {
      const db = await notion.databases.retrieve({ database_id: block.id }).catch(() => null);
      if (!db) continue;
      const title = ((db as any).title ?? []).map((t: any) => t.plain_text ?? "").join("");
      if (title === name) return block.id;
    }
  }
  return null;
}

// ─── schemas (notion property definitions) ──────────────────────────────────

function residentsSchema() {
  const p = NOTION_PROPS.residents;
  return {
    [p.name]: { title: {} },
    [p.identity]: { rich_text: {} },
    [p.kind]: {
      select: {
        options: [
          { name: "human", color: "blue" },
          { name: "agent", color: "orange" },
        ],
      },
    },
    [p.species]: {
      select: {
        options: [
          { name: "tiger", color: "orange" },
          { name: "otter", color: "blue" },
          { name: "bunny", color: "pink" },
          { name: "dog", color: "yellow" },
          { name: "giraffe", color: "green" },
        ],
      },
    },
    [p.owner]: { rich_text: {} },
    [p.watches]: {
      select: {
        options: [
          { name: "github", color: "purple" },
          { name: "gmail", color: "red" },
          { name: "calendar", color: "yellow" },
          { name: "notion", color: "gray" },
          { name: "manual", color: "default" },
        ],
      },
    },
    [p.joinedAt]: { date: {} },
    [p.motto]: { rich_text: {} },
  };
}

function eventsSchema() {
  const p = NOTION_PROPS.events;
  return {
    [p.summary]: { title: {} },
    [p.source]: {
      select: {
        options: [
          { name: "github", color: "purple" },
          { name: "gmail", color: "red" },
          { name: "calendar", color: "yellow" },
          { name: "notion", color: "gray" },
          { name: "manual", color: "default" },
        ],
      },
    },
    [p.type]: { select: { options: [
      { name: "github.push", color: "purple" },
      { name: "github.pull_request", color: "purple" },
      { name: "github.issues", color: "purple" },
      { name: "gmail.thread", color: "red" },
      { name: "calendar.invite", color: "yellow" },
      { name: "calendar.starting_soon", color: "yellow" },
      { name: "notion.meeting_notes", color: "gray" },
      { name: "manual.poke", color: "default" },
    ] } },
    [p.ts]: { date: {} },
    [p.agent]: {
      select: {
        options: [
          { name: "tiger", color: "orange" },
          { name: "otter", color: "blue" },
          { name: "bunny", color: "pink" },
          { name: "dog", color: "yellow" },
          { name: "giraffe", color: "green" },
        ],
      },
    },
    [p.rawPayload]: { rich_text: {} },
  };
}

function artifactsSchema() {
  const p = NOTION_PROPS.artifacts;
  return {
    [p.title]: { title: {} },
    [p.kind]: {
      select: {
        options: [
          { name: "pr_draft", color: "purple" },
          { name: "calendar_entry", color: "yellow" },
          { name: "email_reply", color: "red" },
          { name: "decision", color: "blue" },
          { name: "note", color: "gray" },
        ],
      },
    },
    [p.body]: { rich_text: {} },
    [p.createdBy]: {
      select: {
        options: [
          { name: "tiger", color: "orange" },
          { name: "otter", color: "blue" },
          { name: "bunny", color: "pink" },
          { name: "dog", color: "yellow" },
          { name: "giraffe", color: "green" },
        ],
      },
    },
    [p.ts]: { date: {} },
    [p.url]: { url: {} },
  };
}

function conversationsSchema() {
  const p = NOTION_PROPS.conversations;
  return {
    [p.topic]: { title: {} },
    [p.ts]: { date: {} },
    [p.participants]: { rich_text: {} },
    [p.transcript]: { rich_text: {} },
  };
}

function agentMemorySchema() {
  const p = NOTION_PROPS.agentMemory;
  return {
    [p.identity]: { title: {} },
    [p.species]: {
      select: {
        options: [
          { name: "tiger", color: "orange" },
          { name: "otter", color: "blue" },
          { name: "bunny", color: "pink" },
          { name: "dog", color: "yellow" },
          { name: "giraffe", color: "green" },
        ],
      },
    },
  };
}

main().catch((e) => {
  console.error("provision failed:", e);
  process.exit(1);
});
