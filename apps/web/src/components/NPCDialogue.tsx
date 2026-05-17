// walk-up-and-talk NPC dialogue. proximity hint appears when the player is
// within 3 units of an agent; E opens a modal that POSTs to the agent's
// /dialogue endpoint. the agent broadcasts agent_speak in response, which
// flows back through the livekit hook → AgentBillboard's SpeechBubble.

import { useEffect, useMemo, useRef, useState } from "react";
import { BRAND, type Species } from "@mimi/types";
import { useMimiRoomContext } from "../lib/room-context";
import { playerPosStore, type PlayerPos } from "../lib/room-context";
import { useTyping } from "../lib/typing";

const PROXIMITY = 3;
const AGENT_BASE_URL =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vite env typing varies
  (import.meta as any).env?.VITE_AGENT_BASE_URL ?? "http://localhost:8081";

interface NearestAgent {
  identity: string;
  species: Species;
  name: string;
  distance: number;
}

interface NPCDialogueProps {
  identity: string;
}

export function NPCDialogue({ identity }: NPCDialogueProps) {
  const { peers } = useMimiRoomContext();
  const { setTyping } = useTyping();

  // poll player pos (10Hz) and compute nearest agent. avoids tying this DOM
  // component into r3f's frame loop.
  const [playerPos, setPlayerPos] = useState<PlayerPos>(() => playerPosStore.get());
  useEffect(() => {
    return playerPosStore.subscribe((p) => setPlayerPos(p));
  }, []);

  const nearest = useMemo<NearestAgent | null>(() => {
    let best: NearestAgent | null = null;
    for (const peer of peers.values()) {
      if (peer.kind !== "agent" || !peer.species) continue;
      if (peer.identity === identity) continue;
      const dx = peer.pos.x - playerPos.x;
      const dz = peer.pos.z - playerPos.z;
      const d = Math.hypot(dx, dz);
      if (d > PROXIMITY) continue;
      if (!best || d < best.distance) {
        best = {
          identity: peer.identity,
          species: peer.species,
          name: peer.name,
          distance: d,
        };
      }
    }
    return best;
  }, [peers, playerPos, identity]);

  // modal state.
  const [open, setOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<NearestAgent | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // E opens the modal — only when a nearest agent exists and we're not
  // already in a typing state (chat or modal already open).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "KeyE" && !open && nearest) {
        // only fire if the active element isn't an input/textarea.
        const ae = document.activeElement;
        const tag = ae?.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        e.preventDefault();
        setModalTarget(nearest);
        setOpen(true);
        setTyping(true);
      } else if (e.code === "Escape" && open) {
        e.preventDefault();
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // intentionally referencing close via stable identity through state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nearest, setTyping]);

  // when modal opens, focus the input.
  useEffect(() => {
    if (open) {
      // requestAnimationFrame so the input is mounted.
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setDraft("");
      setError(null);
      setSending(false);
    }
  }, [open]);

  function close() {
    setOpen(false);
    setModalTarget(null);
    setTyping(false);
  }

  async function submit() {
    if (!modalTarget) return;
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${AGENT_BASE_URL}/${modalTarget.species}/dialogue`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: identity, text }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`agent ${res.status}: ${body}`);
      }
      // agent has broadcast agent_speak — billboard's bubble will pick it up.
      // close after a beat so the user sees the spinner resolve.
      setTimeout(() => {
        close();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSending(false);
    }
  }

  return (
    <>
      {/* proximity hint — visible when in range, no modal open. */}
      {nearest && !open ? (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: "68%",
            transform: "translateX(-50%)",
            zIndex: 15,
            padding: "8px 14px",
            background: BRAND.asphalt,
            color: BRAND.paper,
            border: `1px solid ${BRAND.paper}`,
            borderRadius: 999,
            fontFamily: BRAND.pixelFont,
            fontSize: 9,
            letterSpacing: "0.04em",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          press E to talk to {nearest.species}
        </div>
      ) : null}

      {open && modalTarget ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(48, 47, 44, 0.55)",
          }}
          onClick={(e) => {
            // click outside the panel to close.
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            style={{
              minWidth: 420,
              maxWidth: 520,
              padding: 22,
              background: BRAND.asphalt,
              color: BRAND.paper,
              border: `2px solid ${BRAND.paper}`,
              borderRadius: 18,
              boxShadow: `4px 4px 0 rgba(0,0,0,0.4)`,
              fontFamily: BRAND.pixelFont,
            }}
          >
            <div style={{ fontSize: 10, marginBottom: 12, letterSpacing: "0.04em" }}>
              talking to {modalTarget.species} ({modalTarget.name})
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={sending}
                placeholder="say something…"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: BRAND.paper,
                  color: BRAND.asphalt,
                  border: `1px solid ${BRAND.paper}`,
                  borderRadius: 10,
                  fontFamily: BRAND.pixelFont,
                  fontSize: 10,
                  outline: "none",
                }}
              />
            </form>
            <div style={{ marginTop: 12, fontSize: 8, opacity: 0.7, minHeight: 14 }}>
              {sending ? <Spinner label="talking…" /> : null}
              {error ? <span style={{ color: "#ff9a9a" }}>{error}</span> : null}
              {!sending && !error ? <span>enter to send · esc to leave</span> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Spinner({ label }: { label: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t + 1) % 4), 250);
    return () => window.clearInterval(id);
  }, []);
  const dots = ".".repeat(tick);
  return (
    <span>
      {label}
      {dots}
    </span>
  );
}
