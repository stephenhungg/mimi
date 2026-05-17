// renders all remote peers (humans + agents) tracked by the livekit room.
// each peer's billboard interpolates toward the most-recently broadcast pos
// so movement is smooth even with a 1Hz heartbeat.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { Vector3 } from "three";
import type { ChatMessage, PeerState } from "../lib/livekit";
import { useMimiRoomContext } from "../lib/room-context";
import { AgentBillboard } from "./AgentBillboard";
import { HumanBillboard } from "./HumanBillboard";

interface RemotePeersProps {
  /** local identity — excluded so the player isn't drawn on top of themselves. */
  localIdentity: string;
  /** which species are rendered by Room.tsx as static placeholders. exclude
   *  remote-agent renders for these unless a real broadcast has arrived. */
  // (handled in Room.tsx — RemotePeers just renders everything it sees here.)
}

export function RemotePeers({ localIdentity }: RemotePeersProps) {
  const { peers, chat } = useMimiRoomContext();

  // build a list copy so we can map. peers Map is mutated in-place by the
  // hook; we re-render on the hook's internal version bumps.
  const list = useMemo(() => Array.from(peers.values()).filter((p) => p.identity !== localIdentity), [peers, localIdentity]);

  return (
    <>
      {list.map((peer) => (
        <PeerRender key={peer.identity} peer={peer} chat={chat} />
      ))}
    </>
  );
}

// ─── per-peer renderer with lerp ────────────────────────────────────────────

interface PeerRenderProps {
  peer: PeerState;
  chat: ChatMessage[];
}

function PeerRender({ peer, chat }: PeerRenderProps) {
  const group = useRef<Group>(null);
  const target = useRef(new Vector3(peer.pos.x, 0, peer.pos.z));
  const current = useRef(new Vector3(peer.pos.x, 0, peer.pos.z));

  // update target whenever the peer's broadcast pos changes.
  useEffect(() => {
    target.current.set(peer.pos.x, 0, peer.pos.z);
  }, [peer.pos.x, peer.pos.z]);

  useFrame((_state, dt) => {
    if (!group.current) return;
    // exponential ease toward target — frame-rate independent.
    const lerpFactor = 1 - Math.exp(-dt * 8);
    current.current.lerp(target.current, lerpFactor);
    group.current.position.x = current.current.x;
    group.current.position.z = current.current.z;
  });

  // most recent agent_speak line for this peer, if it's an agent.
  const [speaking, setSpeaking] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (peer.kind !== "agent") return;
    // find latest agent_speak from this identity.
    for (let i = chat.length - 1; i >= 0; i -= 1) {
      const m = chat[i];
      if (m && m.kind === "agent_speak" && m.identity === peer.identity) {
        setSpeaking(m.text);
        return;
      }
    }
  }, [chat, peer.identity, peer.kind]);

  return (
    <group ref={group}>
      {peer.kind === "agent" && peer.species ? (
        <AgentBillboard
          species={peer.species}
          state={peer.state ?? "idle"}
          name={peer.name}
          position={[0, 0, 0]}
          mood={peer.mood}
          speaking={speaking}
          onSpeakingDone={() => setSpeaking(undefined)}
        />
      ) : (
        <HumanBillboard position={[0, 0, 0]} name={peer.name} />
      )}
    </group>
  );
}
