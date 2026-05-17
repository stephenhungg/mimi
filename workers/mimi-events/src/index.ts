// mimi-events — the central event ingestion worker.
//
// fan-in for ExternalEvent objects:
//   1. accept POST /event from any source (manual, agent runtime, bridges)
//   2. write a row into the events notion db
//   3. forward to the matching agent runtime so the chibi reacts visibly
//
// also exposes:
//   - appendEvent tool (callable by any notion agent or external test)
//   - routeToAgent tool (manual dispatch to a species)
//   - health tool (smoke check)

import { Worker } from "@notionhq/workers";
import { j } from "@notionhq/workers/schema-builder";
import { Client as NotionClient } from "@notionhq/client";
import {
	ALL_SPECIES,
	ENV,
	NOTION_PROPS,
	agentUrlFor,
	type EventSource,
	type EventType,
	type ExternalEvent,
	type Species,
} from "./mimi.js";

const worker = new Worker();
export default worker;

// ─── shared helpers ──────────────────────────────────────────────────────────

function notionTokenFromEnv(): string {
	const tok = process.env[ENV.NOTION_TOKEN] ?? process.env[ENV.NOTION_API_TOKEN];
	if (!tok) {
		throw new Error("mimi-events: missing NOTION_TOKEN / NOTION_API_TOKEN env");
	}
	return tok;
}

function eventsDbIdFromEnv(): string {
	const id = process.env[ENV.NOTION_DB_EVENTS];
	if (!id) throw new Error("mimi-events: missing NOTION_DB_EVENTS env");
	return id;
}

async function writeEventRow(args: {
	notion: NotionClient;
	source: EventSource;
	type: EventType;
	summary: string;
	ts?: string;
	agent?: Species;
	rawPayload?: unknown;
}): Promise<string> {
	const p = NOTION_PROPS.events;
	const ts = args.ts ?? new Date().toISOString();
	const raw =
		args.rawPayload === undefined
			? undefined
			: truncate(typeof args.rawPayload === "string" ? args.rawPayload : safeStringify(args.rawPayload), 1900);

	const created = await args.notion.pages.create({
		parent: { database_id: eventsDbIdFromEnv() },
		properties: {
			[p.summary]: { title: [{ type: "text", text: { content: truncate(args.summary, 1900) } }] },
			[p.source]: { select: { name: args.source } },
			[p.type]: { select: { name: args.type } },
			[p.ts]: { date: { start: ts } },
			...(args.agent ? { [p.agent]: { select: { name: args.agent } } } : {}),
			...(raw !== undefined ? { [p.rawPayload]: { rich_text: [{ type: "text", text: { content: raw } }] } } : {}),
		},
	});
	return created.id;
}

// best-effort POST to an agent runtime. swallows failures (logged) since the
// canonical record was already written to notion — the agent ping is fan-out.
async function forwardToAgent(species: Species, event: ExternalEvent): Promise<{ ok: boolean; status?: number; error?: string }> {
	const url = agentUrlFor(species);
	if (!url) {
		console.warn(`mimi-events: no runtime URL for species=${species}`);
		return { ok: false, error: "no_runtime_url" };
	}
	const endpoint = `${url.replace(/\/$/, "")}/event`;
	try {
		const res = await fetch(endpoint, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(event),
		});
		if (!res.ok) {
			console.warn(`mimi-events: forward to ${species} failed status=${res.status}`);
		}
		return { ok: res.ok, status: res.status };
	} catch (err) {
		console.warn(`mimi-events: forward to ${species} threw`, err);
		return { ok: false, error: String(err) };
	}
}

function safeStringify(v: unknown): string {
	try {
		return JSON.stringify(v);
	} catch {
		return String(v);
	}
}

function truncate(s: string, n: number): string {
	return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function isSpecies(s: unknown): s is Species {
	return typeof s === "string" && (ALL_SPECIES as readonly string[]).includes(s);
}

// ─── webhook: POST /event (the external ingestion endpoint) ──────────────────

worker.webhook("event", {
	title: "mimi. event ingestion",
	description: "Accepts ExternalEvent JSON, writes to the events db, fans out to the agent runtime.",
	execute: async (events) => {
		const notion = new NotionClient({ auth: notionTokenFromEnv() });

		for (const event of events) {
			const body = event.body as Partial<ExternalEvent> & Record<string, unknown>;
			const source = (body.source ?? "manual") as EventSource;
			const type = (body.type ?? "manual.poke") as EventType;
			const summary = typeof body.payload === "object" && body.payload && "summary" in body.payload
				? String((body.payload as Record<string, unknown>).summary)
				: `${source}.${type}`;
			const ts = body.ts ?? new Date().toISOString();
			const routeTo = isSpecies(body.routeTo) ? body.routeTo : undefined;

			try {
				const pageId = await writeEventRow({
					notion,
					source,
					type,
					summary,
					ts,
					agent: routeTo,
					rawPayload: body.payload ?? body,
				});
				console.log(`mimi-events: wrote event ${pageId} source=${source} type=${type}`);

				const normalized: ExternalEvent = {
					id: body.id ?? event.deliveryId,
					source,
					type,
					ts,
					payload: (body.payload as Record<string, unknown>) ?? {},
					routeTo,
				};

				if (routeTo) {
					await forwardToAgent(routeTo, normalized);
				} else {
					// broadcast to every species — let each runtime decide.
					await Promise.all(ALL_SPECIES.map((sp) => forwardToAgent(sp, normalized)));
				}
			} catch (err) {
				// fail loud in logs, but don't throw — webhook retries should not
				// fire just because the agent fan-out hiccuped.
				console.error("mimi-events: handling failed", err);
			}
		}
	},
});

// ─── tools ───────────────────────────────────────────────────────────────────

worker.tool("appendEvent", {
	title: "Append event",
	description: "Writes a single row to the mimi. events database.",
	schema: j.object({
		source: j.string().describe("event source — github | gmail | calendar | notion | manual"),
		type: j.string().describe("event type — e.g. github.push, calendar.invite, manual.poke"),
		summary: j.string().describe("one-line human-readable summary"),
		agent: j.string().describe("species that should handle this event").nullable(),
		rawPayload: j.string().describe("optional stringified payload to keep alongside the row").nullable(),
	}),
	execute: async ({ source, type, summary, agent, rawPayload }) => {
		const notion = new NotionClient({ auth: notionTokenFromEnv() });
		const pageId = await writeEventRow({
			notion,
			source: source as EventSource,
			type: type as EventType,
			summary,
			agent: isSpecies(agent) ? agent : undefined,
			rawPayload: rawPayload ?? undefined,
		});
		return { pageId };
	},
});

worker.tool("routeToAgent", {
	title: "Route event to agent",
	description: "Posts a synthetic event to a species' agent runtime (no db write).",
	schema: j.object({
		species: j.string().describe("tiger | otter | bunny | dog | giraffe"),
		eventDescription: j.string().describe("plain-text description of what happened"),
	}),
	execute: async ({ species, eventDescription }) => {
		if (!isSpecies(species)) {
			return { ok: false, error: `unknown species: ${species}` };
		}
		const event: ExternalEvent = {
			id: `manual-${Date.now()}`,
			source: "manual",
			type: "manual.poke",
			ts: new Date().toISOString(),
			payload: { summary: eventDescription },
			routeTo: species,
		};
		const result = await forwardToAgent(species, event);
		return result;
	},
});

worker.tool("health", {
	title: "Health check",
	description: "Returns ok if the worker is reachable.",
	schema: j.object({}),
	execute: () => ({ status: "ok", worker: "mimi-events", ts: new Date().toISOString() }),
});
