// duplicated from @mimi/types — keep in sync
// TODO: when the workspace/npm interop is sorted, replace with `import from "@mimi/types"`.
// inlined here because workers run on the Notion runtime; the @mimi/types
// workspace package is not resolvable from this dir without extra build setup.

export type Species = "tiger" | "otter" | "bunny" | "dog" | "giraffe";

export const ALL_SPECIES: Species[] = ["tiger", "otter", "bunny", "dog", "giraffe"];

export type EventSource = "github" | "gmail" | "calendar" | "notion" | "manual";

export type EventType =
	| "github.push"
	| "github.pull_request"
	| "github.issues"
	| "gmail.thread"
	| "calendar.invite"
	| "calendar.starting_soon"
	| "notion.meeting_notes"
	| "manual.poke"
	| "pulse";

export interface ExternalEvent {
	id: string;
	source: EventSource;
	type: EventType;
	ts: string;
	payload: Record<string, unknown>;
	routeTo?: Species;
}

export interface EventRow {
	id?: string;
	source: EventSource;
	type: EventType;
	ts: string;
	summary: string;
	agent?: Species;
	rawPayload?: string;
}

export interface ResidentRow {
	id?: string;
	identity: string;
	kind: "human" | "agent";
	name: string;
	species?: Species;
	owner?: string;
	watches?: EventSource;
	joinedAt: string;
	motto?: string;
}

// notion property names — must match the canonical @mimi/types NOTION_PROPS.
export const NOTION_PROPS = {
	residents: {
		identity: "Identity",
		kind: "Kind",
		name: "Name",
		species: "Species",
		owner: "Owner",
		watches: "Watches",
		joinedAt: "Joined At",
		motto: "Motto",
	},
	events: {
		source: "Source",
		type: "Type",
		ts: "Timestamp",
		summary: "Summary",
		agent: "Agent",
		rawPayload: "Raw Payload",
	},
	agentMemory: {
		species: "Species",
		identity: "Identity",
	},
} as const;

// env var names — must match @mimi/types ENV.
export const ENV = {
	NOTION_TOKEN: "NOTION_TOKEN",
	NOTION_API_TOKEN: "NOTION_API_TOKEN",
	NOTION_DB_RESIDENTS: "NOTION_DB_RESIDENTS",
	NOTION_DB_EVENTS: "NOTION_DB_EVENTS",
	NOTION_DB_ARTIFACTS: "NOTION_DB_ARTIFACTS",
	NOTION_DB_CONVERSATIONS: "NOTION_DB_CONVERSATIONS",
	NOTION_DB_AGENT_MEMORY: "NOTION_DB_AGENT_MEMORY",
	GITHUB_WEBHOOK_SECRET: "GITHUB_WEBHOOK_SECRET",
	MIMI_EVENTS_URL: "MIMI_EVENTS_URL",
	AGENT_BASE_URL: "AGENT_BASE_URL",
	AGENT_TIGER_URL: "AGENT_TIGER_URL",
	AGENT_OTTER_URL: "AGENT_OTTER_URL",
	AGENT_BUNNY_URL: "AGENT_BUNNY_URL",
	AGENT_DOG_URL: "AGENT_DOG_URL",
	AGENT_GIRAFFE_URL: "AGENT_GIRAFFE_URL",
} as const;

// brand palette — duplicated from packages/types BRAND.
export const BRAND = {
	asphalt: "#302F2C",
	paper: "#EFEDE3",
} as const;

// per-species desk corner used by the thumbnail renderer (sprite layout in SVG).
export const SPECIES_DESK: Record<Species, { x: number; y: number; color: string; label: string }> = {
	tiger: { x: 60, y: 60, color: "#d97706", label: "TIGER" },
	otter: { x: 260, y: 60, color: "#3b82f6", label: "OTTER" },
	bunny: { x: 60, y: 200, color: "#ec4899", label: "BUNNY" },
	giraffe: { x: 260, y: 200, color: "#65a30d", label: "GIRAFFE" },
	dog: { x: 160, y: 130, color: "#eab308", label: "MIMI." },
};

// pick the runtime URL for a given species. checks specific env first, falls back
// to a generic AGENT_BASE_URL/{species} pattern.
export function agentUrlFor(species: Species, env: NodeJS.ProcessEnv = process.env): string | undefined {
	const specific = env[`AGENT_${species.toUpperCase()}_URL`];
	if (specific) return specific;
	const base = env[ENV.AGENT_BASE_URL];
	if (base) return `${base.replace(/\/$/, "")}/${species}`;
	return undefined;
}
