# mimi. — build status

Updated: 2026-05-16 18:05 PT, hackathon hour ~7.5 of 21.

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

## Wave 1 — Core build (IN PROGRESS — major shipping in parallel)

### `workers/` — 5 workers now (added mimi-thumbnail-render)
- [x] `mimi-events` — real worker w/ POST /event webhook, tools (appendEvent, routeToAgent, health)
- [x] `mimi-github-bridge` — github webhook w/ HMAC verify, simulatePush tool
- [x] `mimi-overnight-pulse` — 30-min pulse scheduler, triggerPulse tool
- [x] `mimi-thumbnail-render` — SVG renderer for notion thumbnail (NEW worker added)
- [x] `mimi-mcp-server` — MCP surface w/ list_residents, recent_events, summon_agent, read_agent_memory, append_event
- [x] `_shared/src/mimi.ts` — inlined types until workspace/npm interop sorted
- [ ] Deploy all 5 via ntn
- [ ] Wire env vars (NOTION_TOKEN, NOTION_DB_*, GITHUB_WEBHOOK_SECRET, AGENT_BASE_URL)

### `agents/runtime/`
- [x] `package.json`, `tsconfig.json`
- [x] All 5 persona files (tiger, otter, bunny, giraffe, dog) — .ts config + .md system prompts
- [x] `personas/index.ts` PersonaConfig type
- [x] `src/main.ts` + `src/runtime.ts` (claude loop entry)
- [ ] Wire anthropic SDK + tool definitions (walk_to, speak, pick_up, write_notion, query_other_agent)
- [ ] Livekit-server-sdk participant join + position broadcast
- [ ] Subscribe to mimi-events POST callbacks

### `apps/web/`
- [x] vite config, tsconfig, package.json
- [x] R3F scene: first-person camera, fog matched to asphalt, lighting (Room.tsx)
- [x] `AgentBillboard` component — sprite states wired
- [x] `PlayerController` — WASD + pointer-lock mouse look
- [x] `NameTag` + `SpeechBubble` components
- [x] Sprite library wired (lib/sprites.ts)
- [x] HUD overlay (wordmark, crosshair, hint text)
- [ ] Livekit room join + data channel sub
- [ ] In-room text chat overlay
- [ ] Subtitle reveal binding with animalese
- [ ] Profile card (pokemon trainer card UI)
- [ ] Onboarding flow

### `apps/landing/`
- [x] Next.js scaffold, tailwind config, tsconfig
- [x] `/api/livekit-token` route
- [x] First reverse-engineering pass from `agents.framer.website` template
- [ ] Swap framer placeholder assets for asphalt+paper brand assets
- [ ] Agent roster section
- [ ] What-is-mimi columns
- [ ] Demo embed
- [ ] Vercel deploy

### Notion side
- [x] `scripts/provision-notion-dbs.ts` written
- [x] `scripts/seed-demo.ts` written
- [ ] Run provision against workspace `b1cfbde2-...`
- [ ] Stage today's brief template page
- [ ] Add github webhook subscriber

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
