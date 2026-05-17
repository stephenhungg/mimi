// mimi-thumbnail-render — server-rendered SVG of the room.
//
// what notion image blocks fetch every few seconds. svg over png because:
//   - no canvas / wasm encoder needed in the workers runtime
//   - text-rendering: optimizeLegibility + shape-rendering: crispEdges
//     gives us pixel-art look for free
//   - tiny payload, cheap to regen
//
// reads residents + last 5 events from notion. lays out each agent at its
// themed corner with a chibi shape (head circle + body), shows mood ring,
// strips the last three event summaries across the bottom.

import { Worker } from "@notionhq/workers";
import { j } from "@notionhq/workers/schema-builder";
import type { JSONValue } from "@notionhq/workers/types";
import { Client as NotionClient } from "@notionhq/client";

function asJson(v: unknown): JSONValue {
	return JSON.parse(JSON.stringify(v)) as JSONValue;
}
import {
	ALL_SPECIES,
	BRAND,
	ENV,
	NOTION_PROPS,
	SPECIES_DESK,
	type EventRow,
	type ResidentRow,
	type Species,
} from "./mimi.js";

const worker = new Worker();
export default worker;

const WIDTH = 360;
const HEIGHT = 260;

function notionToken(): string | undefined {
	return process.env[ENV.NOTION_TOKEN] ?? process.env[ENV.NOTION_API_TOKEN];
}

async function fetchResidents(notion: NotionClient): Promise<ResidentRow[]> {
	const dbId = process.env[ENV.NOTION_DB_RESIDENTS];
	if (!dbId) return [];
	try {
		// NOTION_DB_RESIDENTS is treated as the data source id (new notion API).
		const res = await notion.dataSources.query({ data_source_id: dbId, page_size: 50 });
		const p = NOTION_PROPS.residents;
		return (res.results as Array<{ id: string; properties?: Record<string, unknown> }>).map((page) => {
			const props = page.properties ?? {};
			return {
				id: page.id,
				identity: plainText(props[p.identity]),
				kind: (selectName(props[p.kind]) ?? "human") as ResidentRow["kind"],
				name: titleText(props[p.name]),
				species: selectName(props[p.species]) as Species | undefined,
				joinedAt: dateStart(props[p.joinedAt]) ?? new Date().toISOString(),
			};
		});
	} catch (err) {
		console.warn("mimi-thumbnail-render: residents query failed", err);
		return [];
	}
}

async function fetchRecentEvents(notion: NotionClient, limit = 5): Promise<EventRow[]> {
	const dbId = process.env[ENV.NOTION_DB_EVENTS];
	if (!dbId) return [];
	try {
		const p = NOTION_PROPS.events;
		const res = await notion.dataSources.query({
			data_source_id: dbId,
			sorts: [{ property: p.ts, direction: "descending" }],
			page_size: limit,
		});
		return (res.results as Array<{ id: string; properties?: Record<string, unknown> }>).map((page) => {
			const props = page.properties ?? {};
			return {
				id: page.id,
				source: (selectName(props[p.source]) ?? "manual") as EventRow["source"],
				type: (selectName(props[p.type]) ?? "manual.poke") as EventRow["type"],
				ts: dateStart(props[p.ts]) ?? new Date().toISOString(),
				summary: titleText(props[p.summary]),
				agent: selectName(props[p.agent]) as Species | undefined,
			};
		});
	} catch (err) {
		console.warn("mimi-thumbnail-render: events query failed", err);
		return [];
	}
}

// ─── tiny notion property readers (mirror packages/notion-client) ────────────

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

// ─── svg rendering ───────────────────────────────────────────────────────────

function escapeXml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function chibi(species: Species, present: boolean): string {
	const desk = SPECIES_DESK[species];
	const { x, y, color, label } = desk;
	const opacity = present ? 1 : 0.35;
	// head + body — simple pixel-art chibi (two stacked rounded rects).
	return [
		`<g opacity="${opacity}">`,
		// shadow under
		`<ellipse cx="${x}" cy="${y + 28}" rx="14" ry="3" fill="#000" opacity="0.15"/>`,
		// body
		`<rect x="${x - 10}" y="${y + 6}" width="20" height="18" fill="${color}" stroke="${BRAND.asphalt}" stroke-width="1.5" rx="3"/>`,
		// head
		`<circle cx="${x}" cy="${y - 4}" r="12" fill="${color}" stroke="${BRAND.asphalt}" stroke-width="1.5"/>`,
		// eyes
		`<rect x="${x - 5}" y="${y - 6}" width="2" height="2" fill="${BRAND.asphalt}"/>`,
		`<rect x="${x + 3}" y="${y - 6}" width="2" height="2" fill="${BRAND.asphalt}"/>`,
		// label
		`<text x="${x}" y="${y + 42}" text-anchor="middle" font-family="monospace" font-size="8" fill="${BRAND.asphalt}">${escapeXml(label)}</text>`,
		`</g>`,
	].join("");
}

function renderSvg(residents: ResidentRow[], events: EventRow[]): string {
	const presentSpecies = new Set<Species>(
		residents.filter((r) => r.kind === "agent" && r.species).map((r) => r.species as Species),
	);

	const captions = events.slice(0, 3).map((e, i) => {
		const y = HEIGHT - 30 + i * 9;
		const text = truncate(`• ${e.summary || `${e.source}.${e.type}`}`, 56);
		return `<text x="12" y="${y}" font-family="monospace" font-size="7" fill="${BRAND.asphalt}">${escapeXml(text)}</text>`;
	}).join("");

	const agents = ALL_SPECIES.map((sp) => chibi(sp, presentSpecies.has(sp))).join("");

	return [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" shape-rendering="crispEdges" style="image-rendering: pixelated;">`,
		// room floor (paper)
		`<rect width="${WIDTH}" height="${HEIGHT}" fill="${BRAND.paper}"/>`,
		// frame
		`<rect x="2" y="2" width="${WIDTH - 4}" height="${HEIGHT - 4}" fill="none" stroke="${BRAND.asphalt}" stroke-width="3"/>`,
		// floor grid
		gridLines(),
		// header bar
		`<rect x="2" y="2" width="${WIDTH - 4}" height="18" fill="${BRAND.asphalt}"/>`,
		`<text x="10" y="15" font-family="monospace" font-size="10" fill="${BRAND.paper}">mimi. — live room</text>`,
		`<text x="${WIDTH - 10}" y="15" text-anchor="end" font-family="monospace" font-size="8" fill="${BRAND.paper}">${escapeXml(new Date().toISOString().slice(11, 19))}Z</text>`,
		agents,
		// caption strip background
		`<rect x="2" y="${HEIGHT - 44}" width="${WIDTH - 4}" height="42" fill="${BRAND.paper}" stroke="${BRAND.asphalt}" stroke-width="1"/>`,
		`<text x="12" y="${HEIGHT - 32}" font-family="monospace" font-size="7" fill="${BRAND.asphalt}" font-weight="bold">RECENT</text>`,
		captions,
		`</svg>`,
	].join("");
}

function gridLines(): string {
	const lines: string[] = [];
	for (let x = 20; x < WIDTH; x += 20) {
		lines.push(`<line x1="${x}" y1="22" x2="${x}" y2="${HEIGHT - 46}" stroke="${BRAND.asphalt}" stroke-opacity="0.05"/>`);
	}
	for (let y = 40; y < HEIGHT - 46; y += 20) {
		lines.push(`<line x1="4" y1="${y}" x2="${WIDTH - 4}" y2="${y}" stroke="${BRAND.asphalt}" stroke-opacity="0.05"/>`);
	}
	return lines.join("");
}

function truncate(s: string, n: number): string {
	return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

async function buildSvg(): Promise<string> {
	const tok = notionToken();
	if (!tok) {
		return renderSvg([], []);
	}
	const notion = new NotionClient({ auth: tok });
	const [residents, events] = await Promise.all([fetchResidents(notion), fetchRecentEvents(notion, 5)]);
	return renderSvg(residents, events);
}

// ─── webhook: GET /thumbnail ─────────────────────────────────────────────────
// note: the workers webhook runtime acks 202 + runs async, so we can't
// directly return a response body. we log + expose the svg through the
// previewThumbnail tool, which IS callable by `ntn workers exec` and by
// notion automations. for a notion image block, point it at the rendered
// SVG returned by the previewThumbnail tool output (or wrap via the agent
// runtime which can serve the SVG as a public URL).

worker.webhook("thumbnail", {
	title: "thumbnail render trigger",
	description: "log-only trigger — rebuilds + logs the SVG so consumers can pull it via the tool.",
	execute: async () => {
		const svg = await buildSvg();
		console.log(`mimi-thumbnail-render: built ${svg.length}b svg`);
	},
});

// ─── tools ───────────────────────────────────────────────────────────────────

worker.tool("previewThumbnail", {
	title: "preview thumbnail",
	description: "returns the current SVG of the room as a string (image/svg+xml).",
	schema: j.object({}),
	execute: async () => {
		const svg = await buildSvg();
		return asJson({
			contentType: "image/svg+xml",
			cacheControl: "public, max-age=5",
			body: svg,
		});
	},
});

worker.tool("health", {
	title: "health check",
	description: "returns ok if reachable.",
	schema: j.object({}),
	execute: () => ({ status: "ok", worker: "mimi-thumbnail-render", ts: new Date().toISOString() }),
});
