import { Billboard, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { NearestFilter } from "three";
import { Html } from "@react-three/drei";
import { BRAND } from "@mimi/types";

interface HumanBillboardProps {
  position: [number, number, number];
  name?: string;
}

const HUMAN_SPRITE = "/sprites/human-base.png";

// human chibi billboard — paper-base sprite, no working/down states.
// gentle idle bob, same pixel-art filtering as agents.
export function HumanBillboard({ position, name }: HumanBillboardProps) {
  const texture = useTexture(HUMAN_SPRITE);
  useMemo(() => {
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.anisotropy = 1;
    texture.needsUpdate = true;
  }, [texture]);

  const group = useRef<Group>(null);
  useFrame((s) => {
    if (!group.current) return;
    group.current.position.y = Math.sin(s.clock.elapsedTime * 2) * 0.05;
  });

  const planeWidth = 1.2;
  const planeHeight = 1.8;
  const baseY = 0.9;

  return (
    <group position={[position[0], position[1] + baseY, position[2]]}>
      <group ref={group}>
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
          <mesh>
            <planeGeometry args={[planeWidth, planeHeight]} />
            <meshBasicMaterial map={texture} transparent alphaTest={0.5} depthWrite={false} />
          </mesh>
        </Billboard>
      </group>
      {name ? (
        <Html
          center
          occlude
          distanceFactor={8}
          position={[0, planeHeight * 0.6 + 0.15, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              background: BRAND.asphalt,
              color: BRAND.paper,
              fontFamily: BRAND.pixelFont,
              fontSize: "8px",
              letterSpacing: "0.04em",
              padding: "4px 8px",
              borderRadius: "999px",
              border: `1px solid ${BRAND.paper}`,
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
          >
            {name}
          </div>
        </Html>
      ) : null}
    </group>
  );
}
