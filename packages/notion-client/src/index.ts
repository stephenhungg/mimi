// mimi. notion client — typed wrapper. one place to touch the notion api.
// every read/write goes through here so the 5 dbs stay coherent.

import { Client } from "@notionhq/client";
import {
  ENV,
  NOTION_PROPS,
  type ArtifactRow,
  type ConversationRow,
  type EventRow,
  type ResidentRow,
  type AgentMemoryEntry,
  type Species,
} from "@mimi/types";

export interface NotionDbIds {
  residents: string;
  events: string;
  artifacts: string;
  conversations: string;
  agentMemory: string;
}

export interface MimiNotionConfig {
  token: string;
  dbs: NotionDbIds;
}

export function configFromEnv(env: Record<string, string | undefined> = process.env): MimiNotionConfig {
  const token = required(env, ENV.NOTION_TOKEN);
  return {
    token,
    dbs: {
      residents: required(env, ENV.NOTION_DB_RESIDENTS),
      events: required(env, ENV.NOTION_DB_EVENTS),
      artifacts: required(env, ENV.NOTION_DB_ARTIFACTS),
      conversations: required(env, ENV.NOTION_DB_CONVERSATIONS),
      agentMemory: required(env, ENV.NOTION_DB_AGENT_MEMORY),
    },
  };
}

function required(env: Record<string, string | undefined>, key: string): string {
  const v = env[key];
  if (!v) throw new Error(`mimi/notion-client: missing env ${key}`);
  return v;
}

export class MimiNotion {
  readonly client: Client;
  readonly dbs: NotionDbIds;

  constructor(config: MimiNotionConfig) {
    this.client = new Client({ auth: config.token });
    this.dbs = config.dbs;
  }

  static fromEnv(env: Record<string, string | undefined> = process.env): MimiNotion {
    return new MimiNotion(configFromEnv(env));
  }

  // ─── events: append-only log of everything that happens ─────────────────

  async appendEvent(row: EventRow): Promise<string> {
    const p = NOTION_PROPS.events;
    const res = await this.client.pages.create({
      parent: { database_id: this.dbs.events },
      properties: {
        [p.summary]: title(row.summary),
        [p.source]: select(row.source),
        [p.type]: select(row.type),
        [p.ts]: date(row.ts),
        ...(row.agent ? { [p.agent]: select(row.agent) } : {}),
        ...(row.rawPayload ? { [p.rawPayload]: richText(truncate(row.rawPayload, 1900)) } : {}),
      },
    });
    return res.id;
  }

  async queryRecentEvents(limit = 20): Promise<EventRow[]> {
    const p = NOTION_PROPS.events;
    const res = await this.client.databases.query({
      database_id: this.dbs.events,
      sorts: [{ property: p.ts, direction: "descending" }],
      page_size: limit,
    });
    return res.results.map((page) => readEventRow(page as any));
  }

  // ─── residents: humans + agents currently in the workspace ──────────────

  async upsertResident(row: ResidentRow): Promise<string> {
    const p = NOTION_PROPS.residents;
    // crude upsert: query by identity, update if found else create.
    const existing = await this.client.databases.query({
      database_id: this.dbs.residents,
      filter: { property: p.identity, rich_text: { equals: row.identity } },
      page_size: 1,
    });
    const properties: Record<string, any> = {
      [p.name]: title(row.name),
      [p.identity]: richText(row.identity),
      [p.kind]: select(row.kind),
      [p.joinedAt]: date(row.joinedAt),
      ...(row.species ? { [p.species]: select(row.species) } : {}),
      ...(row.owner ? { [p.owner]: richText(row.owner) } : {}),
      ...(row.watches ? { [p.watches]: select(row.watches) } : {}),
      ...(row.motto ? { [p.motto]: richText(row.motto) } : {}),
    };
    if (existing.results.length > 0) {
      const page = existing.results[0]!;
      await this.client.pages.update({ page_id: page.id, properties });
      return page.id;
    }
    const created = await this.client.pages.create({
      parent: { database_id: this.dbs.residents },
      properties,
    });
    return created.id;
  }

  async listResidents(): Promise<ResidentRow[]> {
    const res = await this.client.databases.query({
      database_id: this.dbs.residents,
      page_size: 100,
    });
    return res.results.map((p) => readResidentRow(p as any));
  }

  // ─── artifacts: durable things agents make (PR drafts, decisions) ───────

  async createArtifact(row: ArtifactRow): Promise<string> {
    const p = NOTION_PROPS.artifacts;
    const res = await this.client.pages.create({
      parent: { database_id: this.dbs.artifacts },
      properties: {
        [p.title]: title(row.title),
        [p.kind]: select(row.kind),
        [p.createdBy]: select(row.createdBy),
        [p.ts]: date(row.ts),
        [p.body]: richText(truncate(row.body, 1900)),
        ...(row.url ? { [p.url]: { url: row.url } } : {}),
      },
    });
    return res.id;
  }

  // ─── conversations: dialog transcripts ─────────────────────────────────

  async appendConversation(row: ConversationRow): Promise<string> {
    const p = NOTION_PROPS.conversations;
    const transcriptText = row.transcript
      .map((t) => `[${t.ts}] ${t.from}: ${t.text}`)
      .join("\n");
    const res = await this.client.pages.create({
      parent: { database_id: this.dbs.conversations },
      properties: {
        [p.topic]: title(row.topic ?? "untitled"),
        [p.ts]: date(row.ts),
        [p.participants]: richText(row.participants.join(", ")),
        [p.transcript]: richText(truncate(transcriptText, 1900)),
      },
    });
    return res.id;
  }

  // ─── agent_memory: per-agent journal page (one page per species) ────────

  async appendAgentMemory(species: Species, identity: string, entry: AgentMemoryEntry): Promise<string> {
    const p = NOTION_PROPS.agentMemory;
    // find or create the page for this agent identity.
    const existing = await this.client.databases.query({
      database_id: this.dbs.agentMemory,
      filter: { property: p.identity, rich_text: { equals: identity } },
      page_size: 1,
    });
    let pageId: string;
    if (existing.results.length > 0) {
      pageId = existing.results[0]!.id;
    } else {
      const created = await this.client.pages.create({
        parent: { database_id: this.dbs.agentMemory },
        properties: {
          [p.identity]: title(identity),
          [p.species]: select(species),
        },
      });
      pageId = created.id;
    }
    // append a callout block as the new entry.
    await this.client.blocks.children.append({
      block_id: pageId,
      children: [
        {
          object: "block",
          type: "callout",
          callout: {
            icon: { type: "emoji", emoji: kindEmoji(entry.kind) as any },
            rich_text: [
              { type: "text", text: { content: `[${entry.ts}] ${entry.kind}: ` }, annotations: { bold: true } },
              { type: "text", text: { content: truncate(entry.text, 1900) } },
            ],
          },
        },
      ],
    });
    return pageId;
  }
}

// ─── notion property helpers ────────────────────────────────────────────────

function title(text: string) {
  return { title: [{ type: "text" as const, text: { content: truncate(text, 1900) } }] };
}
function richText(text: string) {
  return { rich_text: [{ type: "text" as const, text: { content: text } }] };
}
function select(name: string) {
  return { select: { name } };
}
function date(iso: string) {
  return { date: { start: iso } };
}
function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
function kindEmoji(kind: AgentMemoryEntry["kind"]): string {
  switch (kind) {
    case "journal": return "📓";
    case "decision": return "🎯";
    case "observation": return "👀";
    case "pulse": return "💓";
  }
}

function plainText(rt: any[] | undefined): string {
  if (!rt || rt.length === 0) return "";
  return rt.map((r) => r.plain_text ?? "").join("");
}

function readEventRow(page: any): EventRow {
  const props = page.properties;
  const p = NOTION_PROPS.events;
  return {
    id: page.id,
    source: (props[p.source]?.select?.name ?? "manual") as EventRow["source"],
    type: (props[p.type]?.select?.name ?? "manual.poke") as EventRow["type"],
    ts: props[p.ts]?.date?.start ?? new Date().toISOString(),
    summary: plainText(props[p.summary]?.title),
    agent: props[p.agent]?.select?.name as Species | undefined,
    rawPayload: plainText(props[p.rawPayload]?.rich_text),
  };
}

function readResidentRow(page: any): ResidentRow {
  const props = page.properties;
  const p = NOTION_PROPS.residents;
  return {
    id: page.id,
    identity: plainText(props[p.identity]?.rich_text),
    kind: (props[p.kind]?.select?.name ?? "human") as ResidentRow["kind"],
    name: plainText(props[p.name]?.title),
    species: props[p.species]?.select?.name as Species | undefined,
    owner: plainText(props[p.owner]?.rich_text) || undefined,
    watches: props[p.watches]?.select?.name as ResidentRow["watches"],
    joinedAt: props[p.joinedAt]?.date?.start ?? new Date().toISOString(),
    motto: plainText(props[p.motto]?.rich_text) || undefined,
  };
}

export type { ResidentRow, EventRow, ArtifactRow, ConversationRow, AgentMemoryEntry };
