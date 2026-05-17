# delta: shipped vs. PROJECT.md spec

Updated: 2026-05-16 18:48 PT, hour ~10 of 21.

## ✅ shipped matches spec

### Foundation
- bun monorepo workspaces ✓
- `@mimi/types`, `@mimi/notion-client`, `@mimi/animalese` packages ✓
- `.env.example` ✓
- 5 notion db schemas via `provision-notion-dbs.ts` ✓

### Brand
- asphalt+paper palette locked ✓
- 22 brand assets in `design/generated/` ✓
- BRAND.md committed ✓
- chibi sprites for tiger/otter/bunny/giraffe/dog (idle + down + tiger working) ✓
- human chibi base ✓

### Workers (6 — one MORE than spec)
- ✓ `mimi-events` — central event ingestion + fan-out
- ✓ `mimi-github-bridge` — HMAC-verified github webhook
- ✓ `mimi-overnight-pulse` — 30-min pacing
- ✓ `mimi-mcp-server` — MCP surface (list_residents, recent_events, summon_agent, read_agent_memory, append_event, health)
- ✓ `mimi-thumbnail-render` — live SVG of room for notion thumbnail (NEW vs spec — good addition)
- ✓ `mimi-notion-agents` — wraps notion-agents-sdk-js (SPONSOR FLEX — NEW vs spec, good addition)

### Agent runtime
- ✓ bun + anthropic SDK + claude sonnet 4.6 tool-use loop
- ✓ all 5 personas (tiger, otter, bunny, giraffe, dog) with .md system prompts
- ✓ tool definitions: speak, walk_to, pick_up, write_notion, query_other_agent
- ✓ livekit-server-sdk broadcaster (RoomServiceClient.sendData)
- ✓ `/dialogue` endpoint per species
- ✓ `curl_up()` failure handler (broadcast state='down', mimi walks over)

### 3D client (apps/web)
- ✓ vite + r3f + drei + livekit-client
- ✓ first-person camera, WASD walk, pointer-lock
- ✓ AgentBillboard with sprite states (idle/working/down)
- ✓ livekit position broadcast at ~10hz
- ✓ in-room text chat overlay
- ✓ NPC dialogue mode when near agent
- ✓ subtitle reveal with animalese chirp
- ✓ Pokemon trainer card profile (color-themed per species, motto, bars)
- ✓ NEW: livekit multiplayer (humans see each other)

### Landing (apps/landing)
- ✓ next.js 15 scaffold
- ✓ `/api/livekit-token` route
- ✓ `/api/agent` router (fans out by species port)
- ✓ onboarding flow scaffolded
- ⚠️ still placeholder framer assets — needs swap to asphalt brand suite

### Demo + ops
- ✓ `docs/DEMO-RUNBOOK.md` (pre-flight, launch order, fallbacks)
- ✓ `docs/ARCHITECTURE.md`
- ✓ `docs/NOTION-PAGE-SETUP.md`
- ✓ `docs/SUBMISSION.md` (copy-paste ready)
- ✓ `scripts/check-env.ts` (preflight)
- ✓ `scripts/seed-demo.ts` (lived-in state)
- ✓ `scripts/poke-agent.ts` (fire fake github push)
- ✓ `scripts/smoke-test.sh`
- ✓ `tasks/lessons.md` (self-improvement log per CLAUDE.md rule)

## ⚠️ diffs from spec

### Architecture additions (good — keep)
- **mimi-thumbnail-render worker** — not in v1 spec but matches the "live svg in notion" two-layer vision. judges scroll notion and see it pulse.
- **mimi-notion-agents worker** — wraps notion-agents-sdk-js. SPONSOR FLEX move. judges (Brian Lovin / Cole Bemis from Notion product) see we used the new sdk.
- **agent router on landing** — better than direct ports, lets vercel proxy + cors-friendly
- **Trainer Card click** — promotes profile card from "static modal" to "click chibi → card slides in." better UX.

### Architecture deltas (think about)
- workers can't import `@mimi/types` directly (notion runtime ≠ node) → duplicated in `workers/_shared/src/mimi.ts` with a "keep in sync" note. ACCEPTABLE — flagged in workers/README.md. fix post-hackathon.
- agent runtime ports hardcoded (tiger=8081, otter=8082, bunny=8083, dog=8084). spec implied dynamic. fine for hackathon.
- multiplayer voice is text-only per spec ✓. no voice between humans. agents speak in animalese ✓.

### Visual delta (CRITICAL)
- the 3D room was originally hand-coded boxGeometry primitives (gray cardboard look) — looked like shit
- mid-session pivot: maddy downloaded brynn's sketchfab "low-poly isometric rooms" glb
- claude code on her laptop swapped Room.tsx to `useGLTF("/models/rooms.glb")`
- rooms.glb is in `apps/web/public/models/` now, awaiting vercel rebuild → check https://mimi-web-alpha.vercel.app
- the 5 agents are placed in a 2.5m-radius circle around origin (claude code's default placement) — may need to be tuned to match the room's actual layout once we know its scale + structure. PUNCH LIST.

## ❌ still missing (priority order)

### Demo blockers
1. **vercel rebuild check** — verify the rooms.glb pivot deployed. if rooms aren't visible after refresh, scale issue → debug.
2. **agent placement inside the glb** — once room loads, tune positions so each species is at the right "themed corner" of brynn's rooms model
3. **landing page brand swap** — currently still placeholder, needs the asphalt+paper hero + agent roster + cta pill ported in
4. **landing page CONTENT** — codex was reverse-engineering framer template, content needs to match mimi.'s actual story
5. **the killshot demo beat** — push real commit → tiger reacts in 3D → notion db row appears live. need to wire it E2E.

### Sponsor / cred wins (nice-to-have)
6. notion thumbnail embedded as an iframe in an actual notion page (proves the "two-layer dashboard" vision)
7. mcp-server tools tested end-to-end (claude code / cursor connect, call summon_agent)
8. overnight-pulse scheduler hooked up (cron-job.org or gh actions)
9. github webhook live (so the live commit demo beat fires from a REAL repo)

### Demo-day prep
10. record 1-min video (block 11am sun)
11. seed demo state with `seed-demo.ts` before recording
12. cerebral valley submission (sun 12pm)
13. maddy's demo script committed (still not in `docs/demo-script.md`)
14. maddy's persona prompt edits (she hasn't touched `personas/*.md`)

## state summary

**spec coverage: ~80% of v1 architecture shipped.**

what's working: foundations, all 6 workers (1 more than planned), agent runtime, 3D scene scaffold w/ sketchfab pivot in flight, landing skeleton, full docs.

what's NOT working yet: vercel might be rebuilding right now (rooms.glb pivot), landing still placeholder, demo killshot not wired end-to-end, maddy's narrative + persona edits untouched.

**estimated hours to demo-ready: ~6-8 more hours of code + ~2 hours of polish + recording.** on pace.
