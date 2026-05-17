import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import { BRAND } from "@mimi/types";
import { Room } from "./scenes/Room";
import { loadOrCreateIdentity, useMimiRoom } from "./lib/livekit";
import { MimiRoomProvider } from "./lib/room-context";
import { TypingProvider } from "./lib/typing";
import { ChatOverlay } from "./components/ChatOverlay";
import { NPCDialogue } from "./components/NPCDialogue";

// fullscreen 3D canvas + HUD overlay.
// fog matches asphalt so the room edges blend into the wordmark frame.
export function App() {
  const { identity, name } = useMemo(() => loadOrCreateIdentity(), []);
  const mimi = useMimiRoom(identity, name);

  return (
    <TypingProvider>
      <MimiRoomProvider value={mimi}>
        <Canvas
          shadows
          camera={{ position: [0, 1.6, 5], fov: 70, near: 0.1, far: 100 }}
          gl={{ antialias: true }}
          style={{ position: "fixed", inset: 0, background: BRAND.asphalt }}
        >
          <fog attach="fog" args={[BRAND.asphalt, 8, 30]} />
          <color attach="background" args={[BRAND.asphalt]} />
          <Suspense fallback={null}>
            {/* Room renders its own MimiRoomProvider consumer for RemotePeers. */}
            <MimiRoomProvider value={mimi}>
              <Room localIdentity={identity} />
            </MimiRoomProvider>
          </Suspense>
        </Canvas>
        <div className="hud">
          <div className="hud-wordmark">mimi.</div>
          <div className="hud-crosshair" />
          <div className="hud-hint">click to look · WASD to move · T to chat · E to talk</div>
          <div className="hud-conn" data-connected={mimi.connected}>
            {mimi.connected ? "● live" : "○ offline"}
          </div>
        </div>
        <ChatOverlay identity={identity} name={name} />
        <NPCDialogue identity={identity} />
      </MimiRoomProvider>
    </TypingProvider>
  );
}
