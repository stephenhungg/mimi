// chat overlay — fixed bottom-left, shows recent agent speech.
// reads agentStateStore (polled from notion) and renders the latest 10 speak
// lines as a passive log. local user messages are not multiplayer-routed in
// v1; this is read-only.

import { useEffect, useState } from "react";
import { agentStateStore, type AgentLiveState } from "../lib/room-context";

interface ChatRow {
  identity: string;
  species: string;
  text: string;
  ts: number;
}

export function ChatOverlay({ identity: _identity, name: _name }: { identity: string; name: string }) {
  const [rows, setRows] = useState<ChatRow[]>([]);

  useEffect(() => {
    // dedup by (identity, ts) so we don't spam the log when polls return the
    // same speak repeatedly.
    const seen = new Set<string>();
    return agentStateStore.subscribe((snap) => {
      const next: ChatRow[] = [];
      for (const a of snap.values()) {
        if (!a.speaking || !a.lastSpeakTs) continue;
        const key = `${a.identity}@${a.lastSpeakTs}`;
        if (seen.has(key)) continue;
        seen.add(key);
        next.push({ identity: a.identity, species: a.species, text: a.speaking, ts: a.lastSpeakTs });
      }
      if (next.length === 0) return;
      setRows((prev) => [...prev, ...next].slice(-10));
    });
  }, []);

  if (rows.length === 0) return null;
  return (
    <div style={{
      position: "fixed", left: 20, bottom: 20, width: 380, maxHeight: 260, overflow: "hidden",
      background: "rgba(48, 47, 44, 0.92)", color: "var(--paper, #EFEDE3)",
      border: "3px solid var(--asphalt, #302F2C)", borderRadius: 8, padding: "10px 14px",
      fontFamily: "ui-sans-serif, system-ui", fontSize: 13, lineHeight: 1.5,
      backdropFilter: "blur(6px)", zIndex: 30,
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      {rows.map((r) => (
        <div key={`${r.identity}-${r.ts}`} style={{ opacity: 0.95 }}>
          <em style={{ opacity: 0.6 }}>{r.species} ~chirped~</em> {r.text}
        </div>
      ))}
    </div>
  );
}
