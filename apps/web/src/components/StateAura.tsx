// state-driven aura ring underneath an agent. makes the demo READ visually
// even before blender animations land — chibis play the Idle fallback for
// every state, so without an aura you can't tell what they're doing.
//
// mounts as a sibling to <AgentMesh> at the same position. emissive disc
// + scale pulse synced to clock. color by state:
//   working → green   (focused, eyes-on-screen energy)
//   walking → blue    (moving, alert)
//   talking → yellow  (saying something out loud)
//   down    → red     (rate-limited, slime puddle vibes)
//   idle    → hidden  (no aura, peaceful)

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type Mesh } from "three";
import type { AgentState, Species } from "@mimi/types";
import { agentStateStore } from "../lib/room-context";

const AURA_COLORS: Record<AgentState, string | null> = {
  idle: null,
  walking: "#3b82f6",  // blue
  working: "#10b981",  // green
  talking: "#eab308",  // yellow
  down: "#ef4444",     // red
};

interface StateAuraProps {
  species: Species;
  position: [number, number, number];
}

export function StateAura({ species, position }: StateAuraProps) {
  const [state, setState] = useState<AgentState>("idle");
  const meshRef = useRef<Mesh>(null);

  useEffect(() => {
    return agentStateStore.subscribe((snap) => {
      for (const e of snap.values()) {
        if (e.species === species && e.state) {
          setState(e.state);
          return;
        }
      }
      setState("idle");
    });
  }, [species]);

  const color = AURA_COLORS[state];

  // gentle pulse — scale oscillates between 0.85 and 1.05 at ~2 Hz.
  useFrame(({ clock }) => {
    if (!meshRef.current || !color) return;
    const t = clock.elapsedTime;
    const pulse = 0.95 + Math.sin(t * 2.5) * 0.1;
    meshRef.current.scale.set(pulse, 1, pulse);
  });

  if (!color) return null;

  return (
    <mesh
      ref={meshRef}
      position={[position[0], position[1] + 0.02, position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[0.55, 0.72, 32]} />
      <meshBasicMaterial
        color={new Color(color)}
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </mesh>
  );
}
