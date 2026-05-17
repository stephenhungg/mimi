// mimi. 3D client — single-player r3f scene + notion event poll loop.
//
// previous v1 used multiplayer presence. removed: realtime cloud setup is
// high-friction for a hackathon demo, and the killshot (commit → tiger reacts
// → notion updates) works fine in single-player. agent state comes from notion
// via short polling.

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { BRAND } from "@mimi/types";
import { Room } from "./scenes/Room";
import { loadOrCreateLocalIdentity, trainerCardStore } from "./lib/room-context";
import { TypingProvider } from "./lib/typing";
import { ChatOverlay } from "./components/ChatOverlay";
import { TrainerCard, type TrainerCardData } from "./components/TrainerCard";
import { useAgentPollLoop } from "./lib/agent-poll";

export function App() {
  const { identity, name } = loadOrCreateLocalIdentity();
  const [activeCard, setActiveCard] = useState<TrainerCardData | null>(null);
  useEffect(() => trainerCardStore.subscribe(setActiveCard), []);
  // start the notion poll loop — agent state in the 3D scene comes from this.
  const { connected, lastEventCount } = useAgentPollLoop({ enabled: true });

  return (
    <TypingProvider>
      <Canvas
        shadows
        camera={{ position: [0, 1.6, 5], fov: 70, near: 0.1, far: 100 }}
        gl={{ antialias: true }}
        style={{ position: "fixed", inset: 0, background: BRAND.asphalt }}
      >
        <fog attach="fog" args={[BRAND.asphalt, 8, 30]} />
        <color attach="background" args={[BRAND.asphalt]} />
        <Suspense fallback={null}>
          <Room localIdentity={identity} />
        </Suspense>
      </Canvas>
      <div className="hud">
        <div className="hud-wordmark">mimi.</div>
        <div className="hud-crosshair" />
        <div className="hud-hint">click to look · WASD to move · click an agent for the trainer card</div>
        <div className="hud-conn" data-connected={connected}>
          {connected ? `● notion live (${lastEventCount})` : "○ notion idle"}
        </div>
      </div>
      <ChatOverlay identity={identity} name={name} />
      <TrainerCard card={activeCard} onClose={() => trainerCardStore.close()} />
    </TypingProvider>
  );
}
