import { Billboard, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { NearestFilter } from "three";
import type { AgentState, Mood, Species } from "@mimi/types";
import { PRELOAD_URLS, spriteUrl } from "../lib/sprites";
import { NameTag } from "./NameTag";
import { SpeechBubble } from "./SpeechBubble";

interface AgentBillboardProps {
  species: Species;
  state: AgentState;
  position: [number, number, number];
  name?: string;
  // mood is part of the public api but visual rendering is via sprite + bubble for now.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mood?: Mood;
  speaking?: string;
  onSpeakingDone?: () => void;
  /** click handler — opens the trainer card. parent supplies it so the click
   *  routes through the shared trainerCardStore (works across canvas/dom). */
  onClick?: () => void;
}

// preload all sprite textures so state swaps are instant.
useTexture.preload(PRELOAD_URLS);

// sprite billboard for an agent. owns its own bob + texture swap, but does not
// own state — parent (room / livekit listener) decides `state`/`speaking`.
export function AgentBillboard({
  species,
  state,
  position,
  name,
  speaking,
  onSpeakingDone,
  onClick,
}: AgentBillboardProps) {
  const url = spriteUrl(species, state);
  // useTexture returns a single texture for a single string.
  const texture = useTexture(url);

  // pixel-art sprites: keep the crisp edges.
  useMemo(() => {
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.anisotropy = 1;
    texture.needsUpdate = true;
  }, [texture]);

  const group = useRef<Group>(null);
  const baseY = state === "down" ? 0.4 : 0.9;

  useFrame((s) => {
    if (!group.current) return;
    const t = s.clock.elapsedTime;
    let bob = 0;
    if (state === "idle" || state === "talking") {
      bob = Math.sin(t * 2) * 0.05;
    } else if (state === "working") {
      bob = Math.sin(t * 8) * 0.08;
    }
    // 'down' and 'walking' don't bob in the sprite itself.
    group.current.position.y = bob;
  });

  // 'down' renders shorter so the puddle hugs the floor.
  const planeHeight = state === "down" ? 1.1 : 1.8;
  const planeWidth = state === "down" ? 1.4 : 1.2;

  return (
    <group position={[position[0], position[1] + baseY, position[2]]}>
      <group ref={group}>
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
          <mesh
            onClick={(e) => {
              if (!onClick) return;
              e.stopPropagation();
              onClick();
            }}
            onPointerOver={(e) => {
              if (!onClick) return;
              e.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              if (!onClick) return;
              document.body.style.cursor = "";
            }}
          >
            <planeGeometry args={[planeWidth, planeHeight]} />
            <meshBasicMaterial
              map={texture}
              transparent
              alphaTest={0.5}
              depthWrite={false}
            />
          </mesh>
        </Billboard>
      </group>
      {name ? <NameTag name={name} species={species} yOffset={planeHeight * 0.6 + 0.15} /> : null}
      {speaking ? (
        <SpeechBubble
          text={speaking}
          yOffset={planeHeight * 0.6 + 0.5}
          onDismiss={onSpeakingDone}
        />
      ) : null}
    </group>
  );
}
