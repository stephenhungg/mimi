import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { BRAND, SPECIES_DESK } from "@mimi/types";
import type { Species } from "@mimi/types";
import { AgentMesh } from "../components/AgentMesh";
import { PlayerController } from "../components/PlayerController";
import { RemotePeers } from "../components/RemotePeers";
import { V1_AGENTS } from "../lib/agents";
import { playerPosStore, useMimiRoomContext, trainerCardStore } from "../lib/room-context";

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

export function Room({ localIdentity }: RoomProps) {
  const { scene } = useGLTF(MODEL_URL);
  const { peers } = useMimiRoomContext();

  useEffect(() => {
    scene.traverse((node) => {
      console.log("[rooms.glb]", node.type, node.name);
    });
  }, [scene]);

  // which species are "live" — meaning at least one agent broadcast has
  // arrived for them. for those we skip the static placeholder and let
  // RemotePeers render the real, state-driven billboard instead.
  const liveAgentSpecies = useMemo(() => {
    const set = new Set<Species>();
    for (const peer of peers.values()) {
      if (peer.kind === "agent" && peer.species) set.add(peer.species);
    }
    return set;
  }, [peers]);

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

      {/* placeholder agents — only render when no live broadcast for that species.
       *  click → open trainer card via the shared store (works across canvas/dom). */}
      {AGENT_LAYOUT.map(({ species, identity, position }) =>
        liveAgentSpecies.has(species) ? null : (
          <AgentMesh
            key={species}
            cfg={V1_AGENTS[species]}
            position={position}
            onClick={() => trainerCardStore.open({ species, identity })}
          />
        ),
      )}

      {/* real remote peers — humans + agents — rendered with smooth lerp. */}
      <RemotePeers localIdentity={localIdentity} />

      <PlayerController />
      <PresencePump localIdentity={localIdentity} />
    </>
  );
}

// inside-canvas helper that pulls the player's pose from the store and pushes
// it to the livekit hook's publishLocalPos. PlayerController writes to
// playerPosStore every frame; this just forwards each tick to the hook, which
// throttles the actual wire broadcasts internally.
function PresencePump({ localIdentity: _localIdentity }: { localIdentity: string }) {
  const { publishLocalPos } = useMimiRoomContext();
  useEffect(() => {
    return playerPosStore.subscribe((p) => {
      publishLocalPos({ x: p.x, z: p.z, rot: p.rot });
    });
  }, [publishLocalPos]);
  return null;
}

useGLTF.preload(MODEL_URL);
