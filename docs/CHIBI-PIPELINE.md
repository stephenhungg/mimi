# mimi. — 3D Chibi Avatar Pipeline Spec

The pipeline that turns a natural-language prompt + persona vector → a customized, rigged, animated chibi avatar that can be embodied in the 3D office.

Last updated: 2026-05-17 03:33 PT

---

## 0. Goal

Given a user describing the agent they want ("sleepy raccoon infra engineer with tiny laptop"), produce a deployable .glb that:
- Drops into the r3f scene at species-desk position
- Is rigged to the shared `mimi_skeleton_v1` so existing animations apply
- Carries persona metadata (species, mood, role, palette, accessories)
- Renders consistently in the 3D world AND the 2D pixel bird's-eye view

Two paths supported:
- **path A — TEMPLATE** (hackathon-fast): pick from preset species, customize palette/accessories. <30s per agent.
- **path B — GENERATIVE** (v2, post-hackathon): full text-to-3d via Tripo/Meshy. 60-180s, occasional manual cleanup.

For hackathon: ship path A. Path B spec is here for credibility + roadmap.

---

## 1. Input: persona vector

The user-facing prompt: free-form natural language ("sleepy raccoon infra engineer").

LLM enrichment (Claude Haiku 4.5, ~200ms) expands → structured spec:

```typescript
interface PersonaSpec {
  // identity
  name: string;                     // "Mimi" | user-provided
  species: Species;                 // tiger | otter | bunny | giraffe | dog | (v2: any animal)
  role: string;                     // "GitHub agent"
  motto: string;                    // "tests are sacred"

  // visual
  palette: {
    base: string;                   // primary fur/skin (#hex)
    accent: string;                 // accessories (#hex)
    eyes: string;                   // eye color (#hex)
  };
  outfit: "hoodie" | "tie" | "casual" | "lab_coat" | "scarf";
  accessories: Accessory[];         // "laptop" | "envelope" | "carrot_pen" | "notepad" | "bowtie"

  // behavior
  personality: PersonalityTraits;   // warmth, edge, playfulness 0-1
  voice_cluster: VoiceCluster;      // "dry" | "warm" | "chipper" | "thoughtful" | "earnest"
  motion_style: "calm" | "bouncy" | "stiff" | "fluid";
  watched_source: "github" | "gmail" | "calendar" | "meeting_notes" | "oversight";
  default_room: RoomId;             // which themed corner in the office
}
```

Persona vectors get persisted to `agent_memory` notion db + the `residents` row.

---

## 2. The shared rig: `mimi_skeleton_v1`

Locked humanoid-ish rig that every chibi (regardless of species) maps to.

**Bones (15 total):**
- root → spine → head
- shoulder.L → upper_arm.L → forearm.L → hand.L
- shoulder.R → upper_arm.R → forearm.R → hand.R
- hip.L → upper_leg.L → lower_leg.L → foot.L
- hip.R → upper_leg.R → lower_leg.R → foot.R

**Why this matters:** ALL animations (idle bob, walk, keyboard slam, sit, curled-up puddle) are made ONCE for this skeleton. Every avatar plays them.

**Species-specific add-ons (non-rigged decorative meshes parented to head bone):**
- tiger: stripes mesh + ears
- otter: tail + ears
- bunny: long ears
- giraffe: long neck extension (replaces default neck mesh)
- dog: floppy ears + tail

---

## 3. Path A — TEMPLATE PIPELINE (hackathon, ships today)

```
PERSONA SPEC
  ↓
LOAD BASE GLB
  apps/web/public/models/agents/<species>.glb
  (pre-rigged to mimi_skeleton_v1, neutral palette)
  ↓
APPLY MATERIAL OVERRIDE
  three.js: scene.traverse() → for each mesh
    .material.color = persona.palette.base
    if mesh.name === "Eyes" → color = palette.eyes
    if mesh.name === "Accent" → color = palette.accent
  ↓
ATTACH ACCESSORY MESHES
  for each accessory in persona.accessories:
    load /models/accessories/<accessory>.glb
    parent to corresponding bone (hand.L for laptop, head for hat, etc)
  ↓
ATTACH STATE MACHINE
  Three.js AnimationMixer with clips:
    "idle", "walk", "typing", "sitting", "curled_up", "celebrate"
  ↓
ASSIGN PERSONA METADATA
  set userData = { species, name, motto, persona_id, voice_cluster }
  ↓
INSERT INTO SCENE
  at SPECIES_DESK[species] coordinates
  RemotePeers / AgentBillboard renders it
```

**Time: 200ms per avatar end-to-end.** Realistic for spawning all 5 species at scene load.

### Files needed (next 90 min):
- `apps/web/public/models/agents/tiger.glb` (rigged to mimi_skeleton_v1)
- `apps/web/public/models/agents/otter.glb`
- `apps/web/public/models/agents/bunny.glb`
- `apps/web/public/models/agents/giraffe.glb`
- `apps/web/public/models/agents/dog.glb`
- `apps/web/public/models/accessories/laptop.glb`
- `apps/web/public/models/accessories/envelope.glb`
- `apps/web/public/models/accessories/carrot_pen.glb`
- `apps/web/public/models/accessories/notepad.glb`
- `apps/web/public/models/accessories/bowtie.glb`
- `apps/web/public/models/animations/mimi_animations.glb` (animation clips on mimi_skeleton_v1)

**Cheapest acquisition path:** quaternius "Ultimate Animated Animal Pack" — already CC0, already rigged, already animated, 38 species. Pick 5 that match ours, rename, ship.

---

## 4. Path B — GENERATIVE PIPELINE (v2, post-hackathon)

For the "completely custom agent from a prompt" claim. Real flow:

```
USER PROMPT
  "sleepy raccoon infra engineer with tiny laptop"
  ↓
LLM ENRICHMENT (Claude Haiku, ~200ms)
  → PersonaSpec
  ↓
2D CONCEPT SHEET GENERATION (Higgsfield / Nano Banana, ~10s)
  Generate a 3-view chibi sheet (front, side, 3/4):
  "chibi <species>, animal crossing villager style, asphalt+paper palette,
   thick black outlines, soft pastel fills, <outfit>, holding <accessory>"
  ↓
2D → 3D MESH (Tripo AI image-to-3D, 60-120s)
  Upload concept sheet → get rigged mesh
  Request: humanoid skeleton, T-pose, ~5k tris
  ↓
RIG RETARGETING (Blender automation via Python, ~5s)
  Snap Tripo's output skeleton to mimi_skeleton_v1
  Weight-paint cleanup
  ↓
SHARED SHADER APPLICATION
  Cel-shaded toon material with brand outline (asphalt #302F2C)
  ↓
BLENDSHAPE GENERATION (optional, for facial expressions)
  Blender shape keys: smile, frown, surprised, dizzy, sleepy
  ↓
SPRING BONES (for tail, ears, scarves)
  Auto-tag any "tail", "ear", "scarf" bones for jiggle physics
  ↓
ANIMATION COMPAT TEST
  Auto-play all 6 base animations, check for clipping/seam breaks
  ↓
CRITIC ENSEMBLE (multi-judge validation)
  Geometry: are tris < 10k? holes? non-manifold edges?
  Rig: do all 15 bones have weights? is hierarchy correct?
  Animation: does it deform cleanly through all 6 clips?
  Style: does CLIP score it as "chibi animal crossing villager"?
  Performance: file < 2MB? draw calls < 5?

  IF FAIL → targeted repair loop (max 3 retries)
  IF PASS → ship
  ↓
EXPORT
  apps/web/public/models/agents/custom/<agent_id>.glb
  ↓
PERSONA METADATA WRITE
  notion residents db row, agent_memory page seeded
```

**Cost per generation:** ~$0.50 (Tripo $0.30 + Higgsfield $0.05 + Claude tokens $0.10).
**Time:** 60-180s per agent depending on Tripo queue.
**Acceptance rate:** ~70% on first try, ~95% with one repair loop.

---

## 5. Where this fits in the bigger system

```
USER → "make me a raccoon agent" → onboarding flow
                                        ↓
                                 PERSONA ENRICHMENT
                                        ↓
                  ┌─────────────────────┴─────────────────────┐
                  ▼                                           ▼
           PATH A (template)                          PATH B (generative, v2)
           apply palette override                    full text-to-3d
           attach accessories                        + critic loop
                  │                                           │
                  └──────────────────────┬────────────────────┘
                                         ▼
                                  RIGGED GLB ON DISK
                                         ▼
                              ┌──────────┴───────────┐
                              ▼                      ▼
                         3D OFFICE                 2D PIXEL MAP
                         (presence)                (command center)
                         AgentBillboard            top-down sprite render
                                         │
                                         ▼
                                    NOTION RESIDENTS DB
                                    persona spec + asset url
```

---

## 6. Hackathon decisions locked

| decision | value | reason |
|---|---|---|
| Path | A (template) for v1 | ships in 90 min vs 6+ hours for path B |
| Animation source | quaternius "Ultimate Animated Animals" pack | free CC0, pre-rigged, pre-animated, ships TODAY |
| Skeleton | quaternius's default humanoid (rebadged as mimi_skeleton_v1) | already shared across all their species, no retargeting needed |
| Species coverage | tiger / otter / bunny / giraffe / dog | matches our existing personas + notion mappings |
| Customization | palette override + accessory swap only | enough to feel personal w/o needing path B |
| Path B | spec'd here, not built | judge q&a fodder: "what about custom?" → "here's the spec" |

---

## 7. Demo claim

**"name an animal, mimi. spawns it as a chibi coworker in your notion workspace."**

For hackathon: 5 species, palette customization, accessory swap. <30s onboarding flow → drops them in the office.

For v2: full text-to-3d path. Show the spec, point at Tripo + critic loop, claim 100% generative for any prompt within 3 minutes.

---

## 8. Next-90-min punch list

1. Stephen downloads quaternius "Ultimate Animated Animals" → unzips → drops 5 species `.glb` into `apps/web/public/models/agents/`
2. I write `apps/web/src/components/AgentMesh.tsx` — loads the glb, applies palette override, plays animation clips
3. Update `Room.tsx` — swap `<AgentBillboard>` (2D plane sprite) for `<AgentMesh>` (3D rigged model)
4. Test locally → push → vercel rebuilds → maddy refreshes the live site

The brand still owns the look (palette, mottos, personas, voice clusters). The MESH is just the body now.
