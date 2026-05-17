// GET /api/agent-state — derive per-species live state by reading recent
// events + residents from the connected user's notion. used by apps/web's
// short poll loop in place of the old realtime channel.
//
// shape: { agents: Array<{ species, identity, state, mood?, pos?, speaking?, lastSpeakTs? }> }

import { NextRequest, NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import { getConnection } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Species = "tiger" | "otter" | "bunny" | "dog" | "giraffe";
type AgentLifecycleState = "idle" | "walking" | "working" | "talking" | "down";
type Mood = "happy" | "focused" | "sleepy" | "sad" | "panicked" | "sparkly" | "down";

const SPECIES_DESK: Record<Species, [number, number]> = {
  tiger: [-5, -5], otter: [5, -5], bunny: [-5, 5], giraffe: [5, 5], dog: [0, 0],
};

interface LiveAgent {
  species: Species;
  identity: string;
  state: AgentLifecycleState;
  mood?: Mood;
  pos?: { x: number; z: number };
  speaking?: string;
  lastSpeakTs?: number;
}

interface AgentSpeak {
  text: string;
  ts: number;
}

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("mimi_user_id")?.value;
  if (!userId) {
    // unauthed: return empty so the poll loop doesn't crash. apps/web shows
    // local placeholders in that case.
    return NextResponse.json({ agents: [], reason: "no_session" });
  }
  const conn = await getConnection(userId);
  if (!conn?.dbs?.events) {
    return NextResponse.json({ agents: [], reason: "not_provisioned" });
  }

  const notion = new NotionClient({ auth: conn.accessToken });

  try {
    // pull last 20 events sorted by Timestamp desc. infer per-species state from
    // the most recent event for each species.
    const events = await notion.databases.query({
      database_id: conn.dbs.events,
      sorts: [{ property: "Timestamp", direction: "descending" }],
      page_size: 20,
    });

    const seen = new Map<Species, LiveAgent>();
    const latestSpeak = new Map<Species, AgentSpeak>();
    for (const row of events.results) {
      const props = (row as { properties?: Record<string, unknown> }).properties ?? {};
      const agentSel = (props["Agent"] as { select?: { name?: string } } | undefined)?.select?.name;
      const type = (props["Type"] as { select?: { name?: string } } | undefined)?.select?.name ?? "";
      const ts = (props["Timestamp"] as { date?: { start?: string } } | undefined)?.date?.start;
      const summaryRich = (props["Summary"] as { title?: Array<{ plain_text?: string }> } | undefined)?.title ?? [];
      const summary = summaryRich.map((t) => t.plain_text ?? "").join("");
      const rawRich = (props["Raw Payload"] as { rich_text?: Array<{ plain_text?: string }> } | undefined)?.rich_text ?? [];
      const rawPayload = rawRich.map((t) => t.plain_text ?? "").join("");
      const parsedPayload = parseRawPayload(rawPayload);

      if (!agentSel) continue;
      const species = agentSel as Species;
      if (!SPECIES_DESK[species]) continue;
      const eventTs = ts ? new Date(ts).getTime() : undefined;
      const isFresh = eventTs ? Date.now() - eventTs < 60_000 : false;
      const isAgentSpeak = parsedPayload?.kind === "agent_speak";

      if (isAgentSpeak && isFresh && eventTs && !latestSpeak.has(species)) {
        const text = typeof parsedPayload.text === "string" ? parsedPayload.text : summary;
        if (text) latestSpeak.set(species, { text, ts: eventTs });
      }

      if (seen.has(species)) continue; // first (= most recent) wins for lifecycle

      // derive state from event type. heuristic — same as the agent runtime's
      // intent: github.push → working, calendar.invite → walking, etc.
      let state: AgentLifecycleState = "idle";
      let mood: Mood = "happy";
      if (isFresh) {
        if (isAgentSpeak) { state = "talking"; mood = "happy"; }
        else if (type.startsWith("github")) { state = "working"; mood = "focused"; }
        else if (type.startsWith("calendar")) { state = "walking"; mood = "focused"; }
        else if (type.startsWith("gmail")) { state = "working"; mood = "happy"; }
        else if (type.startsWith("notion")) { state = "talking"; mood = "focused"; }
      }

      const [x, z] = SPECIES_DESK[species];
      seen.set(species, {
        species,
        identity: species === "dog" ? "mimi" : species,
        state,
        mood,
        pos: { x, z },
      });
    }

    for (const [species, speak] of latestSpeak) {
      const state = seen.get(species);
      if (!state) continue;
      seen.set(species, {
        ...state,
        state: "talking",
        mood: state.mood ?? "happy",
        speaking: speak.text,
        lastSpeakTs: speak.ts,
      });
    }

    // also include any species not seen in recent events — render them idle.
    const allSpecies: Species[] = ["tiger", "otter", "bunny", "dog", "giraffe"];
    for (const s of allSpecies) {
      if (seen.has(s)) continue;
      const [x, z] = SPECIES_DESK[s];
      seen.set(s, {
        species: s,
        identity: s === "dog" ? "mimi" : s,
        state: "idle",
        mood: "happy",
        pos: { x, z },
      });
    }

    return NextResponse.json({ agents: Array.from(seen.values()) });
  } catch (e) {
    return NextResponse.json({ agents: [], error: (e as Error).message }, { status: 500 });
  }
}

function parseRawPayload(raw: string): { kind?: unknown; text?: unknown } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as { kind?: unknown; text?: unknown } : null;
  } catch {
    return null;
  }
}
