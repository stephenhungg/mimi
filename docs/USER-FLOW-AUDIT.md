# mimi. — 0→1 user flow audit (live state as of 2026-05-17 03:05 PT)

## ENTRY POINTS

Two URLs in production:
- **landing**: https://landing-3xx196dc4-stephen-hungs-projects-d01c13ef.vercel.app — `apps/landing/` (next.js)
- **3D world**: https://mimi-web-alpha.vercel.app — `apps/web/` (vite + r3f)

These are NOT connected. There's no "click meet mimi → spawn into world" handoff yet. **CRITICAL GAP.**

---

## ACTUAL FLOW A USER EXPERIENCES TODAY

### Path 1 — they hit `mimi-web-alpha.vercel.app` directly

1. **Browser loads `apps/web/src/main.tsx`** → mounts `<App />` into `#root`
2. **`App.tsx` does**:
   - `loadOrCreateIdentity()` — generates a random user id + name, stored in localStorage
   - `useMimiRoom(identity, name)` — kicks off the livekit token fetch + room join
   - mounts a full-screen `<Canvas>` w/ asphalt fog
   - inside Canvas: `<Room localIdentity={identity} />`
   - outside Canvas: `<ChatOverlay />`, `<NPCDialogue />`, `<TrainerCard />`, the HUD
3. **`livekit.ts useMimiRoom()` does**:
   - fetches `VITE_TOKEN_ENDPOINT` (which is `/api/livekit-token` on the landing) → gets a JWT
   - calls `room.connect(LIVEKIT_URL, token)`
   - **WAIT**: this likely fails because vite app doesn't proxy to the landing's `/api/livekit-token` route. `VITE_TOKEN_ENDPOINT` is probably env-undefined on vercel.
   - if it works: registers RoomEvent listeners (peer join/leave, data packet)
   - on data packet: parses the broadcast envelope, updates `peers` Map, triggers re-render
4. **Room.tsx renders**:
   - asphalt fog + warm directional light + the GRAY-BOX hardcoded geometry (floor, walls, desks, monitors, plant blocks)
   - `<PlayerController />` — pointer-lock + WASD
   - `<RemotePeers />` — renders billboards for everyone in the livekit peers Map
   - For each species: if `liveAgentSpecies.has(species)` skip the placeholder, otherwise render a STATIC `<AgentBillboard state="idle" />` at `SPECIES_DESK[species]`
5. **User sees**: gray box room with 5 chibi billboards at the desks. Click to lock cursor. WASD walks. Mouse looks.
6. **User walks up to an agent** → proximity hint appears → press `E` → `NPCDialogue` modal opens
7. **NPCDialogue** sends `POST {VITE_AGENT_BASE_URL}/{species}/dialogue` w/ user message
   - in dev: `VITE_AGENT_BASE_URL=http://localhost:3000/api/agent`
   - in prod: **also probably undefined on vercel** — so it 404s
   - if it works: claude in agent runtime processes, returns dialogue, animalese plays, sprite state flips to working

### Path 2 — they hit landing

- it's the codex-reverse-engineered framer template w/ placeholder content
- no real CTA to the 3D app yet (the "meet mimi" button isn't wired)
- agent router exists at `/api/agent/[species]/dialogue` but isn't reachable from prod 3D unless `VITE_AGENT_BASE_URL` is set
- `/api/livekit-token` exists but vite app doesn't have its url

---

## CRITICAL GAPS (BLOCKING THE DEMO)

### 1. **environment variables on vercel are unset** — the killshot
- `apps/web` needs:
  - `VITE_LIVEKIT_URL` — the wss:// of the livekit cloud project
  - `VITE_TOKEN_ENDPOINT` — full URL to landing's `/api/livekit-token`
  - `VITE_AGENT_BASE_URL` — full URL to landing's `/api/agent`
- `apps/landing` (the api routes) needs:
  - `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET` — for the token mint
  - `AGENT_BASE_URL` — where the agent runtime is hosted
  - `ANTHROPIC_API_KEY` — for claude
- without these, the 3D world loads but multiplayer is dead and agents don't respond. ZERO user-visible interaction.

### 2. **agent runtimes don't run on vercel** (they need stephen's laptop or a separate host)
- `agents/runtime/` is a bun process. needs to live somewhere. options:
  - run on stephen's laptop during demo via ngrok (cheap, works)
  - deploy to railway / fly (15 min setup)
  - rewrite agent runtime as vercel edge functions (4-6 hrs work, not worth it now)

### 3. **3D room is the ugly gray-box version** (rooms.glb was never committed)
- maddy's claude code session updated Room.tsx to reference `/models/rooms.glb` but the glb never landed
- current Room.tsx is back to hand-coded geometry → looks like cardboard
- fix: stephen downloads a glb from sketchfab, drops it in `apps/web/public/models/`, i wire the loader

### 4. **landing → 3D handoff doesn't exist**
- landing has placeholder content from framer template
- "meet mimi" button doesn't link anywhere
- fix: replace landing hero CTA → `href="https://mimi-web-alpha.vercel.app"`

### 5. **no onboarding flow** — user lands in the room with a random anonymized identity
- spec said: pick a chibi human, pick 3 vibe cards, name your squad → drop in
- reality: `loadOrCreateIdentity()` generates "guest-XYZ" silently
- fix: gate the 3D scene behind a 3-step modal that writes to localStorage

### 6. **github webhook is wired but no repo is registered**
- mimi-github-bridge worker has HMAC verify + simulatePush
- but no real repo's webhook URL is set → the killshot demo beat can't actually fire from a real commit
- fix: register github webhook on one of stephen's repos pointed at the worker's URL

### 7. **notion dbs aren't provisioned**
- `scripts/provision-notion-dbs.ts` exists but hasn't run against the workspace
- so events have nowhere to land → kills the "ground truth" framing
- fix: run the script. 30 seconds.

---

## THE ACTUAL FLOW THAT *SHOULD* HAPPEN (the demo beat)

```
1. JUDGE OPENS NOTION
   ↓ workspace page shows live thumbnail (mimi-thumbnail-render worker SVG)
2. CLICK THUMBNAIL
   ↓ link → https://mimi-web-alpha.vercel.app
3. LAND IN THE 3D ROOM
   ↓ first-person camera, cozy office (NEED THE GLB)
4. WALK TO TIGER
   ↓ proximity hint → press E → NPC dialogue overlay opens
5. STEPHEN ON STAGE: pushes real commit to demo repo
   ↓ github webhook fires
   ↓ mimi-github-bridge verifies HMAC → forwards to mimi-events
   ↓ mimi-events writes events db row + POSTs tiger agent /dialogue
   ↓ tiger agent (running on stephen's laptop via ngrok) processes via claude
   ↓ tiger broadcasts state='working' over livekit data channel
6. IN THE ROOM: tiger sprite flips to working state + animalese chirp + speech bubble
   ↓ keyboard-slam animation
   ↓ tiger broadcasts artifact_filed event
7. CUT TO NOTION on projector
   ↓ events db now has a fresh row, dated 2s ago
   ↓ artifacts db has the new PR draft
   ↓ THE GROUND TRUTH IS REAL
```

---

## TOTAL DEMO RISK ASSESSMENT

| risk | severity | mitigation |
|---|---|---|
| livekit + agent endpoints unconfigured on vercel | CRITICAL | set env vars in vercel project, ~10 min |
| agent runtime not deployed anywhere | CRITICAL | run on stephen's laptop + ngrok during demo |
| gray-box room looks bad | HIGH | get glb in place, swap Room.tsx |
| landing→web handoff missing | MEDIUM | add `<a href>` on landing CTA |
| no real onboarding | MEDIUM | quick modal with localStorage, ~30 min |
| github webhook unregistered | HIGH | register webhook on test repo, ~5 min |
| notion dbs not provisioned | HIGH | run the script, 30 sec |
| no demo script written | HIGH | maddy hasn't touched docs/demo-script.md |

## NEXT 4 HOURS PRIORITY ORDER

1. **vercel env vars set** (10 min) — unblocks everything multiplayer + agent
2. **agent runtime on ngrok** (20 min) — unblocks dialogue
3. **notion dbs provisioned** (5 min) — unblocks ground-truth
4. **room.glb in repo + Room.tsx swap** (30 min) — kills "looks shit" issue
5. **github webhook on demo repo** (10 min) — unblocks killshot
6. **landing CTA → web link** (5 min) — single href change
7. **end-to-end test of killshot beat** (30 min) — proves it all works
8. **demo script written** (45 min) — maddy

total estimated: ~2h 30min of focused work to a demo-able state.
