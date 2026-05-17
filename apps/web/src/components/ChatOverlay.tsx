// in-room group chat. fixed bottom-left panel.
// T -> focus; Enter -> POST /api/team-chat (orchestrator pattern: mimi
// classifies + dispatches to relevant agents).
// shows user messages + agent_speak lines from chatStore (poll-fed).

import { useEffect, useMemo, useRef, useState } from "react";
import { BRAND } from "@mimi/types";
import { chatStore, type ChatRow } from "../lib/room-context";
import { useTyping } from "../lib/typing";

const SHOWN = 10;

const TEAM_CHAT_URL =
  (import.meta as { env?: { VITE_TEAM_CHAT_URL?: string } }).env?.VITE_TEAM_CHAT_URL ??
  "http://localhost:3000/api/team-chat";

interface RoutingState {
  pending: boolean;
  reasoning?: string;
  responders?: string[];
  error?: string;
}

export function ChatOverlay({ identity, name }: { identity: string; name: string }) {
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const [routing, setRouting] = useState<RoutingState>({ pending: false });
  const { typing, setTyping } = useTyping();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => chatStore.subscribe(setRows), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (focused || typing) return;
      if (e.code === "KeyT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused, typing]);

  const recent = useMemo(() => rows.slice(-SHOWN), [rows]);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    // echo my message locally for instant feedback.
    chatStore.push({ kind: "chat", identity, name, text, ts: Date.now() });
    setDraft("");
    setRouting({ pending: true });
    try {
      const res = await fetch(TEAM_CHAT_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ from: identity, text }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        setRouting({ pending: false, error: `chat ${res.status}: ${body.slice(0, 100)}` });
        return;
      }
      const body = (await res.json()) as { responders?: string[]; reasoning?: string };
      setRouting({ pending: false, reasoning: body.reasoning, responders: body.responders });
      // agents will reply via the poll loop; reset routing badge after 6s.
      setTimeout(() => setRouting({ pending: false }), 6000);
    } catch (e) {
      setRouting({ pending: false, error: (e as Error).message });
    }
  }

  return (
    <div
      style={{
        position: "fixed", left: 16, bottom: 64, width: 380, maxWidth: "40vw",
        zIndex: 20, fontFamily: BRAND.pixelFont, fontSize: 9,
        color: BRAND.paper, userSelect: "none",
      }}
    >
      <div
        style={{
          display: "flex", flexDirection: "column", gap: 4,
          padding: "10px 12px", background: "rgba(48, 47, 44, 0.78)",
          border: `1px solid ${BRAND.paper}`, borderRadius: 10,
          marginBottom: 6, minHeight: 80, maxHeight: 240, overflow: "hidden",
        }}
      >
        {recent.length === 0 ? (
          <div style={{ opacity: 0.5, lineHeight: 1.6 }}>chat is empty. press T to say hi to the team.</div>
        ) : (
          recent.map((m, i) => {
            const age = recent.length - 1 - i;
            const opacity = Math.max(0.35, 1 - age * 0.08);
            const isAgent = m.kind === "agent_speak";
            return (
              <div key={`${m.ts}-${i}`} style={{ opacity, lineHeight: 1.6 }}>
                {isAgent ? (
                  <span style={{ fontStyle: "italic" }}>
                    {m.name} ~chirped~ {m.text}
                  </span>
                ) : (
                  <span>
                    <span style={{ color: "#a5b4ff" }}>{m.name}:</span> {m.text}
                  </span>
                )}
              </div>
            );
          })
        )}
        {(routing.pending || routing.reasoning || routing.error) && (
          <div style={{ marginTop: 6, padding: "6px 8px", background: "rgba(234, 179, 8, 0.15)", borderLeft: "3px solid #eab308", lineHeight: 1.5 }}>
            {routing.pending && <span>mimi is routing…</span>}
            {routing.reasoning && (
              <>
                <div style={{ opacity: 0.7 }}>mimi: {routing.reasoning}</div>
                {routing.responders && routing.responders.length > 0 && (
                  <div style={{ opacity: 0.85 }}>→ {routing.responders.join(", ")}</div>
                )}
              </>
            )}
            {routing.error && <span style={{ color: "#ff9a9a" }}>error: {routing.error}</span>}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); void send(); }}
        style={{ display: "flex", gap: 6, alignItems: "center" }}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => { setFocused(true); setTyping(true); }}
          onBlur={() => { setFocused(false); setTyping(false); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              inputRef.current?.blur();
            }
          }}
          placeholder={focused ? "message the team… (esc to close)" : "press T to chat with the team"}
          style={{
            flex: 1, padding: "8px 10px",
            background: BRAND.paper, color: BRAND.asphalt,
            border: `1px solid ${BRAND.paper}`, borderRadius: 8,
            fontFamily: BRAND.pixelFont, fontSize: 9,
            outline: focused ? `2px solid #a5b4ff` : "none",
          }}
        />
      </form>
    </div>
  );
}
