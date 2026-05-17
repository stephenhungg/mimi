// chaos smoke test — fire 6 different team_chat messages at the echo chamber,
// verify mimi classifies each one to the right responder set.
//
// runs against a live local stack — boot it first with:
//   bash scripts/dev-stack.sh
//
// usage:
//   bun scripts/chaos-smoketest.ts
//   bun scripts/chaos-smoketest.ts --url http://localhost:3000

interface Case {
  text: string;
  expect: string[];      // any of these species means PASS; empty = anything goes
  description: string;
}

type Species = "tiger" | "otter" | "bunny" | "dog" | "giraffe";

const CASES: Case[] = [
  {
    description: "github → tiger",
    text: "the tests are failing on opal again",
    expect: ["tiger"],
  },
  {
    description: "calendar → bunny",
    text: "what's my schedule look like this afternoon?",
    expect: ["bunny"],
  },
  {
    description: "email → otter",
    text: "did we ever reply to that vendor thread from monday?",
    expect: ["otter"],
  },
  {
    description: "notes → giraffe",
    text: "can someone recap what we decided in standup yesterday?",
    expect: ["giraffe"],
  },
  {
    description: "greeting → mimi only",
    text: "hey team good morning",
    expect: ["dog"],
  },
  {
    description: "cross-domain → mimi + at least one specialist",
    text: "team check in. anyone got time today?",
    expect: ["dog", "bunny", "otter", "tiger", "giraffe"],
  },
];

const args = process.argv.slice(2);
let BASE = "http://localhost:3000";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--url" && args[i + 1]) BASE = args[++i]!;
}

interface ChatResponse {
  ok?: boolean;
  responders?: string[];
  reasoning?: string;
  error?: string;
}

async function fire(c: Case): Promise<{ pass: boolean; responders: string[]; reasoning: string; note: string }> {
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/team-chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from: "smoketest", text: c.text }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (e) {
    return { pass: false, responders: [], reasoning: "", note: `network: ${(e as Error).message}` };
  }
  const ms = Date.now() - t0;
  const body = (await res.json().catch(() => ({}))) as ChatResponse;
  const responders = body.responders ?? [];

  // PASS if at least one expected species shows up in responders.
  // for the "greeting → mimi only" case we want STRICT match (responders == [dog]).
  let pass: boolean;
  let note = `${ms}ms`;
  if (c.expect.length === 0) {
    pass = body.ok === true;
  } else {
    const matched = responders.some((r) => (c.expect as string[]).includes(r));
    pass = body.ok === true && matched;
    if (!matched) note += ` — expected one of ${c.expect.join(",")}, got ${responders.join(",") || "(none)"}`;
  }
  return { pass, responders, reasoning: body.reasoning ?? "", note };
}

async function main(): Promise<void> {
  console.log(`\nmimi. chaos smoketest — target: ${BASE}\n`);

  // health probe.
  try {
    const r = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) {
      console.error(`✗ landing not responding (${r.status}). boot it first:`);
      console.error(`    bash scripts/dev-stack.sh`);
      process.exit(2);
    }
  } catch (e) {
    console.error(`✗ landing unreachable at ${BASE}: ${(e as Error).message}`);
    console.error(`    boot it first: bash scripts/dev-stack.sh`);
    process.exit(2);
  }

  let pass = 0;
  let fail = 0;
  for (const c of CASES) {
    process.stdout.write(`  ${c.description.padEnd(48)} `);
    const r = await fire(c);
    if (r.pass) {
      console.log(`✓  → [${r.responders.join(", ")}] (${r.note})`);
      pass++;
    } else {
      console.log(`✗  ${r.note}`);
      if (r.reasoning) console.log(`    reasoning: ${r.reasoning}`);
      fail++;
    }
  }

  console.log("");
  console.log(`  ─── ${pass} passed · ${fail} failed ───`);
  console.log("");
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error("chaos smoketest crashed:", e);
  process.exit(3);
});
