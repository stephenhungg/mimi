# mimi. system model

> the canonical pipeline. captured 2026-05-17 mid-build. THIS is the north star —
> if anything in code conflicts with this doc, the doc wins.

## core thesis

> notion is the source of truth.
> ai agents are embodied as persistent customizable coworkers.
> the office is a living spatial interface over your workspace.

## the full pipeline (top → bottom)

### 1. user input

natural language prompt.

> _example:_ `"sleepy raccoon infra engineer with tiny laptop"`

### 2. llm enrichment layer

prompt expanded into a structured canonical avatar/world spec:

```json
{
  "species": "...",
  "personality": "...",
  "outfit": "...",
  "role": "...",
  "palette": "...",
  "motion_style": "...",
  "accessories": "...",
  "room_type": "...",
  "behavior_profile": "..."
}
```

### 3. avatar generation pipeline

1. generate 2D concept sheet
2. convert 2D → rough 3D mesh
3. auto-rig to `mimi_skeleton_v1`
4. apply shared shader/material system
5. generate blendshapes + spring bones
6. run animation compatibility tests
7. export GLB / VRM avatar

### 4. critic / validation ensemble

multiple automated judges verify:

- geometry quality
- rig correctness
- animation deformation
- facial expressions
- style consistency
- runtime performance

failure → targeted repair/regeneration loop.
pass → accepted avatar asset.

### 5. world office runtime

avatar becomes an embodied AI coworker inside the shared office world.

**systems:**
- navigation / pathfinding
- animation state machine
- interaction sockets
- multiplayer sync
- behavior planner

**agent states:**
typing · thinking · walking · meeting · sleeping · celebrating · reviewing PRs · reading calendar · …

### 6. notion synchronization layer

notion is the canonical backend state.

**mappings:**

| notion concept       | world concept            |
|----------------------|--------------------------|
| notion task          | world task               |
| notion page          | object / document        |
| database row         | task card                |
| workspace member     | desk                     |
| AI agent             | embodied coworker        |

**reactivity (both directions):**

- notion update → world reacts
  - task assigned → agent walks to desk → typing animation
- world interaction → notion update
  - agent files PR → artifact row created

### 7. dual visualization system

**A. immersive 3D office** — full spatial workspace, animated avatars, interactive environment.
**B. 2D pixel bird's-eye view** — lightweight dashboard/minimap, real-time agent statuses, room/task visibility, command-center overview.

both views render from the **same normalized world state**.

---

## how this maps to v1 (hackathon ship)

| pipeline stage | v1 implementation | shipped? |
|---|---|---|
| 1. user input             | landing page `/onboard` 4-step flow                                | ✅ |
| 2. llm enrichment         | hard-coded to 5 species (tiger/otter/bunny/dog/giraffe) — no enrichment yet | partial |
| 3. avatar generation      | pre-generated sprite assets via higgsfield (in `design/generated/`) | ✅ (static) |
| 4. critic / validation    | not implemented — pre-validated assets only                         | ❌ (v2) |
| 5. world office runtime   | `apps/web` (r3f + PointerLockControls + WASD + 2.5D sprite billboards) | ✅ |
| 5. agent state machine    | `AgentState = idle / walking / working / talking / down` (`@mimi/types`) | ✅ |
| 5. multiplayer sync       | livekit data channel (10hz pos broadcast) — OPTIONAL in v1          | ✅ (faded) |
| 5. behavior planner       | claude tool-use loop in `agents/runtime` — walk_to / type / speak / file_artifact / curl_up | ✅ |
| 6. notion as canonical    | 5 dbs (residents, events, artifacts, conversations, agent_memory) provisioned + lived in | ✅ |
| 6. notion → world         | mimi-github-bridge → mimi-events → agent /event → claude tool-use → broadcast | ✅ |
| 6. world → notion         | every tool call writes to notion via `@mimi/notion-client`         | ✅ |
| 7A. immersive 3D          | `apps/web` first-person, themed corners per species                 | ✅ |
| 7B. 2D pixel bird's-eye   | `mimi-thumbnail-render` worker renders svg pixel-art of room state, embedded in notion as image block | ✅ |

**both views render from the same normalized world state** — the world state lives in notion (canonical) + the livekit data channel (live broadcast). the 3D client reads broadcasts; the 2D thumbnail reads notion. they agree because both downstream of the same agent tool calls.

---

## what we explicitly defer to v2

- **prompt → species enrichment** (stage 2). v1: pick from 5 fixed species. v2: claude expands "sleepy raccoon infra engineer" → full canonical spec.
- **generative avatar pipeline** (stages 3-4). v1: static higgsfield-generated sprites. v2: 2D→3D mesh + rig + blendshapes + critic ensemble. brand-locked sprite billboards work for the hackathon.
- **animation state machine beyond 5 states**. v1: idle / walking / working / talking / down. v2: meeting, sleeping, celebrating, reading-calendar, reviewing-PRs as distinct states with their own sprites + animations.
- **persistent customizable coworkers**. v1: 5 fixed species, no cross-session persona memory beyond `agent_memory` notion db. v2: vector store of past actions per agent identity, available to claude on each turn.

---

## why we shipped in this order

per the **boil-the-ocean** strategy + the **killshot beat** as north star (1:30-2:00 of the demo):

1. wave 0 — foundation (types, env, notion-client, animalese)
2. wave 1 — visual + agent runtime + workers + token route in parallel (3 subagents)
3. wave 2 — livekit multiplayer + chat + npc dialogue + landing + onboarding
4. wave 3 — preflight, animalese audio wiring, trainer cards, agent router, polish
5. wave 4 — deep audit fixes (resilient broadcaster, bounded notion calls, smoke test)
6. **wave 5 (now)** — angel-grade animalese, livekit faded, real claude tool-use proven end-to-end

at any cutoff from wave 1 onward, the demo could ship.

---

## the demo killshot — per this model

```
1. USER (stephen)
   git push to opal/main  →  github webhook  →  mimi-github-bridge  →  mimi-events  →  agent /event

2. WORLD OFFICE RUNTIME (tiger)
   claude reads event  →  fires 5 tool calls in sequence:
     walk_to(-5,-5)          [behavior planner]
     set_mood("focused")     [facial expression]
     speak("…analyzing…")    [voice + subtitle, voice_cluster=dry]
     type_at_keyboard(3800)  [animation state: working]
     file_artifact(...)      [notion synchronization]

3. NOTION SYNC LAYER
   events db: +1 row (github.push, agent=tiger)
   artifacts db: +1 row (kind=note, createdBy=tiger)

4. DUAL VIZ
   3D office: tiger billboard walks → working state → bubble shows text → idle
   2D thumbnail: tiger sprite repositions to (-5,-5), state=working
   notion page (auto-refresh): new events row visible inline

5. JUDGE
   "holy shit, that was end-to-end in under 2 seconds, AND it's all in notion"
```

every layer of the pipeline is exercised in one ~2-second beat.
