# mimi. Avatar System — Single Base + Modular Parts + Style Constraints

Lock this. Every agent ever in mimi. = ONE base body + a config JSON.

## Why this (not generate-each-avatar-from-scratch)

Generating 5 independent 3D avatars = 5 different topologies, 5 different rigs, 5 different styles. Looks like a flea market.

ONE base + swappable parts = every agent looks like it lives in the same universe AND any new agent (path B / generative) plugs into the same rig and animations.

## The base

**`mimi_base_v1.glb`** — one canonical chibi humanoid:
- bipedal
- chibi proportions (head ~50% of body height)
- 15-bone humanoid skeleton (mixamo-compatible)
- T-pose at origin
- single body material slot (so tinting changes "fur color")
- single eye material slot (eye color)
- empties parented to: head bone (for ears/horns/hats), each hand bone (for accessories), back bone (for tails/wings)

**Source for the hackathon**: ready-player-me chibi export, OR quaternius RPG chibi base, OR mixamo Y-Bot retoped chibi. Whichever ships fastest. CC0 / free.

## The animation library (built once, reused infinitely)

`mimi_animations.glb` — all clips on `mimi_base_v1`'s skeleton:
- `idle` — gentle bob
- `walk` — locomotion
- `sit` — sit at desk (for working state)
- `type` — bongo-cat keyboard slam (for working state)
- `wave` — greeting
- `think` — hand-on-chin (for thinking state)
- `celebrate` — task complete
- `confused` — head tilt (for blocked state)
- `sleeping` — curled up (for offline / down state)
- `pointing` — gesture toward a thing

Source: mixamo. download these clips one-time on Y-Bot, bake to GLB, ship in repo.

## The parts library (the "wardrobe")

Each part is its own tiny `.glb`, fits the same skeleton, attaches to a known socket.

```
parts/
  ears/
    tiger.glb           (orange + black stripes, parented to head)
    bunny.glb           (long pink, parented to head)
    otter.glb           (round brown, parented to head)
    dog.glb             (floppy golden, parented to head)
    giraffe-horns.glb   (small mustard ossicones, parented to head)
  outfits/
    hoodie.glb          (replaces torso material zone)
    bowtie.glb          (neck attachment)
    scarf.glb           (neck attachment)
    lab-coat.glb        (torso + arms)
  accessories/
    laptop.glb          (parented to hand.L)
    envelope.glb        (parented to hand.L)
    carrot-pen.glb      (parented to hand.R)
    notepad.glb         (parented to hand.L)
  tails/
    tiger-tail.glb      (parented to spine_tail socket)
    dog-tail.glb
    otter-tail.glb
```

All parts use the same scale, same outline, same toon-shader material from BRAND.md.

## The persona config (JSON, the source of truth)

```typescript
interface AgentAvatarConfig {
  base: "mimi_base_v1";
  species: Species;             // labels the agent, drives default parts

  // visual
  body_tint: string;            // hex — recolors body material (#FFA040 for tiger)
  eye_color: string;            // hex
  ears: PartId;                 // "tiger" | "bunny" | "otter" | "dog" | "giraffe-horns" | null
  outfit: PartId;               // "hoodie" | "bowtie" | "scarf" | "lab-coat" | null
  accessory: PartId;            // "laptop" | "envelope" | etc | null
  tail: PartId;                 // species tail or null

  // behavior
  motion_style: "shy" | "calm" | "hype" | "sleepy" | "sharp";
  default_animation: AnimationId;
}
```

**5 mimi. agents become 5 config rows.** No 5 different glbs. The renderer:

```typescript
// pseudocode
function renderAgent(cfg: AgentAvatarConfig) {
  const base = useGLTF(`/models/base/${cfg.base}.glb`);
  base.traverse((mesh) => {
    if (mesh.name === "Body")  mesh.material.color.set(cfg.body_tint);
    if (mesh.name === "Eyes")  mesh.material.color.set(cfg.eye_color);
  });

  if (cfg.ears)        attachToBone(base, "head", useGLTF(`/models/parts/ears/${cfg.ears}.glb`));
  if (cfg.outfit)      attachToBone(base, "spine", useGLTF(`/models/parts/outfits/${cfg.outfit}.glb`));
  if (cfg.accessory)   attachToBone(base, "hand.L", useGLTF(`/models/parts/accessories/${cfg.accessory}.glb`));
  if (cfg.tail)        attachToBone(base, "spine_tail", useGLTF(`/models/parts/tails/${cfg.tail}.glb`));

  const mixer = new AnimationMixer(base);
  mixer.clipAction(animations[cfg.default_animation]).play();
  applyMotionStyle(mixer, cfg.motion_style); // speed scale, amplitude scale, etc

  return base;
}
```

## Path A vs Path B (matches CHIBI-PIPELINE.md)

### Path A (hackathon, ships today)
- Hand-curated parts library, 5 species pre-configured
- Onboarding flow: pick species → pick outfit → pick motion_style → done
- The 5 mimi. agents are 5 lines of JSON

### Path B (post-hackathon, the "any animal from a prompt" claim)
- User types "sleepy raccoon infra engineer with tiny laptop"
- Claude (Haiku 4.5) parses → fills in the AgentAvatarConfig
- If `ears: "raccoon"` doesn't exist → kick to part generator:
  - higgsfield generates concept sheet (raccoon ears, 3-view)
  - tripo generates 3D mesh from sheet
  - blender script (CLI'd by claude code via blender-mcp): retopo to part standard, weight to head socket, apply toon shader, export to `/models/parts/ears/raccoon.glb`
  - critic ensemble validates: tri count, topology, scale, outline match
  - if pass → asset library grows by one. if fail → repair loop (max 3 retries).
- All other parts are reused from the existing library.

Most prompts hit 80% library reuse. Generation is only for the long tail.

## The 5 v1 agents (concrete configs)

```typescript
const v1_agents: Record<Species, AgentAvatarConfig> = {
  tiger: {
    base: "mimi_base_v1",
    species: "tiger",
    body_tint: "#FFA040",
    eye_color: "#1F1916",
    ears: "tiger",
    outfit: "hoodie",
    accessory: "laptop",
    tail: "tiger-tail",
    motion_style: "sharp",
    default_animation: "type",
  },
  otter: {
    base: "mimi_base_v1",
    species: "otter",
    body_tint: "#A4C8E0",
    eye_color: "#1F1916",
    ears: "otter",
    outfit: "scarf",
    accessory: "envelope",
    tail: "otter-tail",
    motion_style: "calm",
    default_animation: "wave",
  },
  bunny: {
    base: "mimi_base_v1",
    species: "bunny",
    body_tint: "#F5E6D3",
    eye_color: "#1F1916",
    ears: "bunny",
    outfit: "scarf",
    accessory: "carrot-pen",
    tail: null,
    motion_style: "hype",
    default_animation: "idle",
  },
  giraffe: {
    base: "mimi_base_v1",
    species: "giraffe",
    body_tint: "#E8C77A",
    eye_color: "#1F1916",
    ears: "giraffe-horns",
    outfit: "lab-coat",
    accessory: "notepad",
    tail: null,
    motion_style: "calm",
    default_animation: "think",
  },
  dog: {
    base: "mimi_base_v1",
    species: "dog",
    body_tint: "#E5C896",
    eye_color: "#1F1916",
    ears: "dog",
    outfit: "bowtie",
    accessory: null,
    tail: "dog-tail",
    motion_style: "calm",
    default_animation: "idle",
  },
};
```

## What stephen does in the next 90 min

1. Download ONE chibi base (ready-player-me or quaternius), save to `apps/web/public/models/base/mimi_base_v1.glb`
2. Download mixamo animations (idle, walk, sit, type, wave, sleeping) baked onto a humanoid → save as `apps/web/public/models/animations/mimi_animations.glb`
3. (parts can be skipped for v1 demo — body_tint + accessory carry enough identity)

## What i (tenz) does in parallel

1. Write `apps/web/src/components/AgentMesh.tsx` — accepts an `AgentAvatarConfig`, returns a rendered glTF with tint + animation playing
2. Write `apps/web/src/lib/agents.ts` — the 5 v1_agents constant
3. Update `Room.tsx` — swap `<AgentBillboard>` for `<AgentMesh cfg={agent} />` at each species_desk position
4. Push, vercel rebuilds, refresh, brynn's room now has 5 bipedal chibis at their desks

## Why this finally works

- not 5 random models → ONE base, 5 configs
- not "AI slop" → AI fills config slots, doesn't free-generate meshes
- not clapped → bipedal base = sit at desk, walk to whiteboard, type, wave, etc all work naturally
- still extensible → "name an animal" path B plugs in cleanly later
- demo-ready in 90 min → no rigging, no retopology, no blender

## Hard constraints (the "style bible" your message called out)

- chibi proportions: head ~50% of full body height
- toon material with asphalt outline (#302F2C)
- soft pastel body tints (never saturated)
- 1-2 part swaps per species max (don't overcrowd)
- ONE animation playing at a time (no blend trees yet)
- all parts must visually live at the same scale + line weight as the base
- new parts get curated, never auto-shipped — path B's critic loop enforces this
