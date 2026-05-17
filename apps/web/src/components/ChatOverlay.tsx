// in-room text chat. fixed bottom-left panel, asphalt frame + paper text.
// T -> focus -> Enter to send (publishes a `chat` Broadcast).
// Esc -> blur, returning WASD control via TypingProvider.

import { useEffect, useMemo, useRef, useState } from "react";
import { BRAND } from "@mimi/types";
import { useMimiRoomContext } from "../lib/room-context";
import { useTyping } from "../lib/typing";

const SHOWN = 10;

interface ChatOverlayProps {
  identity: string;
  name: string;
}

export function ChatOverlay({ identity, name }: ChatOverlayProps) {
  const { chat, broadcast } = useMimiRoomContext();
  const { typing, setTyping } = useTyping();
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // T to focus (unless already typing somewhere).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (focused) return;
      if (typing) return;
      if (e.code === "KeyT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused, typing]);

  const recent = useMemo(() => chat.slice(-SHOWN), [chat]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    broadcast({ type: "chat", identity, name, text });
    setDraft("");
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        bottom: 64,
        width: 380,
        maxWidth: "40vw",
        zIndex: 20,
        fontFamily: BRAND.pixelFont,
        fontSize: 9,
        color: BRAND.paper,
        userSelect: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: "10px 12px",
          background: "rgba(48, 47, 44, 0.78)",
          border: `1px solid ${BRAND.paper}`,
          borderRadius: 10,
          marginBottom: 6,
          minHeight: 80,
          maxHeight: 240,
          overflow: "hidden",
        }}
      >
        {recent.length === 0 ? (
          <div style={{ opacity: 0.5, lineHeight: 1.6 }}>chat is empty. press T to say hi.</div>
        ) : (
          recent.map((m, i) => {
            // fade older messages near the top.
            const age = recent.length - 1 - i;
            const opacity = Math.max(0.35, 1 - age * 0.08);
            const isAgent = m.kind === "agent_speak";
            return (
              <div key={`${m.ts}-${i}`} style={{ opacity, lineHeight: 1.6 }}>
                {isAgent ? (
                  <span style={{ fontStyle: "italic", color: BRAND.paper }}>
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
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        style={{ display: "flex", gap: 6, alignItems: "center" }}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => {
            setFocused(true);
            setTyping(true);
          }}
          onBlur={() => {
            setFocused(false);
            setTyping(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              inputRef.current?.blur();
            }
          }}
          placeholder={focused ? "say something… (esc to close)" : "press T to chat"}
          style={{
            flex: 1,
            padding: "8px 10px",
            background: BRAND.paper,
            color: BRAND.asphalt,
            border: `1px solid ${BRAND.paper}`,
            borderRadius: 8,
            fontFamily: BRAND.pixelFont,
            fontSize: 9,
            outline: focused ? `2px solid #a5b4ff` : "none",
          }}
        />
      </form>
    </div>
  );
}
