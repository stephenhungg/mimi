// poke-agent — fire synthetic external events at the agents so we can verify
// the wire end-to-end without waiting for a real github/gmail/calendar event.
//
// usage:
//   bun scripts/poke-agent.ts tiger     # fires a fake github.push at tiger
//   bun scripts/poke-agent.ts otter     # fake gmail.thread → otter
//   bun scripts/poke-agent.ts bunny     # fake calendar.invite → bunny
//   bun scripts/poke-agent.ts giraffe   # fake notion.meeting_notes → giraffe
//   bun scripts/poke-agent.ts mimi      # fake manual.poke → dog (mimi)
//   bun scripts/poke-agent.ts all       # one of each, staggered 4s apart
//
// requires:
//   AGENT_BASE_URL=http://localhost:8081  (agents/runtime default)
//   MIMI_EVENTS_URL=https://...workers... (or AGENT_BASE_URL fallback)

// scripts run from repo root with bun — workspace aliases aren't resolved here.
import type { ExternalEvent, Species } from "../packages/types/src/index.js";

const AGENT_BASE = process.env.AGENT_BASE_URL ?? "http://localhost:8081";
// optional — if set AND not a placeholder, goes through mimi-events worker.
// otherwise we hit the agent's /event endpoint directly.
const RAW_EVENTS = process.env.MIMI_EVENTS_URL;
const EVENTS_URL = RAW_EVENTS && !RAW_EVENTS.includes("example.workers.dev")
  ? RAW_EVENTS
  : undefined;

type Poke = {
  species: Species;
  event: Omit<ExternalEvent, "id" | "ts">;
};

const POKES: Record<string, Poke> = {
  tiger: {
    species: "tiger",
    event: {
      source: "github",
      type: "github.push",
      payload: {
        repo: "kalilabs/opal",
        branch: "main",
        commits: 3,
        head: "fix(livekit): tighten reconnect backoff on flaky webrtc",
        author: "stephen",
      },
      routeTo: "tiger",
    },
  },
  otter: {
    species: "otter",
    event: {
      source: "gmail",
      type: "gmail.thread",
      payload: {
        from: "ops@example.com",
        subject: "weekly summary — needs reply",
        snippet: "hey team, can someone confirm the new on-call schedule?",
      },
      routeTo: "otter",
    },
  },
  bunny: {
    species: "bunny",
    event: {
      source: "calendar",
      type: "calendar.invite",
      payload: {
        organizer: "maddy",
        title: "demo prep — notion hackathon",
        starts: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        attendees: ["stephen", "maddy", "tenz"],
      },
      routeTo: "bunny",
    },
  },
  giraffe: {
    species: "giraffe",
    event: {
      source: "notion",
      type: "notion.meeting_notes",
      payload: {
        pageTitle: "design crit — wave 2",
        bullets: [
          "asphalt+paper palette confirmed",
          "trainer card spec accepted (pokemon gen-1)",
          "thumbnail render → svg, not png, for v1",
        ],
      },
      routeTo: "giraffe",
    },
  },
  mimi: {
    species: "dog",
    event: {
      source: "manual",
      type: "manual.poke",
      payload: { from: "demo-script", reason: "wake up + dispatch check" },
      routeTo: "dog",
    },
  },
};

function urlFor(species: Species): string {
  // agent runtime exposes /event at AGENT_BASE_URL when run with --persona <species>
  // for a single-port demo, each agent runs on its own port and we route by species.
  // simplest: assume one base port + species suffix path, OR per-species port env.
  const speciesPort = process.env[`AGENT_${species.toUpperCase()}_PORT`];
  if (speciesPort) return `http://localhost:${speciesPort}/event`;
  return `${AGENT_BASE}/event`;
}

async function poke(name: string) {
  const p = POKES[name];
  if (!p) {
    console.error(`unknown agent: ${name}. options: ${Object.keys(POKES).join(", ")}, all`);
    process.exit(1);
  }
  const event: ExternalEvent = {
    id: `poke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    ...p.event,
  };
  const target = EVENTS_URL ? `${EVENTS_URL}/event` : urlFor(p.species);
  console.log(`→ POST ${target}`);
  console.log(`  event: ${event.type} → ${p.species}`);
  try {
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      console.error(`  ✗ ${res.status} ${res.statusText}`);
      const body = await res.text().catch(() => "");
      if (body) console.error(`  body: ${body.slice(0, 200)}`);
      process.exit(2);
    }
    console.log(`  ✓ ${res.status}`);
    const body = await res.text().catch(() => "");
    if (body) console.log(`  response: ${body.slice(0, 200)}`);
  } catch (e) {
    console.error(`  ✗ network error:`, e);
    process.exit(3);
  }
}

async function main() {
  const arg = process.argv[2] ?? "tiger";
  if (arg === "all") {
    for (const name of Object.keys(POKES)) {
      await poke(name);
      await new Promise((r) => setTimeout(r, 4000));
    }
    return;
  }
  await poke(arg);
}

main();
