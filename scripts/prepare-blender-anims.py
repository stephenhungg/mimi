# prepare-blender-anims.py — standalone blender script. produces
# apps/web/public/models/animations/mimi_animations.glb from either:
#   • a single quaternius-style merged GLB (path B, recommended)
#   • a directory of mixamo .fbx files (path A)
#
# DOES NOT need blender-mcp or claude. you run blender CLI:
#
#   /Applications/Blender.app/Contents/MacOS/Blender \
#     --background --python scripts/prepare-blender-anims.py
#
# or open blender, drop into the Scripting tab, paste this file's content,
# adjust the PATHS block below, press Run Script.
#
# the script:
#   1. clears the scene
#   2. imports the base mimi_base_v1.glb to capture target armature bones
#   3. imports each source clip (FBX or GLB), retargets its action onto the
#      target armature via NLA tracks, deletes the source
#   4. exports the merged result to mimi_animations.glb
#
# requires no addons. uses only bpy + bpy.ops that ship with blender 4.2+.

import bpy
import os
from pathlib import Path

# ─── PATHS — adjust if your repo lives elsewhere ─────────────────────────────

REPO = Path("/Users/stephenhung/Documents/GitHub/mimi")
BASE_GLB = REPO / "apps/web/public/models/base/mimi_base_v1.glb"
OUT_GLB  = REPO / "apps/web/public/models/animations/mimi_animations.glb"

# pick ONE of these (set the other to None):
QUATERNIUS_GLB = Path.home() / "Downloads/quaternius-humans.glb"  # path B
MIXAMO_DIR     = Path.home() / "Downloads/mimi-anims"             # path A (folder of .fbx)

# which clips we WANT in the final glb. matches AgentMesh ANIMATION_ALIASES.
TARGET_CLIPS = ["idle", "walk", "sit", "type", "wave", "sleeping", "celebrate", "confused"]

# ─── helpers ────────────────────────────────────────────────────────────────

def log(msg):
    print(f"[mimi-anims] {msg}")

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    log("scene cleared")

def import_glb(path):
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [o for o in bpy.context.selected_objects]

def import_fbx(path):
    bpy.ops.import_scene.fbx(filepath=str(path))
    return [o for o in bpy.context.selected_objects]

def find_armature(objects):
    for o in objects:
        if o.type == "ARMATURE":
            return o
    return None

def push_action_to_nla(armature, action_name):
    if not armature.animation_data or not armature.animation_data.action:
        return False
    act = armature.animation_data.action
    act.name = action_name
    # create NLA track + push down
    track = armature.animation_data.nla_tracks.new()
    track.name = action_name
    track.strips.new(action_name, 0, act)
    # clear active action so the next import doesn't overwrite this push
    armature.animation_data.action = None
    return True

def delete_objects(objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        if o.name in bpy.data.objects:
            o.select_set(True)
            for c in o.children_recursive:
                c.select_set(True)
    bpy.ops.object.delete()

# ─── main ───────────────────────────────────────────────────────────────────

def main():
    OUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    clear_scene()

    # 1. import base
    if not BASE_GLB.exists():
        log(f"ERROR: base glb not found at {BASE_GLB}")
        return
    base_objs = import_glb(BASE_GLB)
    target = find_armature(base_objs)
    if not target:
        log("ERROR: no armature in base glb")
        return
    target.name = "TargetArmature"
    log(f"target armature: {target.name} with {len(target.data.bones)} bones")
    log(f"sample bones: {[b.name for b in target.data.bones[:5]]}")

    # 2. collect source clips
    sources = []
    if QUATERNIUS_GLB and QUATERNIUS_GLB.exists():
        log(f"path B: importing quaternius glb {QUATERNIUS_GLB}")
        objs = import_glb(QUATERNIUS_GLB)
        src_arm = find_armature(objs)
        if src_arm and src_arm.animation_data:
            # quaternius packs many actions on one armature; iterate them
            for act in bpy.data.actions:
                name = act.name.lower().replace(" ", "_")
                if any(name.startswith(c) or c in name for c in TARGET_CLIPS):
                    sources.append((act.name, name, src_arm))
            log(f"found {len(sources)} matching clips in quaternius glb")
    elif MIXAMO_DIR and MIXAMO_DIR.exists():
        log(f"path A: importing mixamo fbx files from {MIXAMO_DIR}")
        for fbx in sorted(MIXAMO_DIR.glob("*.fbx")):
            stem = fbx.stem.lower()
            if not any(c in stem for c in TARGET_CLIPS):
                continue
            objs = import_fbx(fbx)
            src_arm = find_armature(objs)
            if src_arm and src_arm.animation_data and src_arm.animation_data.action:
                sources.append((src_arm.animation_data.action.name, stem, src_arm))
    else:
        log("ERROR: neither QUATERNIUS_GLB nor MIXAMO_DIR exist. download clips first.")
        return

    # 3. retarget each — copy action onto target, push to NLA, delete source
    pushed = 0
    cleanup = []
    for orig_name, target_name, src_arm in sources:
        action = bpy.data.actions.get(orig_name)
        if not action:
            log(f"skip: action '{orig_name}' not found")
            continue
        # assign action to target temporarily
        if not target.animation_data:
            target.animation_data_create()
        # clone the action to keep names tidy
        new_act = action.copy()
        new_act.name = target_name
        target.animation_data.action = new_act
        if push_action_to_nla(target, target_name):
            pushed += 1
            log(f"  ✓ pushed '{target_name}' to NLA")
        else:
            log(f"  ✗ failed to push '{target_name}'")
        cleanup.append(src_arm)

    # delete sources (we only want the target armature in the final glb)
    if cleanup:
        delete_objects(cleanup)

    log(f"total clips pushed to target armature: {pushed}")

    # 4. export
    bpy.ops.object.select_all(action="DESELECT")
    target.select_set(True)
    # also select target's mesh children
    for c in target.children_recursive:
        c.select_set(True)

    bpy.ops.export_scene.gltf(
        filepath=str(OUT_GLB),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_nla_strips=True,
        export_deform_bones_only=False,
        export_apply=True,
    )
    size_kb = OUT_GLB.stat().st_size / 1024
    log(f"✓ exported {OUT_GLB} ({size_kb:.0f} KB)")

if __name__ == "__main__":
    main()
