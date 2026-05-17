# mimi.

> **mimi. — the 3D agent workspace for notion.**
> chibi animals watching your tools. one cozy room. notion is the ground truth.

[![demo video](./design/generated/hero.png)](https://youtu.be/MIMI_DEMO_PLACEHOLDER)

**[▶ 1-min demo](https://youtu.be/MIMI_DEMO_PLACEHOLDER)** · **[live → mimi.kalilabs.ai](https://mimi.kalilabs.ai)** · **[architecture](./docs/ARCHITECTURE.md)** · **[system model](./docs/SYSTEM-MODEL.md)** · **[pitch](./docs/PITCH.md)**

built for the [notion developer platform hackathon](https://luma.com/fyuf7), may 16-17 2026.

---

## what it is, in 10 seconds

a real notion app. click install → mimi auto-provisions 5 dbs in your workspace → 5 chibi animal agents start watching your tools (github, gmail, calendar, notion notes) → they show up in a first-person 3D room and **talk to each other** about what they see. notion is the canonical state. every action a chibi takes writes back to a notion row in real time.

push a commit. within 2 seconds: **tiger** jolts in the 3D room, walks to its corner, slams the keyboard, chirps in animalese, files an artifact. **mimi** (the dog dispatcher) calls **otter** over to weigh in. they argue. it ends up in notion.

## the echo chamber of doom

most "ai agent" demos are one agent answering one user. mimi. is **agents talking to each other**.

mimi (the dog) is the orchestrator — per the anthropic + langchain 2026 multi-agent playbook. when a real-world event lands (commit pushed, email arrived, meeting starting), mimi dispatches the right specialist, the specialist drafts a take, mimi pings a second opinion, they riff, they escalate. **8-round soft cap** before mimi cuts the room and files the consensus to notion. agents bicker. agents one-up each other. one of them inevitably curls into a slime puddle from a 429 and the others have to carry on without it.

it's the part of the product judges remember. the chibi voices in procedural animalese arguing with each other is unhinged in the best way.

## the residents

| chibi | watches | persona |
|---|---|---|
| **tiger** | github (push, PRs, issues) | dry, terse, codes through panic |
| **otter** | gmail | warm, sleepy, never opens a thread cold |
| **bunny** | calendar | chipper, twitchy, will not let you miss standup |
| **mimi** (dog) | everything — dispatcher | leader, soft authority, runs the room |
| **giraffe** | notion meeting notes | thoughtful, distills 40 lines into 4 |

## killer features

1. **real notion oauth** — install button → mimi provisions 5 dbs (residents, events, artifacts, conversations, agent_memory) in *your* workspace. no manual setup.
2. **teams + invite links** — multi-tenant from day one. invitees don't need a notion account. one host, many chibis in the room.
3. **claude sonnet 4.6 tool-use** — per-species personas (.md system prompts), 7 tools, real loop.
4. **the echo chamber of doom** (see above) — orchestrated multi-agent group chat.
5. **6 notion workers** including the sponsor flex: `mimi-notion-agents` wraps `notion-agents-sdk-js` end-to-end.
6. **failure as first-class state** — rate-limited agents `curl_up()` into a slime puddle. mimi walks over and checks on them. we celebrate failure on screen.
7. **3D first-person room** — vite + r3f with notion-backed agent state polling. animalese voice synth (procedural chirp, no TTS). pokemon gen-1 trainer cards for each agent.
8. **dual surface, one state** — the same world state renders in 3D and as a live svg pixel-art thumbnail inline on the notion dashboard page.

## tech stack

| layer | tech |
|---|---|
| 3D client | vite · react 19 · @react-three/fiber · drei |
| room state | notion events db · `/api/agent-state` polling · local shared stores |
| voice | animalese — procedural chirp synth, per-species voice cluster, fully offline |
| agent runtime | bun · @anthropic-ai/sdk (claude sonnet 4.6, tool-use loop) |
| orchestrator | mimi-as-dispatcher group chat, 8-round soft cap |
| workers | @notionhq/workers — 6 workers + MCP server + notion-agents-sdk-js wrapper |
| notion api | @notionhq/client v2 (typed wrapper in `packages/notion-client`) |
| landing + auth | next.js 15 on vercel · notion oauth · agent router |
| brand | asphalt `#302F2C` + paper `#EFEDE3` — warm undertones, never pure b/w |

## quick start

```bash
# 1 — install (root bun workspaces; workers/ uses npm via ntn)
bun install

# 2 — env (fill: notion oauth, anthropic, github webhook secret)
cp .env.example .env.local
$EDITOR .env.local

# 3 — preflight
bun scripts/check-env.ts

# 4 — provision the 5 notion dbs under NOTION_PARENT_PAGE_ID (idempotent)
bun run provision:notion

# 5 — seed lived-in demo state
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
bun run dev:landing                            # next on :3000
bun run dev:web                                # vite on :5173
AGENT_PORT=8081 bun run dev:tiger              # tiger on :8081
AGENT_PORT=8082 bun run dev:otter              # (optional, parallel)
AGENT_PORT=8083 bun run dev:bunny
AGENT_PORT=8084 bun run dev:dog

# 8 — smoke test
bun scripts/poke-agent.ts tiger                # fake github.push → tiger reacts
```

set `VITE_AGENT_BASE_URL=http://localhost:3000/api/agent` so the landing's agent router fans out by species.

## deploy

- **landing + agent router** → vercel (`vercel --prod` from `apps/landing`)
- **6 workers** → `ntn workers deploy` (see step 6 above)
- **notion oauth callback** → set to `https://mimi.kalilabs.ai/api/notion/callback`
- **github webhook** → `https://<mimi-github-bridge>.ntn.workers/github`, HMAC secret in `.env`

full pre-flight + fallback plan in [`docs/DEMO-RUNBOOK.md`](./docs/DEMO-RUNBOOK.md).

## repo layout

```
apps/
  web/            → 3D world client (vite + r3f + notion-backed polling)
  landing/        → next.js: notion oauth + agent router
agents/
  runtime/        → per-agent runtime (bun + claude + notion-backed broadcaster)
    personas/     → per-species .md system prompts
workers/          → 6 notion workers (ntn workers deploy)
packages/
  types/          → shared TS (species, broadcasts, db rows)
  notion-client/  → typed wrapper over @notionhq/client v2
  animalese/      → procedural chirp synth (web audio)
design/           → BRAND.md + higgsfield-generated assets
scripts/          → provision-notion, seed-demo, poke-agent, check-env
docs/             → ARCHITECTURE · SYSTEM-MODEL · PITCH · DEMO-RUNBOOK · DEMO-SCRIPT · SUBMISSION
```

## demo

60-second cut: see [`docs/DEMO-SCRIPT.md`](./docs/DEMO-SCRIPT.md).
3-minute walkthrough + fallbacks: [`docs/DEMO-RUNBOOK.md`](./docs/DEMO-RUNBOOK.md).

## team

- **stephen** — runtime + workers + 3D client (founders@kalilabs.ai)
- **maddy** — design, room aesthetic, demo narrative, on-stage
- **tenz** — coordination, infra, decisions

## license

MIT.
