// mimi-overnight-pulse — periodic agent pacing worker.
//
// notion workers run on a scheduled-sync model, but tools/webhooks aren't
// cron-driven. so we expose a /pulse webhook that an external scheduler
// (cron-job.org, github actions, notion automation) hits every 30 min.
// each pulse sends a synthetic "pulse" event to every species runtime, so
// the chibis pace + journal even when nothing external is happening.

import { Worker } from "@notionhq/workers";
import { j } from "@notionhq/workers/schema-builder";
import type { JSONValue } from "@notionhq/workers/types";
import { Client as NotionClient } from "@notionhq/client";

function asJson(v: unknown): JSONValue {
	return JSON.parse(JSON.stringify(v)) as JSONValue;
}
import {
	ALL_SPECIES,
	ENV,
	NOTION_PROPS,
	agentUrlFor,
	type EventRow,
	type ExternalEvent,
	type Species,
} from "./mimi.js";

const worker = new Worker();
export default worker;

const PULSE_WINDOW_MS = 30 * 60 * 1000;

function notionToken(): string | undefined {
	return process.env[ENV.NOTION_TOKEN] ?? process.env[ENV.NOTION_API_TOKEN];
}

async function recentlyActiveSpecies(notion: NotionClient): Promise<Set<Species>> {
	const dbId = process.env[ENV.NOTION_DB_EVENTS];
	if (!dbId) return new Set();
	const since = new Date(Date.now() - PULSE_WINDOW_MS).toISOString();
	const p = NOTION_PROPS.events;
	try {
		// the new notion API queries by data source id (see NOTION-WORKERS-SDK.md).
		// NOTION_DB_EVENTS is treated as the data source id for the events db.
		const res = await notion.dataSources.query({
			data_source_id: dbId,
			filter: { property: p.ts, date: { after: since } },
			page_size: 100,
		});
		const active = new Set<Species>();
		for (const page of res.results as Array<{ properties?: Record<string, unknown> }>) {
			const props = page.properties ?? {};
			const agentProp = (props[p.agent] as { select?: { name?: string } } | undefined)?.select?.name;
			if (agentProp && (ALL_SPECIES as readonly string[]).includes(agentProp)) {
				active.add(agentProp as Species);
			}
		}
		return active;
	} catch (err) {
		console.warn("mimi-overnight-pulse: events query failed, falling back to all species", err);
		return new Set(ALL_SPECIES);
	}
}

async function sendPulse(species: Species): Promise<{ species: Species; ok: boolean; error?: string }> {
	const url = agentUrlFor(species);
	if (!url) return { species, ok: false, error: "no_runtime_url" };
	const event: ExternalEvent = {
		id: `pulse-${species}-${Date.now()}`,
		source: "manual",
		type: "pulse" as EventRow["type"],
		ts: new Date().toISOString(),
		payload: { summary: `30-min pulse — journal + pace`, kind: "pulse" },
		routeTo: species,
	};
	try {
		const res = await fetch(`${url.replace(/\/$/, "")}/event`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(event),
		});
		return { species, ok: res.ok };
	} catch (err) {
		return { species, ok: false, error: String(err) };
	}
}

async function runPulse(): Promise<Array<{ species: Species; ok: boolean; error?: string }>> {
	const tok = notionToken();
	let targets: Species[];
	if (tok) {
		const notion = new NotionClient({ auth: tok });
		const active = await recentlyActiveSpecies(notion);
		// always include dog (oversight) so mimi. journals every cycle.
		active.add("dog");
		targets = active.size === 1 ? [...ALL_SPECIES] : [...active];
	} else {
		console.warn("mimi-overnight-pulse: no notion token — pulsing all species");
		targets = [...ALL_SPECIES];
	}
	return Promise.all(targets.map(sendPulse));
}

// ─── webhook: POST /pulse ────────────────────────────────────────────────────

worker.webhook("pulse", {
	title: "30-min agent pulse",
	description: "External scheduler hits this every 30m. Sends a pulse event to each active species.",
	execute: async () => {
		const results = await runPulse();
		console.log("mimi-overnight-pulse:", JSON.stringify(results));
	},
});

// ─── tools ───────────────────────────────────────────────────────────────────

worker.tool("triggerPulse", {
	title: "trigger pulse",
	description: "manually run a pulse cycle (demo + ops helper).",
	schema: j.object({}),
	execute: async () => {
		const results = await runPulse();
		return asJson({ results });
	},
});

worker.tool("health", {
	title: "health check",
	description: "returns ok if reachable.",
	schema: j.object({}),
	execute: () => ({ status: "ok", worker: "mimi-overnight-pulse", ts: new Date().toISOString() }),
});
