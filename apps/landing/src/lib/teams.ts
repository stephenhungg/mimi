// team storage layer. teams group multiple humans + multiple assigned agents
// into one shared notion workspace + one shared 3D room.
//
// data model (upstash redis):
//   mimi:team:<teamId>           → Team
//   mimi:team:<teamId>:members   → Set<userId>
//   mimi:team:<teamId>:agents    → Set<json(AgentAssignment)>
//   mimi:user:<userId>:teams     → Set<teamId>
//   mimi:invite:<code>           → { teamId, expiresAt }
//
// member roles:
//   - owner: the user who created the team. their notion connection backs the
//     team's dbs (the team uses owner.accessToken for all notion writes).
//   - member: joined via invite. has their own personal notion but contributes
//     agents to the team room. members do NOT need to share their notion.

import { Redis } from "@upstash/redis";
import type { NotionConnection } from "./storage";

export type Species = "tiger" | "otter" | "bunny" | "dog" | "giraffe";

export interface Team {
  id: string;
  name: string;
  ownerUserId: string;
  // copied at create-time from the owner's connection so we don't have to
  // re-fetch every time. ALL team notion writes use ownerAccessToken.
  ownerAccessToken: string;
  workspaceName: string;
  workspaceIcon?: string;
  hubPageId: string;
  dbs: NonNullable<NotionConnection["dbs"]>;
  // stable room id — derived from team id, but stored for convenience.
  roomId: string;
  createdAt: string;
}

export interface AgentAssignment {
  userId: string;       // who contributed the agent
  userName?: string;    // display name for "contributed by"
  species: Species;
  identity: string;     // unique key per (userId, species) — e.g. "stephen-tiger"
  assignedAt: string;
}

export interface Invite {
  code: string;
  teamId: string;
  createdBy: string;
  expiresAt: string;
}

// ─── redis client ───────────────────────────────────────────────────────────

let _redis: Redis | null = null;
function redisOrNull(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

// in-memory dev fallback so things work without redis configured.
const memTeams = new Map<string, Team>();
const memTeamMembers = new Map<string, Set<string>>();
const memTeamAgents = new Map<string, AgentAssignment[]>();
const memUserTeams = new Map<string, Set<string>>();
const memInvites = new Map<string, Invite>();

// ─── helpers ────────────────────────────────────────────────────────────────

export function randomCode(bytes = 8): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function teamRoomId(teamId: string): string {
  // keep room ids deterministic + short.
  return `mimi-team-${teamId.slice(0, 12)}`;
}

const TEAM_TTL = 60 * 60 * 24 * 30; // 30 days
const INVITE_TTL = 60 * 60 * 24 * 7; // 7 days

// ─── teams ──────────────────────────────────────────────────────────────────

export async function createTeam(args: {
  name: string;
  ownerUserId: string;
  ownerConnection: NotionConnection;
}): Promise<Team> {
  if (!args.ownerConnection.dbs || !args.ownerConnection.hubPageId) {
    throw new Error("owner's notion workspace isn't provisioned yet — they must provision 5 dbs first");
  }
  const id = randomCode(12);
  const team: Team = {
    id,
    name: args.name,
    ownerUserId: args.ownerUserId,
    ownerAccessToken: args.ownerConnection.accessToken,
    workspaceName: args.ownerConnection.workspaceName,
    workspaceIcon: args.ownerConnection.workspaceIcon,
    hubPageId: args.ownerConnection.hubPageId,
    dbs: args.ownerConnection.dbs,
    roomId: teamRoomId(id),
    createdAt: new Date().toISOString(),
  };
  const r = redisOrNull();
  if (r) {
    await r.set(`mimi:team:${id}`, JSON.stringify(team), { ex: TEAM_TTL });
    await r.sadd(`mimi:team:${id}:members`, args.ownerUserId);
    await r.expire(`mimi:team:${id}:members`, TEAM_TTL);
    await r.sadd(`mimi:user:${args.ownerUserId}:teams`, id);
    await r.expire(`mimi:user:${args.ownerUserId}:teams`, TEAM_TTL);
  } else {
    memTeams.set(id, team);
    memTeamMembers.set(id, new Set([args.ownerUserId]));
    if (!memUserTeams.has(args.ownerUserId)) memUserTeams.set(args.ownerUserId, new Set());
    memUserTeams.get(args.ownerUserId)!.add(id);
  }
  return team;
}

export async function getTeam(id: string): Promise<Team | null> {
  const r = redisOrNull();
  if (r) {
    const raw = await r.get<string>(`mimi:team:${id}`);
    if (!raw) return null;
    return normalizeTeam(typeof raw === "string" ? JSON.parse(raw) : raw);
  }
  const team = memTeams.get(id);
  return team ? normalizeTeam(team) : null;
}

function normalizeTeam(raw: unknown): Team {
  const team = raw as Team;
  if (!team.roomId) {
    team.roomId = teamRoomId(team.id);
  }
  return team;
}

export async function listUserTeams(userId: string): Promise<Team[]> {
  const r = redisOrNull();
  let ids: string[];
  if (r) {
    const set = await r.smembers(`mimi:user:${userId}:teams`);
    ids = set as string[];
  } else {
    ids = Array.from(memUserTeams.get(userId) ?? []);
  }
  const teams = await Promise.all(ids.map((id) => getTeam(id)));
  return teams.filter((t): t is Team => t !== null);
}

export async function listMembers(teamId: string): Promise<string[]> {
  const r = redisOrNull();
  if (r) {
    const set = await r.smembers(`mimi:team:${teamId}:members`);
    return set as string[];
  }
  return Array.from(memTeamMembers.get(teamId) ?? []);
}

// ─── invites ────────────────────────────────────────────────────────────────

export async function createInvite(teamId: string, createdBy: string): Promise<Invite> {
  const code = randomCode(10);
  const invite: Invite = {
    code,
    teamId,
    createdBy,
    expiresAt: new Date(Date.now() + INVITE_TTL * 1000).toISOString(),
  };
  const r = redisOrNull();
  if (r) {
    await r.set(`mimi:invite:${code}`, JSON.stringify(invite), { ex: INVITE_TTL });
  } else {
    memInvites.set(code, invite);
  }
  return invite;
}

export async function consumeInvite(code: string, userId: string): Promise<Team | null> {
  const r = redisOrNull();
  let invite: Invite | null = null;
  if (r) {
    const raw = await r.get<string>(`mimi:invite:${code}`);
    if (raw) invite = typeof raw === "string" ? (JSON.parse(raw) as Invite) : (raw as Invite);
  } else {
    invite = memInvites.get(code) ?? null;
  }
  if (!invite) return null;
  if (new Date(invite.expiresAt).getTime() < Date.now()) return null;

  const team = await getTeam(invite.teamId);
  if (!team) return null;

  if (r) {
    await r.sadd(`mimi:team:${team.id}:members`, userId);
    await r.expire(`mimi:team:${team.id}:members`, TEAM_TTL);
    await r.sadd(`mimi:user:${userId}:teams`, team.id);
    await r.expire(`mimi:user:${userId}:teams`, TEAM_TTL);
    // invites are single-use? simpler if multi-use until expiry. keep multi-use.
  } else {
    if (!memTeamMembers.has(team.id)) memTeamMembers.set(team.id, new Set());
    memTeamMembers.get(team.id)!.add(userId);
    if (!memUserTeams.has(userId)) memUserTeams.set(userId, new Set());
    memUserTeams.get(userId)!.add(team.id);
  }
  return team;
}

// ─── agent assignments ──────────────────────────────────────────────────────

export async function assignAgent(args: {
  teamId: string;
  userId: string;
  userName?: string;
  species: Species;
}): Promise<AgentAssignment> {
  const identity = `${args.userId.slice(0, 8)}-${args.species}`;
  const assignment: AgentAssignment = {
    userId: args.userId,
    userName: args.userName,
    species: args.species,
    identity,
    assignedAt: new Date().toISOString(),
  };
  const r = redisOrNull();
  if (r) {
    await r.sadd(`mimi:team:${args.teamId}:agents`, JSON.stringify(assignment));
    await r.expire(`mimi:team:${args.teamId}:agents`, TEAM_TTL);
  } else {
    if (!memTeamAgents.has(args.teamId)) memTeamAgents.set(args.teamId, []);
    memTeamAgents.get(args.teamId)!.push(assignment);
  }
  return assignment;
}

export async function listAssignments(teamId: string): Promise<AgentAssignment[]> {
  const r = redisOrNull();
  if (r) {
    const set = await r.smembers(`mimi:team:${teamId}:agents`);
    return (set as string[]).map((s) => {
      try { return JSON.parse(s) as AgentAssignment; } catch { return null; }
    }).filter((a): a is AgentAssignment => a !== null);
  }
  return memTeamAgents.get(teamId) ?? [];
}

export async function unassignAgent(teamId: string, identity: string): Promise<void> {
  const r = redisOrNull();
  if (r) {
    const all = await listAssignments(teamId);
    const match = all.find((a) => a.identity === identity);
    if (match) await r.srem(`mimi:team:${teamId}:agents`, JSON.stringify(match));
  } else {
    const list = memTeamAgents.get(teamId) ?? [];
    memTeamAgents.set(teamId, list.filter((a) => a.identity !== identity));
  }
}
