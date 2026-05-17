# mimi.

A cozy 3D agent workspace where humans + chibi animal agents share a room, with Notion as canonical state.

Built for the [Notion Developer Platform Hackathon](https://luma.com/fyuf7), May 16-17 2026.

## What is this

mimi. is a multiplayer, first-person 3D workspace. Each person has a personalized squad of chibi animal agents — tiger (github), otter (email), bunny (calendar), giraffe (meeting notes), mimi. herself (the golden retriever oversight). Users assign agents from their squad to a shared workspace. Notion is the ground truth — every action in the 3D world syncs back as database rows. Notion thumbnails preview the live state. Animal-crossing-coded, asphalt+paper palette, animalese voice.

Full spec: [`PROJECT.md`](./PROJECT.md). Notion platform research: [`RESEARCH.md`](./RESEARCH.md). Brand lock: [`design/BRAND.md`](./design/BRAND.md).

## Repo layout

```
apps/
  web/            → 3D world client (vite + r3f + livekit)
  landing/        → marketing site (vercel deploy)

agents/
  runtime/        → per-agent runtime (node + claude api + livekit participant)
    personas/     → per-species persona configs (tiger, otter, bunny, giraffe, dog)

workers/
  mimi-events/          → webhook target → notion db writes
  mimi-overnight-pulse/ → 30-min sync, keeps agents alive overnight
  mimi-mcp-server/      → exposes mimi. as MCP for external agents
  mimi-github-bridge/   → github webhooks → agent broadcast
  _shared/              → shared worker utilities + types

packages/
  types/          → shared TS types (event payloads, agent schemas, db rows)
  animalese/      → animalese voice synthesis (procedural chirp, char-reveal)
  notion-client/  → typed wrapper over notion api

design/
  generated/      → higgsfield-generated brand assets
  assets/         → finalized assets used by apps
  prompts/        → prompt log per asset
  BRAND.md        → palette + mascot + line treatment lock

scripts/          → dev tooling (provision dbs, seed fixtures, etc)
docs/             → architecture deep-dives, decisions, demo prep
.github/workflows → CI

PROJECT.md        → full product + technical spec
RESEARCH.md       → notion dev platform research findings
```

## Quick start

```bash
# install (top-level uses bun for workspace orchestration; workers use npm via ntn)
bun install

# scaffold notion dbs in the workspace
bun scripts/provision-notion-dbs.ts

# deploy a worker
cd workers/mimi-events && ntn workers deploy --name mimi-events

# run the web client
bun --cwd apps/web dev

# run the landing page
bun --cwd apps/landing dev

# run an agent runtime locally (e.g. tiger / github)
bun --cwd agents/runtime dev -- --persona tiger
```

## Stack

- **3D client**: vite + react + r3f + drei + livekit-client
- **Multiplayer transport**: livekit cloud (positions + chat via data channel; voice on audio channel — humans only in v1)
- **Agent runtime**: node + bun + anthropic SDK (claude sonnet 4.6)
- **Voice**: animalese (procedural, no TTS service)
- **Workers**: `@notionhq/workers` deployed via `ntn`
- **Notion db**: 5 tables — residents, events, artifacts, conversations, agent_memory
- **Landing page**: next.js or vite + react, deployed to vercel

## Team

- stephen — runtime + workers + 3D client
- maddy — design, room aesthetic, demo narrative, on-stage presence
- tenz — coordination, infra, decisions

## Hackathon notes

- Submission deadline: Sun May 17 12pm PT via Cerebral Valley
- 1-min demo video is the gating artifact
- All work timestamped during the event in this repo
- Open source under MIT
