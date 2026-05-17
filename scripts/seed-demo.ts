// seed the notion workspace with demo state so the room doesn't feel empty
// when judges first look at it. idempotent: safe to re-run before each demo take.
//
// usage: bun scripts/seed-demo.ts

// scripts run from repo root with bun — workspace aliases aren't resolved here,
// so import directly from the package source.
import { MimiNotion } from "../packages/notion-client/src/index.js";
import { SPECIES_MOTTO, type Species } from "../packages/types/src/index.js";

const TEAM_HUMANS = [
  { identity: "stephen", name: "stephen" },
  { identity: "maddy",   name: "maddy" },
  { identity: "tenz",    name: "tenz" },
];

const SQUAD: Array<{ species: Species; owner: string; watches: "github" | "gmail" | "calendar" | "notion" | "manual" }> = [
  { species: "tiger",   owner: "stephen", watches: "github"   },
  { species: "otter",   owner: "stephen", watches: "gmail"    },
  { species: "bunny",   owner: "maddy",   watches: "calendar" },
  { species: "giraffe", owner: "tenz",    watches: "notion"   },
  { species: "dog",     owner: "maddy",   watches: "manual"   }, // mimi — oversight
];

const HISTORICAL_EVENTS: Array<{
  source: "github" | "gmail" | "calendar" | "notion" | "manual";
  type: "github.push" | "github.pull_request" | "gmail.thread" | "calendar.invite" | "notion.meeting_notes" | "manual.poke";
  summary: string;
  agent: Species;
  minsAgo: number;
}> = [
  { source: "github",   type: "github.push",         summary: "stephen pushed 3 commits to opal/main",                  agent: "tiger",   minsAgo: 8  },
  { source: "github",   type: "github.pull_request", summary: "tiger filed PR #42: fix flake in livekit.test.ts",       agent: "tiger",   minsAgo: 6  },
  { source: "gmail",    type: "gmail.thread",        summary: "otter triaged 4 emails, drafted 1 reply",                agent: "otter",   minsAgo: 12 },
  { source: "calendar", type: "calendar.invite",     summary: "bunny accepted invite: notion hackathon demo prep",      agent: "bunny",   minsAgo: 22 },
  { source: "notion",   type: "notion.meeting_notes",summary: "giraffe summarized standup into 3 bullets",              agent: "giraffe", minsAgo: 35 },
  { source: "manual",   type: "manual.poke",         summary: "mimi paced the room and journaled",                      agent: "dog",     minsAgo: 18 },
];

async function main() {
  const notion = MimiNotion.fromEnv();
  const now = Date.now();

  console.log("→ upserting residents (humans)…");
  for (const h of TEAM_HUMANS) {
    await notion.upsertResident({
      identity: h.identity,
      kind: "human",
      name: h.name,
      joinedAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    });
    console.log(`  ✓ ${h.name}`);
  }

  console.log("→ upserting residents (agents)…");
  for (const a of SQUAD) {
    await notion.upsertResident({
      identity: a.species,
      kind: "agent",
      name: a.species,
      species: a.species,
      owner: a.owner,
      watches: a.watches,
      motto: SPECIES_MOTTO[a.species],
      joinedAt: new Date(now - 1000 * 60 * 60).toISOString(),
    });
    console.log(`  ✓ ${a.species} (assigned by ${a.owner})`);
  }

  console.log("→ appending historical events…");
  for (const e of HISTORICAL_EVENTS) {
    await notion.appendEvent({
      source: e.source,
      type: e.type,
      ts: new Date(now - e.minsAgo * 60 * 1000).toISOString(),
      summary: e.summary,
      agent: e.agent,
    });
    console.log(`  ✓ ${e.summary}`);
  }

  console.log("→ creating sample artifact (PR draft)…");
  await notion.createArtifact({
    kind: "pr_draft",
    title: "fix(livekit): tighten reconnect backoff on flaky webrtc",
    body: "the test was hammering reconnect with no jitter; under load this triggers a server-side 429.\n\nthis pr adds full jitter + caps backoff at 8s.",
    createdBy: "tiger",
    ts: new Date(now - 1000 * 60 * 5).toISOString(),
    url: "https://github.com/example/opal/pull/42",
  });
  console.log("  ✓ pr_draft artifact");

  console.log("→ seeding agent_memory journal entries…");
  for (const a of SQUAD) {
    await notion.appendAgentMemory(a.species, a.species, {
      ts: new Date(now - 1000 * 60 * 30).toISOString(),
      kind: "journal",
      text: `morning. settled in at the desk. motto for today: ${SPECIES_MOTTO[a.species]}.`,
    });
    console.log(`  ✓ ${a.species} journal`);
  }

  console.log("\nseed complete. open the notion workspace — it should now look lived-in.");
}

main().catch((e) => {
  console.error("seed failed:", e);
  process.exit(1);
});
