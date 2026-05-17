// mimi. shared types — imported by apps/web, agents/runtime, workers, packages.
// single source of truth for: agent state, species, broadcasts, notion rows, events.

// ─── species + identity ──────────────────────────────────────────────────────

export type Species = "tiger" | "otter" | "bunny" | "dog" | "giraffe";

export type VoiceCluster = "dry" | "warm" | "chipper" | "leader" | "thoughtful";

export const SPECIES_VOICE: Record<Species, VoiceCluster> = {
  tiger: "dry",
  otter: "warm",
  bunny: "chipper",
  dog: "leader",
  giraffe: "thoughtful",
};

export const SPECIES_MOTTO: Record<Species, string> = {
  tiger: "tests are sacred",
  otter: "no email left behind",
  bunny: "always five minutes early",
  dog: "everyone goes home safe",
  giraffe: "i wrote that down",
};

// trainer-card frame color per species (asphalt-friendly accents).
export const SPECIES_COLOR: Record<Species, string> = {
  tiger: "#d97706", // burnt orange
  otter: "#3b82f6", // blue
  bunny: "#ec4899", // pink
  dog: "#eab308", // gold
  giraffe: "#65a30d", // green
};

// where in the room each agent's themed corner lives. x/z in 3D world units.
export const SPECIES_DESK: Record<Species, [number, number]> = {
  tiger: [-5, -5], // corner with code monitors
  otter: [5, -5], // desk with envelope stack
  bunny: [-5, 5], // calendar wall
  giraffe: [5, 5], // notes corner
  dog: [0, 0], // center rug — oversight
};

// ─── agent state (broadcast over the app transport) ─────────────────────────

export type AgentState =
  | "idle" // standing, gentle bob
  | "walking" // moving to target
  | "working" // at desk, keyboard slam
  | "talking" // in NPC dialogue with a human
  | "down"; // curled puddle — failure/rate-limit/error

export type Mood =
  | "happy"
  | "focused"
  | "sleepy"
  | "sad"
  | "panicked"
  | "sparkly"
  | "down";

export interface Position {
  x: number;
  z: number;
  rot?: number; // facing yaw, radians
}

// ─── broadcasts (app transport envelope) ────────────────────────────────────

// every runtime transport payload carries one of these.
export type Broadcast =
  | { type: "presence"; identity: string; kind: "human" | "agent"; species?: Species; name: string; pos: Position }
  | { type: "agent_state"; identity: string; species: Species; state: AgentState; pos?: Position; mood?: Mood }
  | { type: "agent_speak"; identity: string; species: Species; text: string; animalese: true }
  | { type: "chat"; identity: string; name: string; text: string }
  | { type: "npc_request"; from: string; toAgent: string; text: string }
  | { type: "event_echo"; eventId: string; source: string; eventType: string; payload: unknown };

// ─── agent tool calls (claude → runtime → broadcast) ────────────────────────

export interface WalkToArgs {
  x: number;
  z: number;
}
export interface TypeAtKeyboardArgs {
  ms: number;
}
export interface SpeakArgs {
  text: string;
}
export interface SetMoodArgs {
  mood: Mood;
}
// curl_up + reset_pose take no args.

// ─── external event payloads (webhooks → mimi-events → agents) ──────────────

export type EventSource = "github" | "gmail" | "calendar" | "notion" | "manual";
export type EventType =
  | "github.push"
  | "github.pull_request"
  | "github.issues"
  | "gmail.thread"
  | "calendar.invite"
  | "calendar.starting_soon"
  | "notion.meeting_notes"
  | "manual.poke";

export interface ExternalEvent {
  id: string;
  source: EventSource;
  type: EventType;
  ts: string; // ISO
  payload: Record<string, unknown>;
  // which species/agent this event is destined for. undefined = broadcast to all.
  routeTo?: Species;
}

// ─── notion db row shapes (semantic, not raw notion api) ────────────────────

export interface ResidentRow {
  id?: string; // notion page id
  identity: string; // unique key — "tiger" or user_id
  kind: "human" | "agent";
  name: string;
  species?: Species;
  owner?: string; // who assigned this agent (user identity)
  watches?: EventSource;
  joinedAt: string; // ISO
  motto?: string;
}

export interface EventRow {
  id?: string;
  source: EventSource;
  type: EventType;
  ts: string;
  summary: string;
  agent?: Species; // who handled it
  rawPayload?: string; // JSON.stringify
}

export interface ArtifactRow {
  id?: string;
  kind: "pr_draft" | "calendar_entry" | "email_reply" | "decision" | "note";
  title: string;
  body: string;
  createdBy: Species;
  ts: string;
  url?: string;
}

export interface ConversationRow {
  id?: string;
  ts: string;
  participants: string[]; // identities
  transcript: Array<{ from: string; text: string; ts: string }>;
  topic?: string;
}

export interface AgentMemoryEntry {
  ts: string;
  kind: "journal" | "decision" | "observation" | "pulse";
  text: string;
}

export interface AgentMemoryPage {
  id?: string;
  species: Species;
  identity: string;
  entries: AgentMemoryEntry[];
}

// ─── notion property name constants (one place to rename) ───────────────────

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
  artifacts: {
    kind: "Kind",
    title: "Title",
    body: "Body",
    createdBy: "Created By",
    ts: "Timestamp",
    url: "URL",
  },
  conversations: {
    ts: "Timestamp",
    participants: "Participants",
    topic: "Topic",
    transcript: "Transcript",
  },
  agentMemory: {
    species: "Species",
    identity: "Identity",
  },
} as const;

// ─── env var names (one place to typo-check) ────────────────────────────────

export const ENV = {
  NOTION_TOKEN: "NOTION_TOKEN",
  NOTION_PARENT_PAGE_ID: "NOTION_PARENT_PAGE_ID",
  NOTION_DB_RESIDENTS: "NOTION_DB_RESIDENTS",
  NOTION_DB_EVENTS: "NOTION_DB_EVENTS",
  NOTION_DB_ARTIFACTS: "NOTION_DB_ARTIFACTS",
  NOTION_DB_CONVERSATIONS: "NOTION_DB_CONVERSATIONS",
  NOTION_DB_AGENT_MEMORY: "NOTION_DB_AGENT_MEMORY",
  ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY",
  ANTHROPIC_MODEL: "ANTHROPIC_MODEL",
  GITHUB_WEBHOOK_SECRET: "GITHUB_WEBHOOK_SECRET",
  GITHUB_REPO: "GITHUB_REPO",
  MIMI_EVENTS_URL: "MIMI_EVENTS_URL",
} as const;

// ─── brand constants (single source of truth — referenced by web + landing) ─

export const BRAND = {
  asphalt: "#302F2C",
  paper: "#EFEDE3",
  pixelFont: "'Press Start 2P', monospace",
} as const;
