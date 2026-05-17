# Blender MCP — Animation Pipeline Spec

For Stephen's local Claude Code session. Goal: produce `apps/web/public/models/animations/mimi_animations.glb` containing named animation clips (idle, walk, sit, type, wave, sleeping, celebrate, confused) baked onto the same skeleton as `apps/web/public/models/base/mimi_base_v1.glb`.

End-state: `AgentMesh.tsx` loads two GLBs (base + animations), merges clips, picks the right one via `ANIMATION_ALIASES`.

---

## Step 0 — Prereqs (one-time, ~10 min)

1. Install Blender 4.2+ from https://www.blender.org/download/ (free, ~300 MB).
2. Install `uv` if missing: `brew install uv`. (`uvx` ships with it.)
3. Download blender-mcp addon:
   ```bash
   curl -L -o /tmp/blender_mcp_addon.py https://raw.githubusercontent.com/ahujasid/blender-mcp/main/addon.py
   ```
4. Open Blender → Edit → Preferences → Add-ons → Install from Disk → pick `/tmp/blender_mcp_addon.py` → enable the "Interface: Blender MCP" checkbox.
5. In Blender, press `N` in the 3D viewport to open the sidebar → "BlenderMCP" tab → click **Connect to Claude**. Leave Blender open.

---

## Step 1 — Register MCP server in Claude Code

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (or your Claude Code MCP config, whichever this session uses):

```json
{
  "mcpServers": {
    "blender": {
      "command": "uvx",
      "args": ["blender-mcp"]
    }
  }
}
```

Restart Claude Code. Verify with: `claude mcp list` — should show `blender` connected.

---

## Step 2 — Source the animation clips

**Pick ONE path. Path B is faster.**

### Path A — Mixamo (10 min, manual download, highest control)
Sign into https://www.mixamo.com with any Adobe ID. Search + download each as **FBX for Unity (.fbx)**, **With Skin**, **30 fps**, **No keyframe reduction**:

| filename to save as           | mixamo search term  |
|-------------------------------|---------------------|
| `idle.fbx`                    | Idle                |
| `walk.fbx`                    | Walking             |
| `sit.fbx`                     | Sitting             |
| `type.fbx`                    | Typing              |
| `wave.fbx`                    | Waving              |
| `sleeping.fbx`                | Sleeping Idle       |
| `celebrate.fbx`               | Cheering            |
| `confused.fbx`                | Confused            |

Save them to `~/Downloads/mimi-anims/`.

### Path B — Quaternius (5 min, zero auth, pre-baked) ⭐ recommended
Download https://quaternius.com/packs/animatedhumans.html — it's a single GLB with ~30 animations already named (Idle, Walk, Sit, Wave, etc) on a unified rig. Save to `~/Downloads/quaternius-humans.glb`.

If Path B: skip steps 4-5 below (the GLB is already merged). Just re-export to filter clips down to the 8 we need.

---

## Step 3 — Verify base skeleton

Before retargeting, confirm what's already in `mimi_base_v1.glb`. Run:

```bash
cd /Users/stephenhung/Documents/GitHub/mimi
bun -e "
import { NodeIO } from '@gltf-transform/core';
const io = new NodeIO();
const doc = await io.read('apps/web/public/models/base/mimi_base_v1.glb');
const anims = doc.getRoot().listAnimations();
console.log('clips:', anims.map(a => a.getName()));
const skins = doc.getRoot().listSkins();
console.log('skin joints:', skins[0]?.listJoints().map(j => j.getName()).slice(0, 5), '... (total:', skins[0]?.listJoints().length, ')');
"
```

If `mimi_base_v1.glb` is the Three.js `Soldier.glb` fallback, expect: clips = `["Idle","Walk","Run","TPose"]`, skin joints ≈ 23 named like `mixamorig:Hips`, `mixamorig:Spine`, etc.

**Decision branch:**
- If clips already include Idle + Walk + Run → `AgentMesh.tsx`'s `ANIMATION_ALIASES` already resolves `idle`/`walk` from these. You only need to ADD `sit`, `type`, `wave`, `sleeping`, `celebrate`, `confused`. Steps below are additive.
- If clips are empty/missing → full retarget pipeline.

---

## Step 4 — Drive Blender via MCP (the core step)

In Claude Code with `blender` MCP connected and Blender open, send this prompt verbatim:

> Using the blender MCP, do the following in the currently-open Blender session. Work step by step and confirm each step before continuing.
>
> 1. Clear the default scene (delete cube, camera, light).
>
> 2. Import the base mesh: `/Users/stephenhung/Documents/GitHub/mimi/apps/web/public/models/base/mimi_base_v1.glb`. Identify the armature object — call it `TargetArmature`. Note the exact bone names (especially Hips, Spine, Head, LeftArm, RightArm, LeftLeg, RightLeg).
>
> 3. For each FBX file in `/Users/stephenhung/Downloads/mimi-anims/` (or for Path B: the single quaternius GLB), do:
>    a. Import the FBX/GLB. The imported armature will be called `Armature` or `mixamorig` or similar — call it `SourceArmature`.
>    b. If source bone names are prefixed with `mixamorig:` and target's aren't (or vice versa), do a rename pass on the source so they match the target.
>    c. Use Blender's NLA Track + action retargeting (or the rokoko-retargeting flow if available): copy the source action onto `TargetArmature` and push down to an NLA strip named after the file (e.g. `idle`, `walk`, `sit`).
>    d. Delete `SourceArmature` and its mesh — we only want the action on `TargetArmature`.
>
> 4. After all clips are retargeted, `TargetArmature` should have N NLA actions, each named like `idle`, `walk`, `sit`, `type`, `wave`, `sleeping`, `celebrate`, `confused`.
>
> 5. Select `TargetArmature` and any meshes parented to it. File → Export → glTF 2.0:
>    - Format: glTF Binary (.glb)
>    - Path: `/Users/stephenhung/Documents/GitHub/mimi/apps/web/public/models/animations/mimi_animations.glb`
>    - Include: Selected Objects ✓, Custom Properties ✓
>    - Transform: +Y Up ✓
>    - Animation: Animations ✓, Group by NLA Track ✓, Export Deformation Bones Only ✓
>    - Mesh: Apply Modifiers ✓
>
> 6. Confirm the exported file size > 100 KB and list the action names included.
>
> If anything fails (bone mismatch, no NLA tracks pushed, export errors), stop and report the exact error so we can fix it. Do not silently skip clips.

The MCP server will execute Python in the live Blender session; you'll see the viewport update in real time.

---

## Step 5 — Wire the animation GLB into the app

Patch `apps/web/src/components/AgentMesh.tsx` to load both GLBs and merge their clips:

```tsx
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";

export function AgentMesh({ cfg, position, rotation }) {
  const baseGltf = useGLTF(`/models/base/${cfg.base}.glb`);
  const animGltf = useGLTF(`/models/animations/mimi_animations.glb`);

  // per-instance skeleton clone so 5 agents don't share state
  const cloned = useMemo(() => SkeletonUtils.clone(baseGltf.scene), [baseGltf.scene]);
  const ref = useRef();

  // merge animation clips from both GLBs
  const allClips = useMemo(
    () => [...baseGltf.animations, ...animGltf.animations],
    [baseGltf.animations, animGltf.animations],
  );

  const { actions, mixer } = useAnimations(allClips, ref);

  // resolve the desired clip via ANIMATION_ALIASES
  useEffect(() => {
    const candidates = ANIMATION_ALIASES[cfg.default_animation] ?? [cfg.default_animation];
    const found = candidates.map(n => actions[n]).find(Boolean);
    if (found) {
      found.reset().fadeIn(0.2).play();
      return () => found.fadeOut(0.2);
    }
  }, [actions, cfg.default_animation]);

  // tint body material
  useEffect(() => {
    cloned.traverse((obj) => {
      if (obj.isMesh && obj.name.toLowerCase().includes("body")) {
        obj.material = obj.material.clone();
        obj.material.color.set(cfg.body_tint);
      }
    });
  }, [cloned, cfg.body_tint]);

  return <primitive ref={ref} object={cloned} position={position} rotation={rotation} scale={1} />;
}

useGLTF.preload("/models/base/mimi_base_v1.glb");
useGLTF.preload("/models/animations/mimi_animations.glb");

const ANIMATION_ALIASES: Record<string, string[]> = {
  idle:      ["idle", "Idle", "tpose", "TPose"],
  walk:      ["walk", "Walk", "run", "Run", "Walking"],
  sit:       ["sit", "Sit", "Sitting", "idle"],
  type:      ["type", "Typing", "type", "work", "idle"],
  wave:      ["wave", "Wave", "Waving", "idle"],
  sleeping:  ["sleeping", "Sleeping", "Sleeping Idle", "idle"],
  celebrate: ["celebrate", "Celebrate", "Cheering", "idle"],
  confused:  ["confused", "Confused", "idle"],
  think:     ["think", "Think", "idle"],
};
```

---

## Step 6 — Smoke test

```bash
cd /Users/stephenhung/Documents/GitHub/mimi/apps/web
bun dev
```

Open http://localhost:5173. Expected:
- Brynn's room loads
- 5 chibis at their desks (tiger orange, otter blue, bunny cream, giraffe mustard, dog tan)
- Each playing its `default_animation` (tiger=type, otter=wave, bunny=idle, giraffe=think, dog=idle)
- No T-poses, no console errors about missing clips

If a chibi T-poses: open browser devtools, look for `Could not resolve animation` warnings, check the clip name in `animGltf.animations` matches one of the aliases.

---

## Step 7 — Commit + push

```bash
cd /Users/stephenhung/Documents/GitHub/mimi
git add apps/web/public/models/animations/mimi_animations.glb apps/web/src/components/AgentMesh.tsx docs/BLENDER-MCP-SPEC.md
git commit -m "feat(avatars): animation library via blender-mcp pipeline

- bake 8 mixamo/quaternius clips onto mimi_base_v1 skeleton
- AgentMesh merges base + animation GLBs and resolves via aliases
- documents the blender-mcp pipeline for path B regeneration"
git push origin main
```

---

## Fallback if blender-mcp wedges

The pipeline above is the right tool but if MCP connection breaks mid-flow, the manual path is:

1. Open Blender, run `Scripting` tab.
2. Paste this script (adjust paths) and hit Run:

```python
import bpy, os
from pathlib import Path

BASE = "/Users/stephenhung/Documents/GitHub/mimi/apps/web/public/models/base/mimi_base_v1.glb"
ANIM_DIR = Path("/Users/stephenhung/Downloads/mimi-anims/")
OUT = "/Users/stephenhung/Documents/GitHub/mimi/apps/web/public/models/animations/mimi_animations.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=BASE)
target = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
target.name = "TargetArmature"

for fbx in sorted(ANIM_DIR.glob("*.fbx")):
    bpy.ops.import_scene.fbx(filepath=str(fbx))
    src = [o for o in bpy.context.selected_objects if o.type == "ARMATURE"][0]
    if src.animation_data and src.animation_data.action:
        act = src.animation_data.action
        act.name = fbx.stem  # idle, walk, etc
        track = target.animation_data_create().nla_tracks.new()
        track.name = fbx.stem
        track.strips.new(fbx.stem, 0, act)
    # cleanup
    bpy.ops.object.select_all(action="DESELECT")
    src.select_set(True)
    for child in src.children:
        child.select_set(True)
    bpy.ops.object.delete()

bpy.ops.object.select_all(action="DESELECT")
target.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_nla_strips=True,
    export_deform_bones_only=True,
    export_apply=True,
)
print(f"✓ exported {OUT}")
```

---

## What success looks like

- `apps/web/public/models/animations/mimi_animations.glb` exists, > 200 KB
- Listing its clips shows at least: idle, walk, sit, type, wave, sleeping, celebrate, confused
- The 5 chibis in the room each play their species default_animation, no T-poses
- One commit on main, pushed, vercel preview deploys clean
