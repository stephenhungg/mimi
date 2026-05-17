import { useAnimations, useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  Box3,
  Color,
  Group,
  Material,
  Mesh,
  SkinnedMesh,
  Vector3,
  type Object3D,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { AgentAvatarConfig, AnimationId } from "../lib/agents";

interface AgentMeshProps {
  cfg: AgentAvatarConfig;
  position: [number, number, number];
  onClick?: () => void;
}

const TARGET_HEIGHT = 1.0;
const SCALE_WARN_MIN = 0.75;
const SCALE_WARN_MAX = 1.4;

const ANIMATION_ALIASES: Record<AnimationId, string[]> = {
  idle: ["idle", "tpose"],
  walk: ["walk", "run"],
  sit: ["sit", "idle"],
  type: ["type", "typing", "work", "idle"],
  wave: ["wave", "idle"],
  think: ["think", "idle"],
  celebrate: ["celebrate", "idle"],
  confused: ["confused", "idle"],
  sleeping: ["sleeping", "sleep", "idle"],
  pointing: ["pointing", "point", "idle"],
};

export function AgentMesh({ cfg, position, onClick }: AgentMeshProps) {
  const { scene, animations } = useGLTF(`/models/base/${cfg.base}.glb`);

  const avatar = useMemo(() => {
    const next = cloneSkeleton(scene) as Group;
    prepareInstance(next, cfg);
    normalizeScale(next, cfg.species);
    return next;
  }, [cfg, scene]);

  const { actions, names } = useAnimations(animations, avatar);
  const clipName = useMemo(
    () => resolveClipName(cfg.default_animation, names),
    [cfg.default_animation, names],
  );

  useEffect(() => {
    if (!clipName) return;
    const action = actions[clipName];
    if (!action) return;

    action.reset().fadeIn(0.12).play();
    return () => {
      action.fadeOut(0.12);
    };
  }, [actions, clipName]);

  return (
    <primitive
      object={avatar}
      position={position}
      dispose={null}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (!onClick) return;
        event.stopPropagation();
        onClick();
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        if (!onClick) return;
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        if (!onClick) return;
        document.body.style.cursor = "";
      }}
    />
  );
}

function prepareInstance(root: Object3D, cfg: AgentAvatarConfig) {
  let body: Mesh | SkinnedMesh | null = null;
  let firstSkinnedMesh: SkinnedMesh | null = null;
  let eyes: Mesh | SkinnedMesh | null = null;

  root.traverse((node) => {
    if (node instanceof Mesh || node instanceof SkinnedMesh) {
      cloneMaterial(node);
      node.castShadow = true;
      node.receiveShadow = true;

      if (!firstSkinnedMesh && node instanceof SkinnedMesh) {
        firstSkinnedMesh = node;
      }
      if (node.name === "Body") {
        body = node;
      }
      if (node.name === "Eyes" || /visor/i.test(node.name)) {
        eyes = node;
      }
    }
  });

  tintMesh(body ?? firstSkinnedMesh, cfg.body_tint);
  tintMesh(eyes, cfg.eye_color);
}

function cloneMaterial(mesh: Mesh | SkinnedMesh) {
  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map((material) => material.clone());
    return;
  }

  mesh.material = mesh.material.clone();
}

function tintMesh(mesh: Mesh | SkinnedMesh | null, color: string) {
  if (!mesh) return;

  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    setMaterialColor(material, color);
  }
}

function setMaterialColor(material: Material, color: string) {
  if ("color" in material && material.color instanceof Color) {
    material.color.set(color);
  }
}

function normalizeScale(root: Object3D, species: string) {
  const size = new Vector3();
  const box = new Box3().setFromObject(root);
  box.getSize(size);
  if (!Number.isFinite(size.y) || size.y <= 0) return;

  if (size.y < SCALE_WARN_MIN || size.y > SCALE_WARN_MAX) {
    const scale = TARGET_HEIGHT / size.y;
    root.scale.multiplyScalar(scale);
    root.position.y -= box.min.y * scale;
    console.info(
      `[AgentMesh] ${species} base height ${size.y.toFixed(2)}u scaled to ${TARGET_HEIGHT.toFixed(1)}u`,
    );
  }
}

function resolveClipName(defaultAnimation: AnimationId, names: string[]) {
  const normalized = new Map(names.map((name) => [normalizeName(name), name]));

  const exact = normalized.get(normalizeName(defaultAnimation));
  if (exact) return exact;

  for (const alias of ANIMATION_ALIASES[defaultAnimation]) {
    const match = normalized.get(normalizeName(alias));
    if (match) return match;
  }

  return names[0] ?? null;
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

useGLTF.preload("/models/base/mimi_base_v1.glb");
