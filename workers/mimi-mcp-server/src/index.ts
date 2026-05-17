// mimi-mcp-server — exposes mimi. as a tool surface for any external AI.
//
// per the notion workers SDK, every `worker.tool(...)` registered here is
// auto-exposed to notion's custom-agent runtime, which means notion AI can
// invoke them directly. external claude code / cursor / codex connect via
// the same `ntn workers exec` shell, or by mounting this worker over MCP.
//
// each tool is a high-leverage mimi. primitive:
//   - list_residents      → who's in the house?
//   - recent_events       → what's happened?
//   - summon_agent        → poke an agent runtime to /dialogue
//   - read_agent_memory   → read a species' journal page
//   - append_event        → write an event row from anywhere

import { Worker } from "@notionhq/workers";
import { j } from "@notionhq/workers/schema-builder";
import type { JSONValue } from "@notionhq/workers/types";
import { Client as NotionClient } from "@notionhq/client";
import {
	ALL_SPECIES,
	ENV,
	NOTION_PROPS,
	agentUrlFor,
	type EventRow,
	type EventSource,
	type EventType,
	type ResidentRow,
	type Species,
} from "./mimi.js";

const worker = new Worker();
export default worker;

function notionToken(): string {
	const tok = process.env[ENV.NOTION_TOKEN] ?? process.env[ENV.NOTION_API_TOKEN];
	if (!tok) throw new Error("mimi-mcp-server: missing NOTION_TOKEN / NOTION_API_TOKEN");
	return tok;
}

function isSpecies(s: unknown): s is Species {
	return typeof s === "string" && (ALL_SPECIES as readonly string[]).includes(s);
}

function plainText(prop: unknown): string {
	const rt = (prop as { rich_text?: Array<{ plain_text?: string }> } | undefined)?.rich_text;
	if (!rt) return "";
	return rt.map((r) => r.plain_text ?? "").join("");
}
function titleText(prop: unknown): string {
	const t = (prop as { title?: Array<{ plain_text?: string }> } | undefined)?.title;
	if (!t) return "";
	return t.map((r) => r.plain_text ?? "").join("");
}
function selectName(prop: unknown): string | undefined {
	return (prop as { select?: { name?: string } } | undefined)?.select?.name;
}
function dateStart(prop: unknown): string | undefined {
	return (prop as { date?: { start?: string } } | undefined)?.date?.start;
}

function truncate(s: string, n: number): string {
	return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// re-shape a value into the indexable JSON the worker SDK expects.
// returns a structurally-identical JSONValue that satisfies the strict
// index-signature requirement. typed as JSONValue (not generic) so the
// caller's return-type inference doesn't widen back into the source shape.
function asJson(v: unknown): JSONValue {
	return JSON.parse(JSON.stringify(v)) as JSONValue;
}

// ─── tool: list_residents ────────────────────────────────────────────────────

worker.tool("list_residents", {
	title: "list residents",
	description: "returns every human and agent currently in the mimi. house.",
	schema: j.object({}),
	execute: async () => {
		const dbId = process.env[ENV.NOTION_DB_RESIDENTS];
		if (!dbId) return asJson({ residents: [] as ResidentRow[] });
		const notion = new NotionClient({ auth: notionToken() });
		// the env value is treated as a data source id (per new notion API).
		const res = await notion.dataSources.query({ data_source_id: dbId, page_size: 100 });
		const p = NOTION_PROPS.residents;
		const residents = (res.results as Array<{ id: string; properties?: Record<string, unknown> }>).map((page) => {
			const props = page.properties ?? {};
			const row: ResidentRow = {
				id: page.id,
				identity: plainText(props[p.identity]),
				kind: (selectName(props[p.kind]) ?? "human") as ResidentRow["kind"],
				name: titleText(props[p.name]),
				species: selectName(props[p.species]) as Species | undefined,
				owner: plainText(props[p.owner]) || undefined,
				watches: selectName(props[p.watches]) as ResidentRow["watches"],
				joinedAt: dateStart(props[p.joinedAt]) ?? new Date().toISOString(),
				motto: plainText(props[p.motto]) || undefined,
			};
			return row;
		});
		return asJson({ residents });
	},
});

// ─── tool: recent_events ─────────────────────────────────────────────────────

worker.tool("recent_events", {
	title: "recent events",
	description: "returns the most recent events from the mimi. events database.",
	schema: j.object({
		limit: j.number().describe("how many events to return (default 10, max 100)").nullable(),
	}),
	execute: async ({ limit }) => {
		const dbId = process.env[ENV.NOTION_DB_EVENTS];
		if (!dbId) return asJson({ events: [] as EventRow[] });
		const cap = Math.min(Math.max(Number(limit ?? 10) || 10, 1), 100);
		const notion = new NotionClient({ auth: notionToken() });
		const p = NOTION_PROPS.events;
		const res = await notion.dataSources.query({
			data_source_id: dbId,
			sorts: [{ property: p.ts, direction: "descending" }],
			page_size: cap,
		});
		const events = (res.results as Array<{ id: string; properties?: Record<string, unknown> }>).map((page) => {
			const props = page.properties ?? {};
			const row: EventRow = {
				id: page.id,
				source: (selectName(props[p.source]) ?? "manual") as EventRow["source"],
				type: (selectName(props[p.type]) ?? "manual.poke") as EventRow["type"],
				ts: dateStart(props[p.ts]) ?? new Date().toISOString(),
				summary: titleText(props[p.summary]),
				agent: selectName(props[p.agent]) as Species | undefined,
			};
			return row;
		});
		return asJson({ events });
	},
});

// ─── tool: summon_agent ──────────────────────────────────────────────────────

worker.tool("summon_agent", {
	title: "summon agent",
	description: "send a prompt to a species' agent runtime /dialogue endpoint and return its reply.",
	schema: j.object({
		species: j.string().describe("tiger | otter | bunny | dog | giraffe"),
		prompt: j.string().describe("what to ask the agent"),
	}),
	execute: async ({ species, prompt }) => {
		if (!isSpecies(species)) return asJson({ ok: false, error: `unknown species: ${species}` });
		const url = agentUrlFor(species);
		if (!url) return asJson({ ok: false, error: `no runtime URL for ${species}` });
		try {
			const res = await fetch(`${url.replace(/\/$/, "")}/dialogue`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ prompt, from: "mcp" }),
			});
			const text = await res.text();
			let body: unknown = text;
			try { body = JSON.parse(text); } catch { /* keep as text */ }
			return asJson({ ok: res.ok, status: res.status, body });
		} catch (err) {
			return asJson({ ok: false, error: String(err) });
		}
	},
});

// ─── tool: read_agent_memory ─────────────────────────────────────────────────

worker.tool("read_agent_memory", {
	title: "read agent memory",
	description: "fetch the agent's journal page text (most recent callouts first).",
	schema: j.object({
		species: j.string().describe("tiger | otter | bunny | dog | giraffe"),
	}),
	execute: async ({ species }) => {
		if (!isSpecies(species)) return asJson({ ok: false, error: `unknown species: ${species}` });
		const dbId = process.env[ENV.NOTION_DB_AGENT_MEMORY];
		if (!dbId) return asJson({ ok: false, error: "NOTION_DB_AGENT_MEMORY not set" });

		const notion = new NotionClient({ auth: notionToken() });
		const p = NOTION_PROPS.agentMemory;
		const pageQuery = await notion.dataSources.query({
			data_source_id: dbId,
			filter: { property: p.species, select: { equals: species } },
			page_size: 5,
		});
		if (pageQuery.results.length === 0) {
			return asJson({ ok: true, species, entries: [] as string[] });
		}
		const pageId = (pageQuery.results[0] as { id: string }).id;
		const blocks = await notion.blocks.children.list({ block_id: pageId, page_size: 50 });

		const entries: string[] = [];
		for (const block of blocks.results as Array<Record<string, unknown>>) {
			const type = block.type as string | undefined;
			if (!type) continue;
			const content = block[type] as { rich_text?: Array<{ plain_text?: string }> } | undefined;
			const text = content?.rich_text?.map((r) => r.plain_text ?? "").join("") ?? "";
			if (text.trim()) entries.push(truncate(text, 500));
		}
		// most recent last (notion order) — reverse for "most recent first".
		entries.reverse();
		return asJson({ ok: true, species, pageId, entries });
	},
});

// ─── tool: append_event ──────────────────────────────────────────────────────

worker.tool("append_event", {
	title: "append event",
	description: "write a row to the events db from an external AI (claude code, cursor, etc).",
	schema: j.object({
		source: j.string().describe("event source — github | gmail | calendar | notion | manual"),
		type: j.string().describe("event type — e.g. manual.poke"),
		summary: j.string().describe("one-line summary"),
	}),
	execute: async ({ source, type, summary }) => {
		const dbId = process.env[ENV.NOTION_DB_EVENTS];
		if (!dbId) return asJson({ ok: false, error: "NOTION_DB_EVENTS not set" });
		const notion = new NotionClient({ auth: notionToken() });
		const p = NOTION_PROPS.events;
		const created = await notion.pages.create({
			parent: { database_id: dbId },
			properties: {
				[p.summary]: { title: [{ type: "text", text: { content: truncate(summary, 1900) } }] },
				[p.source]: { select: { name: source as EventSource } },
				[p.type]: { select: { name: type as EventType } },
				[p.ts]: { date: { start: new Date().toISOString() } },
			},
		});
		return asJson({ ok: true, pageId: created.id });
	},
});

// ─── tool: health ────────────────────────────────────────────────────────────

worker.tool("health", {
	title: "health check",
	description: "returns ok if reachable.",
	schema: j.object({}),
	execute: () => ({ status: "ok", worker: "mimi-mcp-server", ts: new Date().toISOString() }),
});
