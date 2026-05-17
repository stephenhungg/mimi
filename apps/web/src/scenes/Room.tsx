import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { BRAND, SPECIES_DESK } from "@mimi/types";
import type { Species } from "@mimi/types";
import { AgentMesh } from "../components/AgentMesh";
import { PlayerController } from "../components/PlayerController";
import { V1_AGENTS } from "../lib/agents";
import { trainerCardStore } from "../lib/room-context";

const PAPER = BRAND.paper;

const MODEL_URL = "/models/scene.gltf";

function deskPosition(species: Species): [number, number, number] {
  const [x, z] = SPECIES_DESK[species];
  return [x, 0, z];
}

// `identity` is the trainer-card key — dog opens as "mimi".
const AGENT_LAYOUT: {
  species: Species;
  identity: string;
  position: [number, number, number];
}[] = [
  { species: "dog", identity: "mimi", position: deskPosition("dog") },
  { species: "tiger", identity: "tiger", position: deskPosition("tiger") },
  { species: "otter", identity: "otter", position: deskPosition("otter") },
  { species: "bunny", identity: "bunny", position: deskPosition("bunny") },
  { species: "giraffe", identity: "giraffe", position: deskPosition("giraffe") },
];

interface RoomProps {
  localIdentity: string;
}

export function Room({ localIdentity: _localIdentity }: RoomProps) {
  const { scene } = useGLTF(MODEL_URL);

  useEffect(() => {
    scene.traverse((node) => {
      console.log("[rooms.glb]", node.type, node.name);
    });
  }, [scene]);

  return (
    <>
      {/* lighting — same shape as before (warm directional + paper ambient), bumped brighter for the imported model */}
      <ambientLight intensity={1.0} color={PAPER} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={1.6}
        color="#fff5e0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
      />

      <primitive object={scene} />

      {/* config-driven agent meshes. click opens the trainer card via the shared store. */}
      {AGENT_LAYOUT.map(({ species, identity, position }) => (
        <AgentMesh
          key={species}
          cfg={V1_AGENTS[species]}
          position={position}
          onClick={() => trainerCardStore.open({ species, identity })}
        />
      ))}

      <PlayerController />
    </>
  );
}

useGLTF.preload(MODEL_URL);
