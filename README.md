# mimi.

> the 3D agent workspace for notion. chibi animals watching your tools. one cozy room. notion is the ground truth.

built for the [notion developer platform hackathon](https://luma.com/fyuf7), may 16-17 2026.

## what is this

mimi. is a two-layer agent workspace:

- **layer A — notion (dashboard)**: open notion. a live svg thumbnail of your team's 3D room renders inline, with the events / residents / artifacts dbs as inline views. judges scroll notion and the product is right there.
- **layer B — 3D world (live space)**: click the thumbnail → vite + r3f + livekit drops you into a first-person multiplayer room. chibi animal agents at their themed corners; tiger watches github, otter watches gmail, bunny watches calendar, mimi (the dog) dispatches, giraffe summarizes notion meeting notes.

every action in 3D writes back to notion as canonical state. agents speak in **animalese** (procedural chirp). when an agent rate-limits or crashes, it **curls into a slime puddle** — failure is a first-class state.

**brand**: asphalt `#302F2C` + paper `#EFEDE3` (warm undertones, never pure b/w). animal-crossing-coded sticker art. pokemon gen-1 trainer cards for agent profiles. full spec in [`PROJECT.md`](./PROJECT.md), [`design/BRAND.md`](./design/BRAND.md), [`RESEARCH.md`](./RESEARCH.md).

## repo layout

```
apps/
  web/            → 3D world client (vite + r3f + livekit)
  landing/        → next.js marketing site + token route + agent router api

agents/
  runtime/        → per-agent runtime (bun + claude api + livekit broadcaster)
    personas/     → per-species persona configs + .md system prompts

workers/                          (deployed via ntn workers deploy)
  mimi-events/                    → central event ingestion → events db + fan-out
  mimi-github-bridge/             → github webhook (HMAC-verified) → mimi-events
  mimi-overnight-pulse/           → 30-min agent pacing pulse
  mimi-thumbnail-render/          → live svg pixel-art thumbnail of the room
  mimi-mcp-server/                → MCP exposing mimi. tools to any external AI
  mimi-notion-agents/             → SPONSOR FLEX — wraps notion-agents-sdk-js
  _shared/                        → inlined types + helpers (workspace npm boundary)

packages/
  types/          → shared TS (species, broadcasts, db rows, brand constants)
  notion-client/  → typed wrapper over @notionhq/client v2
  animalese/      → procedural chirp synth (web audio, per-species voice cluster)

design/
  generated/      → higgsfield-generated brand assets
  BRAND.md        → palette + mascot + line treatment lock

scripts/
  provision-notion-dbs.ts  → idempotent: creates the 5 notion dbs
  seed-demo.ts             → lived-in demo state before recording
  poke-agent.ts            → fires synthetic external events at each species
  check-env.ts             → preflight validator (run before demo)

docs/
  ARCHITECTURE.md          → deep dive (judges)
  DEMO-RUNBOOK.md          → pre-flight, launch order, 3-min loop, fallbacks
  NOTION-PAGE-SETUP.md     → how to wire the notion dashboard page
  SUBMISSION.md            → copy-paste-ready submission text
```

## quick start

```bash
# 1 — install (root bun workspaces; workers/ uses npm via ntn)
bun install

# 2 — env (copy + fill: notion token, livekit keys, anthropic key, github webhook secret)
cp .env.example .env.local
$EDITOR .env.local

# 3 — preflight (green checklist before you proceed)
bun scripts/check-env.ts

# 4 — provision the 5 notion dbs under NOTION_PARENT_PAGE_ID (idempotent)
bun run provision:notion

# 5 — seed demo state so notion looks lived-in
bun run seed:demo

# 6 — deploy workers (one-time per env)
cd workers && \
  ntn workers deploy --name mimi-events && \
  ntn workers deploy --name mimi-github-bridge && \
  ntn workers deploy --name mimi-thumbnail-render && \
  ntn workers deploy --name mimi-overnight-pulse && \
  ntn workers deploy --name mimi-mcp-server && \
  ntn workers deploy --name mimi-notion-agents && \
  cd ..

# 7 — local dev (3+ terminals)
bun run dev:landing                                  # next on :3000 (token + agent router)
bun run dev:web                                      # vite on :5173 (3D client)
AGENT_PORT=8081 bun run dev:tiger                    # tiger agent on :8081
AGENT_PORT=8082 bun run dev:otter                    # (optional)
AGENT_PORT=8083 bun run dev:bunny                    # (optional)
AGENT_PORT=8084 bun run dev:dog                      # (optional)

# 8 — smoke test
bun scripts/poke-agent.ts tiger                      # fire a fake github.push → tiger reacts
```

set `VITE_AGENT_BASE_URL=http://localhost:3000/api/agent` and the landing's
agent router fans out by species (tiger=8081, otter=8082, …).

## demo loop (3 min)

per [`PROJECT.md`](./PROJECT.md) — the killshot beat is 1:30-2:00:
push a real commit → tiger jolts in the 3D room → walks to its desk → keyboard-slam → animalese-chirps the diagnosis → files an artifact to notion → notion db row appears live. judges watch the whole chain in <2s.

full [`docs/DEMO-RUNBOOK.md`](./docs/DEMO-RUNBOOK.md) covers pre-flight, launch order, per-beat fallbacks, and the 1-min cut.

## stack at a glance

| layer | tech |
|---|---|
| 3D client | vite, react 19, @react-three/fiber, drei, livekit-client |
| multiplayer | livekit cloud (data channel — position + chat broadcasts) |
| voice | animalese — procedural chirp synth, no TTS |
| agent runtime | bun + @anthropic-ai/sdk (claude sonnet 4.6, tool-use loop) |
| livekit broadcaster | livekit-server-sdk (RoomServiceClient.sendData, no participant) |
| failure handling | curl_up() — broadcast state='down' + auto-recover, mimi walks over |
| workers | @notionhq/workers (6 workers + MCP + notion-agents-sdk-js wrapper) |
| notion api | @notionhq/client v2 (semantic typed wrapper in `packages/notion-client`) |
| landing | next.js 15 (token mint + agent router + onboarding flow) |

## team

- **stephen** — runtime + workers + 3D client (founders@kalilabs.ai)
- **maddy** — design, room aesthetic, demo narrative, on-stage
- **tenz** — coordination, infra, decisions

## hackathon ops

- submission: sun may 17 **12pm PT** via cerebral valley
- 1-min video is the gating artifact (block 11am-12pm sun)
- all work timestamped in this repo during the event
- MIT license
