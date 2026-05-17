// npc dialogue — proximity-triggered modal to talk to an agent.
// reads player pose + agent positions. on E press near an agent, opens a modal,
// posts to the agent's /dialogue endpoint via the landing router, shows the
// reply text in the modal then auto-closes 1s after the agent's speak lands.
//
// agent replies come back from the POST body itself (since /dialogue is
// synchronous), and the agent's broadcast is reflected via the poll loop into
// agentStateStore.

import { useEffect, useState } from "react";
import { SPECIES_DESK, type Species } from "@mimi/types";
import { useTyping } from "../lib/typing";
import { playerPosStore, type PlayerPos, agentStateStore } from "../lib/room-context";

const ALL_SPECIES: Species[] = ["tiger", "otter", "bunny", "dog", "giraffe"];
const PROXIMITY = 3;

interface DialogueResponse {
  ok?: boolean;
  speakLog?: Array<{ text?: string }>;
}

const AGENT_BASE_URL =
  (import.meta as { env?: { VITE_AGENT_BASE_URL?: string } }).env?.VITE_AGENT_BASE_URL ??
  "http://localhost:3000/api/agent";

export function NPCDialogue({ identity }: { identity: string }) {
  const [near, setNear] = useState<Species | null>(null);
  const [open, setOpen] = useState<Species | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const { setTyping } = useTyping();

  // proximity check — subscribe to player pose, find nearest agent within 3u.
  useEffect(() => {
    const check = (p: PlayerPos) => {
      let bestSpecies: Species | null = null;
      let bestDist = PROXIMITY;
      for (const s of ALL_SPECIES) {
        const home = SPECIES_DESK[s];
        const ax = home[0];
        const az = home[1];
        const dx = p.x - ax;
        const dz = p.z - az;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < bestDist) { bestDist = d; bestSpecies = s; }
      }
      setNear(bestSpecies);
    };
    check(playerPosStore.get());
    return playerPosStore.subscribe(check);
  }, []);

  // keyboard handling — E to open, Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(null); setText(""); setReply(null); setTyping(false); return; }
      if ((e.key === "e" || e.key === "E") && near && !open) {
        setOpen(near); setTyping(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [near, open, setTyping]);

  const send = async () => {
    if (!open || !text.trim()) return;
    setBusy(true);
    setReply(null);
    try {
      const res = await fetch(`${AGENT_BASE_URL}/${open}/dialogue`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: identity, text: text.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as DialogueResponse;
      const replyText = body.speakLog?.[body.speakLog.length - 1]?.text ?? "(silence)";
      setReply(replyText);
      // mirror into agentStateStore so the bubble shows up over the chibi too.
      const existing = agentStateStore.get(open);
      agentStateStore.upsert({
        species: open,
        identity: existing?.identity ?? open,
        state: "talking",
        mood: existing?.mood ?? "happy",
        pos: existing?.pos,
        speaking: replyText,
        lastSpeakTs: Date.now(),
      });
      setTimeout(() => { setOpen(null); setText(""); setReply(null); setTyping(false); }, 1800);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {near && !open && (
        <div style={{
          position: "fixed", left: "50%", bottom: 100, transform: "translateX(-50%)",
          padding: "8px 16px", background: "rgba(48,47,44,0.9)", color: "#EFEDE3",
          border: "2px solid #EFEDE3", borderRadius: 999, fontSize: 13,
          fontFamily: "ui-sans-serif", zIndex: 35,
        }}>
          press <strong>E</strong> to talk to <strong>{near}</strong>
        </div>
      )}
      {open && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "grid", placeItems: "center", zIndex: 50,
        }}>
          <div style={{
            background: "#EFEDE3", color: "#302F2C", padding: 24, borderRadius: 12,
            border: "3px solid #302F2C", width: 480, fontFamily: "ui-sans-serif",
          }}>
            <h3 style={{ margin: "0 0 12px", fontFamily: "'Press Start 2P', monospace", fontSize: 12 }}>
              TALK TO {open.toUpperCase()}
            </h3>
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
              placeholder="hey tiger, what's on the queue?"
              disabled={busy}
              style={{
                width: "100%", padding: "10px 12px", fontSize: 14,
                border: "2px solid #302F2C", borderRadius: 6, background: "#fff",
              }}
            />
            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => { setOpen(null); setText(""); setReply(null); setTyping(false); }} style={{ background: "transparent", border: 0, fontSize: 13, opacity: 0.6, cursor: "pointer" }}>
                esc to cancel
              </button>
              <button onClick={send} disabled={busy || !text.trim()} style={{
                padding: "8px 16px", background: "#302F2C", color: "#EFEDE3",
                border: 0, borderRadius: 6, fontSize: 13, cursor: busy ? "wait" : "pointer",
              }}>
                {busy ? "thinking…" : "send →"}
              </button>
            </div>
            {reply && (
              <div style={{ marginTop: 16, padding: 12, background: "rgba(48,47,44,0.05)", borderLeft: "3px solid #302F2C", fontSize: 13 }}>
                <em>{open}:</em> {reply}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
