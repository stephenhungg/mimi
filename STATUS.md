# mimi. — build status

Updated: 2026-05-16 17:55 PT, hackathon hour ~7 of 21.

## Wave 0 — Foundation ✅ COMPLETE
- [x] Repo scaffold (apps, agents, workers, packages, design, scripts, docs)
- [x] Bun monorepo workspaces + tsconfig path aliases
- [x] `@mimi/types` — species, voice clusters, broadcasts, notion row shapes, brand constants
- [x] `@mimi/notion-client` — typed wrapper for all 5 dbs
- [x] `@mimi/animalese` — procedural chirp + voice profiles + subtitle callback
- [x] `scripts/provision-notion-dbs.ts` — idempotent db creation
- [x] `.env.example` — full secret inventory
- [x] Sprite assets staged in `apps/web/public/sprites/` (11 states across 5 species + human)
- [x] Next.js landing scaffold (`apps/landing/`)
- [x] Higgsfield brand suite generated (22 assets in `design/generated/`, asphalt+paper locked)
- [x] PROJECT.md + RESEARCH.md + BRAND.md fully synced
- [x] ntn cli installed, authed against workspace `b1cfbde2-...`, template worker deploy verified

## Wave 1 — Core build (IN PROGRESS)

### `workers/`
- [ ] `mimi-events` — replace template, wire `notion-client`, ingest broadcast payloads → dbs
- [ ] `mimi-overnight-pulse` — 30-min sync, agent heartbeat, morning brief drafter
- [ ] `mimi-mcp-server` — expose mimi. as MCP per-room, tools: join/move/speak/pick/write/query_memory
- [ ] `mimi-github-bridge` — github webhook → events db + agent broadcast

### `agents/runtime/`
- [ ] Bun process, claude sonnet 4.6 via anthropic SDK
- [ ] Persona loader (`personas/<species>.json` — tiger, otter, bunny, giraffe, dog)
- [ ] Livekit participant join + position broadcast
- [ ] Tool definitions: `walk_to`, `speak`, `pick_up`, `write_notion`, `query_other_agent`
- [ ] Subscribe to mimi-events webhooks for source-of-truth state

### `apps/web/`
- [ ] R3F scene: first-person camera, WASD walk, cozy office geometry (low-poly placeholder)
- [ ] `AgentBillboard` component — sprite states (idle/working/down), livekit position lerp
- [ ] Livekit room join, data channel sub, audio channel sub
- [ ] In-room text chat overlay
- [ ] Subtitle reveal binding with animalese
- [ ] Profile card (pokemon trainer card UI, color-themed per species, motto strip)
- [ ] Onboarding flow (8 vibe cards → persona vector → squad page)

### `apps/landing/`
- [ ] Hero (wordmark + landing-hero-asphalt + "meet mimi." CTA)
- [ ] Agent roster section (5 cards w/ portrait + motto + watches)
- [ ] What-is-mimi (3 columns: squad / shared workspace / notion-grounded)
- [ ] Demo embed
- [ ] Vercel deploy w/ favicon

### Notion side
- [ ] Run `provision-notion-dbs.ts` against workspace
- [ ] Stage today's brief template page
- [ ] Add github + (optionally) gmail webhook subscribers

## Wave 2 — Demo polish
- [ ] Pre-stage overnight agent activity (real github webhook firing from one of stephen's repos)
- [ ] Demo data fixtures
- [ ] 1-min demo video record (Sun 11am block)
- [ ] Cerebral Valley submission
- [ ] Pitch script + q&a prep

## Blockers / open questions
- None right now — wave 1 can fan out fully in parallel.

## Owners
- **stephen**: workers + agent runtime + r3f scene (heavy lift)
- **maddy**: landing page design via codex extract + framer template + chibi style notes
- **tenz (selfbot)**: coordination, decisions, infra prompts, asset generation, repo hygiene

## Recent decisions log
- Avatar pipeline = 2.5D sprite billboards (locked) — skip Blender MCP
- Brand palette = asphalt #302F2C + paper #EFEDE3 (locked)
- Voice = animalese fresh-write (no elevenlabs, no STT)
- Multiplayer comms = text chat for humans, animalese + subtitles for agents
- Tenancy = 1 notion workspace = 1 mimi. house

## Hard times
- **Sun May 17 12:00 PT — submission deadline (Cerebral Valley)**
- Sun 11:00 PT — final video record block
- Sun 10:00 PT — feature freeze
