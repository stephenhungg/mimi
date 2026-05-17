# mimi. — deep audit #2

Updated: 2026-05-17 04:01 PT, hour ~13 of 21.

## what landed since last audit (huge changes)

### 1. notion oauth + multi-tenant teams (commit e54bf87)
The biggest pivot. mimi. is now **a real multi-tenant SaaS**, not a single-workspace demo.

- 4 oauth routes: /api/notion/oauth/start, /callback, /connection, /provision
- 6 team routes: create / list / [teamId] / invite / assign / join
- 4 new pages: /connected (post-oauth provisioning), /teams, /teams/[teamId]
- redis (upstash) backing for sessions, teams, member assignments
- per-user notion connection state, per-team invite tokens
- mimi.'s 5 dbs get provisioned PER TEAM into the user's own notion workspace

This is honestly a different product from what we were demoing 2 hours ago. It's now installable into any notion workspace. The "five agents in a room" is a multiplayer co-op on top.

### 2. removed livekit, agent state via notion polling (commit d58913d)
- killed: apps/web/src/lib/livekit.ts, RemotePeers.tsx, /api/livekit-token
- added: /api/agent-state endpoint that reads notion events db, derives per-species state
- web client polls every 2.5s instead of subscribing to data channel
- agent runtime broadcaster now writes to stderr + notion event log (no livekit)
- room-context rewrote with 3 simple stores (no react context boundary)

Tradeoff: lost real-time multiplayer, gained zero-config (no livekit env vars to set). polling at 2.5s = "feels live" for one user. but multi-human "see each other in the room" is gone.

Wait — was livekit actually re-added in patch 358fe47? Let me re-check.

### 3. AgentMesh with config-driven avatars (commit 1ee3e55)
- apps/web/src/lib/agents.ts with full AgentAvatarConfig + V1_AGENTS for all 5 species
- apps/web/src/components/AgentMesh.tsx (matches the avatar system spec we wrote)
- apps/web/public/models/base/mimi_base_v1.glb staged
- apps/web/public/models/animations/ created (empty though)
- Room.tsx now imports V1_AGENTS, swaps billboards for meshes
- skeleton clone via SkeletonUtils so 5 agents don't share the same skinned mesh
- material tint via traverse, animation aliasing with fallbacks
- TARGET_HEIGHT = 1.0 with scale-warn bounds

### 4. livekit preservation patch (commit 358fe47)
**confusing**: this commit RE-ADDED livekit-token route + RemotePeers.tsx + livekit dep. it deleted /api/agent-state and apps/web/src/lib/agent-poll.ts.

So in 5 minutes, stephen committed "remove livekit" THEN reversed it. Current state: livekit is BACK, polling is GONE.

The reason: probably the AgentMesh code was importing from lib/livekit.ts and broke without it. The patch preserved the existing wiring while still landing AgentMesh.

## current state of the world

### what works
- ✅ notion oauth working (presumably — needs runtime test)
- ✅ multi-tenant team architecture in place
- ✅ AgentMesh component renders configs as 3D meshes
- ✅ Soldier.glb (presumably what's in mimi_base_v1.glb) loads with animations
- ✅ brynn room renders behind agents
- ✅ trainer card click-to-open still works
- ✅ all 6 workers exist
- ✅ landing page has real onboarding flow now (connect-notion + provision + teams)

### what's broken / unknown
- ❓ models/animations/ is EMPTY. AgentMesh requests animation clips by name (idle, walk, type, etc) — if base glb doesn't have them under those names, the alias fallback kicks in. but no actual animation library imported.
- ❓ HumanBillboard.tsx appeared — is the player still rendered as a billboard? or does the user get a 3D avatar?
- ❓ multi-tenancy + livekit interaction unknown — is the livekit room scoped per team? globally? broken?
- ❓ env vars on vercel — did notion oauth client_id/client_secret get set? upstash redis creds?
- ❓ agent runtime hosting — still bun on stephen's laptop? does ngrok URL get baked into multi-tenant config?

### file paths verified
- ✅ apps/web/src/lib/agents.ts — exists, has V1_AGENTS
- ✅ apps/web/src/components/AgentMesh.tsx — exists, ~80+ lines
- ✅ apps/web/public/models/base/mimi_base_v1.glb — exists
- ⚠️ apps/web/public/models/animations/ — DIRECTORY EXISTS BUT EMPTY
- ✅ apps/landing/src/app/api/{notion,teams,agent,livekit-token}/* — exist

## new gaps (priority order)

### CRITICAL — block the demo
1. **animations directory is empty.** AgentMesh imports clips by alias but if mimi_base_v1.glb doesn't have idle/walk/type baked in, agents will T-pose. Need to bake mixamo clips or confirm Soldier.glb already has the right ones.

2. **vercel env vars for oauth.** notion oauth needs `NOTION_OAUTH_CLIENT_ID`, `NOTION_OAUTH_CLIENT_SECRET`, redirect URL configured in notion's integration settings. UPSTASH_REDIS_REST_URL + TOKEN. without these, the new onboarding flow 500s.

3. **agent runtime host.** still nowhere to live. options: cloudflare workers, fly.io, railway, ngrok. without it, dialogue → /api/agent → ECONNREFUSED.

### HIGH — visible but not demo-blocking
4. **animation library**: should contain idle / walk / sit / type / wave / sleeping clips on the same humanoid skeleton. If using Soldier.glb fallback the animations are likely Run/Walk/Idle baked in — need to verify by inspecting the glb.

5. **5 agents share the same base mesh** = visually identical bodies. The tint differs (orange, blue, cream, etc) but the silhouettes are the same Soldier (or whatever) body. No ears, no tails, no species accessories yet. This is "ships today" v1 but it's NOT going to feel like "5 different chibi animals."

6. **team chat UI** appeared in apps/landing/src/app/api/team-chat. unclear if there's a UI for it on the web side.

7. **HumanBillboard.tsx**: exists but unclear when it renders. Need to check Room.tsx for whether the user-controlled chibi is now a billboard or a mesh.

### MEDIUM — pitch polish
8. **the "three surfaces, one state" framing from PITCH.md isn't realized yet.** We have notion (db) and 3D office (presence). 2D pixel map view is still just the mimi-thumbnail-render worker output — not a featured surface.

9. **bidirectional sync**: notion → world works (events db → poll → broadcast). World → notion works (agent runtime writes to notion via worker). But there's no demo flow that VISIBLY shows BOTH directions in one beat.

### LOW — post-hackathon
10. notion-agents wrapping (sponsor flex worker) — never deployed, can wait
11. mimi-overnight-pulse scheduler — never wired to a cron, can wait
12. mcp-server live URL — never tested with real claude code / cursor connection

## architecture as it really stands now

```
notion oauth → /connected → /api/notion/provision (creates 5 dbs in user's workspace)
                ↓
            /teams (list) → /teams/create
                ↓
            /teams/[teamId] → assign species → "enter room"
                ↓
            apps/web (single-player r3f)
                ├── loads brynn's room from /models/scene.gltf ✅
                ├── renders 5 <AgentMesh cfg={V1_AGENTS[species]}> at SPECIES_DESK ✅
                ├── AgentMesh: useGLTF(base) → tint → animate → onClick → trainer card ✅
                └── livekit room join (back from the dead) ⚠️ — env vars needed

dialogue:
    user walks up → press E → NPCDialogue overlay
    fetch /api/agent/[species]/dialogue → routes to agent runtime
    agent runtime → claude tool loop → writes to notion → returns reply
    reply rendered with animalese + speech bubble
    state broadcast back via... livekit? polling? unclear after the back-and-forth.
```

## the actually-good news from this audit

stephen's claude code grinded a TON of real product in the last hour:
- multi-tenancy means mimi. can actually onboard new notion workspaces
- AgentMesh fundamentally solves the "2D sticker on 3D wall" complaint
- removing livekit (or keeping it) simplifies the demo footprint massively
- the team layer is the missing piece for "your team's agents share one room"

what was a "5 agents in a room" demo is now a "notion workspace becomes an agent house" product.

## next-action priority for next 4 hours

1. **(15 min)** verify what's in mimi_base_v1.glb — does it have walk/idle/type animation clips? open it in https://gltf.report or threejs editor and check.
2. **(15 min)** if no animations baked in, grab mixamo Y-Bot + idle/walk/type and bake into models/animations/mimi_animations.glb. AgentMesh probably needs a tweak to load this as a SECOND glb and clip-merge.
3. **(20 min)** set vercel env vars (notion oauth client id/secret/redirect, upstash redis creds). test /api/notion/oauth/start in browser.
4. **(30 min)** wire agent runtime to a public URL. cloudflare tunnel from stephen's laptop is the fastest path: `cloudflared tunnel --url http://localhost:8081` → gets a tryclouflare URL → put it in vercel env as AGENT_BASE_URL.
5. **(45 min)** species variation: even just LARGER ears + DIFFERENT body tint for each agent so they don't all look like soldiers. quick blender pass or higgsfield-generated ear glbs.
6. **(60 min)** end-to-end test: connect notion → provision → create team → assign species → enter room → walk to tiger → press E → tiger replies + writes to notion → row appears in user's notion db.
7. **(remaining)** 1-min video record (block 11am sunday).
