import type { ReactElement } from "react";
import { useEffect, useMemo } from "react";
import { BRAND, SPECIES_DESK } from "@mimi/types";
import type { Species } from "@mimi/types";
import { AgentBillboard } from "../components/AgentBillboard";
import { PlayerController } from "../components/PlayerController";
import { RemotePeers } from "../components/RemotePeers";
import { playerPosStore, useMimiRoomContext, trainerCardStore } from "../lib/room-context";

// brand-locked palette + a few warm accent tones used only for physical props
// inside the room (plant green, monitor glow). chibi color lives on the sprites.
const ASPHALT = BRAND.asphalt;
const PAPER = BRAND.paper;
const MONITOR_GLOW = "#5bd6a3";
const PLANT_GREEN = "#3f7a4a";
const RUG_TONE = "#dcd6c4";
const WOOD = "#7a6a55";

const ROOM = {
  size: 20,
  wallHeight: 4,
  wallThickness: 0.2,
};

// agents to render as placeholders so the room is visibly populated.
// state stays 'idle' here — real state will come from the livekit lane.
const AGENT_NAMES: Record<Species, string> = {
  tiger: "tiger",
  otter: "otter",
  bunny: "bunny",
  dog: "mimi.",
  giraffe: "giraffe",
};

interface RoomProps {
  localIdentity: string;
}

export function Room({ localIdentity }: RoomProps) {
  const { peers } = useMimiRoomContext();

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
      {/* lighting — warm directional + soft paper ambient, shadows on */}
      <ambientLight intensity={0.6} color={PAPER} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={1.1}
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

      {/* floor — paper-tone plane */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[ROOM.size, ROOM.size]} />
        <meshStandardMaterial color={PAPER} roughness={0.95} />
      </mesh>

      {/* ceiling — paper, faintly darker for warmth */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.wallHeight, 0]}>
        <planeGeometry args={[ROOM.size, ROOM.size]} />
        <meshStandardMaterial color={PAPER} roughness={1} />
      </mesh>

      {/* walls — 4 thin asphalt slabs, inside-facing */}
      <Wall position={[0, ROOM.wallHeight / 2, -ROOM.size / 2]} size={[ROOM.size, ROOM.wallHeight, ROOM.wallThickness]} />
      <Wall position={[0, ROOM.wallHeight / 2, ROOM.size / 2]} size={[ROOM.size, ROOM.wallHeight, ROOM.wallThickness]} />
      <Wall position={[-ROOM.size / 2, ROOM.wallHeight / 2, 0]} size={[ROOM.wallThickness, ROOM.wallHeight, ROOM.size]} />
      <Wall position={[ROOM.size / 2, ROOM.wallHeight / 2, 0]} size={[ROOM.wallThickness, ROOM.wallHeight, ROOM.size]} />

      {/* center: round rug + low table — mimi. (dog) sits on the rug */}
      <CenterArea />

      {/* themed corners — coords from SPECIES_DESK (x, z), y=0 is floor */}
      <TigerCorner pos={SPECIES_DESK.tiger} />
      <OtterCorner pos={SPECIES_DESK.otter} />
      <BunnyCorner pos={SPECIES_DESK.bunny} />
      <GiraffeCorner pos={SPECIES_DESK.giraffe} />

      {/* placeholder agents — only render when no live broadcast for that species.
       *  click → open trainer card via the shared store (works across canvas/dom). */}
      {!liveAgentSpecies.has("tiger") ? (
        <AgentBillboard
          species="tiger"
          state="idle"
          name={AGENT_NAMES.tiger}
          position={[SPECIES_DESK.tiger[0] + 1.2, 0, SPECIES_DESK.tiger[1] + 1.2]}
          onClick={() => trainerCardStore.open({ species: "tiger", identity: "tiger" })}
        />
      ) : null}
      {!liveAgentSpecies.has("otter") ? (
        <AgentBillboard
          species="otter"
          state="idle"
          name={AGENT_NAMES.otter}
          position={[SPECIES_DESK.otter[0] - 1.2, 0, SPECIES_DESK.otter[1] + 1.2]}
          onClick={() => trainerCardStore.open({ species: "otter", identity: "otter" })}
        />
      ) : null}
      {!liveAgentSpecies.has("bunny") ? (
        <AgentBillboard
          species="bunny"
          state="idle"
          name={AGENT_NAMES.bunny}
          position={[SPECIES_DESK.bunny[0] + 1.2, 0, SPECIES_DESK.bunny[1] - 1.2]}
          onClick={() => trainerCardStore.open({ species: "bunny", identity: "bunny" })}
        />
      ) : null}
      {!liveAgentSpecies.has("giraffe") ? (
        <AgentBillboard
          species="giraffe"
          state="idle"
          name={AGENT_NAMES.giraffe}
          position={[SPECIES_DESK.giraffe[0] - 1.2, 0, SPECIES_DESK.giraffe[1] - 1.2]}
          onClick={() => trainerCardStore.open({ species: "giraffe", identity: "giraffe" })}
        />
      ) : null}
      {!liveAgentSpecies.has("dog") ? (
        <AgentBillboard
          species="dog"
          state="idle"
          name={AGENT_NAMES.dog}
          position={[SPECIES_DESK.dog[0], 0, SPECIES_DESK.dog[1]]}
          onClick={() => trainerCardStore.open({ species: "dog", identity: "mimi" })}
        />
      ) : null}

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

function Wall({
  position,
  size,
}: {
  position: [number, number, number];
  size: [number, number, number];
}) {
  return (
    <mesh position={position} receiveShadow castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={ASPHALT} roughness={0.9} />
    </mesh>
  );
}

function CenterArea() {
  return (
    <group>
      {/* round rug, low cylinder slightly above floor to avoid z-fighting */}
      <mesh position={[0, 0.005, 0]} receiveShadow>
        <cylinderGeometry args={[2.2, 2.2, 0.01, 48]} />
        <meshStandardMaterial color={RUG_TONE} roughness={1} />
      </mesh>
      {/* low table on the rug */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.5, 0.9]} />
        <meshStandardMaterial color={WOOD} roughness={0.8} />
      </mesh>
    </group>
  );
}

// ─── corner builders ───────────────────────────────────────────────────────
// pos = [x, z] of the agent's desk anchor. props are arranged around that point.

function Desk({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[1.8, 0.9, 0.9]} />
      <meshStandardMaterial color={WOOD} roughness={0.85} />
    </mesh>
  );
}

function TigerCorner({ pos }: { pos: [number, number] }) {
  const [x, z] = pos;
  return (
    <group>
      <Desk position={[x, 0.45, z]} />
      {/* three low-poly emissive 'monitor' cubes lined up on the desk */}
      {[-0.55, 0, 0.55].map((dx) => (
        <mesh key={dx} position={[x + dx, 1.15, z]} castShadow>
          <boxGeometry args={[0.45, 0.35, 0.08]} />
          <meshStandardMaterial
            color={ASPHALT}
            emissive={MONITOR_GLOW}
            emissiveIntensity={0.6}
            roughness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

function OtterCorner({ pos }: { pos: [number, number] }) {
  const [x, z] = pos;
  return (
    <group>
      <Desk position={[x, 0.45, z]} />
      {/* stacked 'envelope' slabs — thin paper-cream boxes, slightly rotated */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[x - 0.3 + i * 0.05, 0.95 + i * 0.05, z - 0.1 + i * 0.04]}
          rotation={[0, i * 0.07, 0]}
          castShadow
        >
          <boxGeometry args={[0.55, 0.04, 0.4]} />
          <meshStandardMaterial color={PAPER} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function BunnyCorner({ pos }: { pos: [number, number] }) {
  const [x, z] = pos;
  // 'calendar wall' — 5x5 grid of small paper squares mounted on the back wall.
  // bunny corner is at z = +5, so the wall is on z = +10 side; squares live
  // slightly in front of the wall facing into the room (-z normal).
  const wallZ = z > 0 ? ROOM.size / 2 - 0.12 : -ROOM.size / 2 + 0.12;
  const facing = z > 0 ? -1 : 1;
  const cells: ReactElement[] = [];
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const cx = x - 1 + col * 0.5;
      const cy = 1.4 + row * 0.5;
      cells.push(
        <mesh
          key={`${row}-${col}`}
          position={[cx, cy, wallZ]}
          rotation={[0, facing > 0 ? Math.PI : 0, 0]}
          castShadow
        >
          <boxGeometry args={[0.42, 0.42, 0.04]} />
          <meshStandardMaterial color={PAPER} roughness={0.95} />
        </mesh>,
      );
    }
  }
  return (
    <group>
      <Desk position={[x, 0.45, z]} />
      {cells}
    </group>
  );
}

function GiraffeCorner({ pos }: { pos: [number, number] }) {
  const [x, z] = pos;
  return (
    <group>
      <Desk position={[x, 0.45, z]} />
      {/* tall plant: trunk (cylinder) + canopy (sphere) */}
      <mesh position={[x - 0.6, 0.9, z - 0.6]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 1.8, 8]} />
        <meshStandardMaterial color={WOOD} roughness={0.9} />
      </mesh>
      <mesh position={[x - 0.6, 2.0, z - 0.6]} castShadow>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshStandardMaterial color={PLANT_GREEN} roughness={0.85} />
      </mesh>
      {/* small stack of notebooks on the desk */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[x + 0.3, 0.95 + i * 0.06, z]} castShadow>
          <boxGeometry args={[0.5, 0.05, 0.35]} />
          <meshStandardMaterial color={i % 2 === 0 ? PAPER : RUG_TONE} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
