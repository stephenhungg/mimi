// per-user notion connection storage.
// uses upstash redis when configured; falls back to an in-memory map for local
// dev without redis (lost on server restart — fine for hackathon, not prod).

import { Redis } from "@upstash/redis";

export interface NotionConnection {
  userId: string;
  accessToken: string;
  workspaceId: string;
  workspaceName: string;
  workspaceIcon?: string;
  botId: string;
  ownerName?: string;
  ownerAvatar?: string;
  // db ids after provision — undefined until /api/notion/provision runs.
  dbs?: {
    residents: string;
    events: string;
    artifacts: string;
    conversations: string;
    agentMemory: string;
  };
  hubPageId?: string;
  connectedAt: string;
}

// ─── backing store: redis if configured, in-memory otherwise ────────────────

let _redis: Redis | null = null;
function redisOrNull(): Redis | null {
  if (_redis) return _redis;
  // accept both legacy vercel KV names (auto-injected by the marketplace
  // upstash integration) and the canonical upstash names.
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

// dev fallback — module-level map, lost on hot reload but ok for local test.
const memory = new Map<string, NotionConnection>();
const memoryState = new Map<string, { state: string; createdAt: number }>();

const TOKEN_TTL_SECS = 60 * 60 * 24 * 7; // 7 days
const STATE_TTL_SECS = 60 * 10;          // 10 min for csrf state

// ─── public api ─────────────────────────────────────────────────────────────

export async function saveConnection(c: NotionConnection): Promise<void> {
  const r = redisOrNull();
  if (r) await r.set(`mimi:conn:${c.userId}`, JSON.stringify(c), { ex: TOKEN_TTL_SECS });
  else memory.set(c.userId, c);
}

export async function getConnection(userId: string): Promise<NotionConnection | null> {
  const r = redisOrNull();
  if (r) {
    const raw = await r.get<string>(`mimi:conn:${userId}`);
    if (!raw) return null;
    // upstash auto-parses json sometimes — handle both.
    return typeof raw === "string" ? (JSON.parse(raw) as NotionConnection) : (raw as NotionConnection);
  }
  return memory.get(userId) ?? null;
}

export async function updateConnection(userId: string, patch: Partial<NotionConnection>): Promise<NotionConnection | null> {
  const existing = await getConnection(userId);
  if (!existing) return null;
  const merged: NotionConnection = { ...existing, ...patch };
  await saveConnection(merged);
  return merged;
}

// ─── oauth csrf state ──────────────────────────────────────────────────────

export async function saveOAuthState(state: string, userId: string): Promise<void> {
  const r = redisOrNull();
  if (r) await r.set(`mimi:oauth:state:${state}`, userId, { ex: STATE_TTL_SECS });
  else memoryState.set(state, { state: userId, createdAt: Date.now() });
}

export async function consumeOAuthState(state: string): Promise<string | null> {
  const r = redisOrNull();
  if (r) {
    const userId = await r.get<string>(`mimi:oauth:state:${state}`);
    if (userId) await r.del(`mimi:oauth:state:${state}`);
    return userId ?? null;
  }
  const entry = memoryState.get(state);
  if (!entry) return null;
  memoryState.delete(state);
  // expire after 10min in memory too
  if (Date.now() - entry.createdAt > STATE_TTL_SECS * 1000) return null;
  return entry.state;
}

// ─── helper — generate a random opaque token ───────────────────────────────

export function randomToken(bytes = 24): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
