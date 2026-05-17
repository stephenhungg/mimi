// in-room group chat. fixed bottom-left panel.
// T -> focus; Enter -> POST /api/team-chat (orchestrator pattern: mimi
// classifies + dispatches to relevant agents).
// shows user messages + agent_speak lines from chatStore (poll-fed).

import { useEffect, useMemo, useRef, useState } from "react";
import { BRAND } from "@mimi/types";
import { chatStore, type ChatRow } from "../lib/room-context";
import { useTyping } from "../lib/typing";

const SHOWN = 10;
const TURN_LIMIT = 8;
const ECHO_TICK_DELAY_MS = 1600;

const TEAM_CHAT_URL =
  (import.meta as { env?: { VITE_TEAM_CHAT_URL?: string } }).env?.VITE_TEAM_CHAT_URL ??
  "http://localhost:3000/api/team-chat";

interface TranscriptTurn {
  speaker: string;
  text: string;
}

interface TeamChatResponse {
  responders?: string[];
  reasoning?: string;
  round?: number;
  capped?: boolean;
  terminated?: boolean;
}

interface RoutingState {
  pending: boolean;
  reasoning?: string;
  responders?: string[];
  round?: number;
  error?: string;
}

interface EchoSession {
  id: number;
  active: boolean;
  startedAt: number;
  round: number;
  transcript: TranscriptTurn[];
  processed: Set<string>;
  buffer: ChatRow[];
  inFlight: boolean;
}

export function ChatOverlay({ identity, name }: { identity: string; name: string }) {
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const [routing, setRouting] = useState<RoutingState>({ pending: false });
  const { typing, setTyping } = useTyping();
  const inputRef = useRef<HTMLInputElement>(null);
  const echoRef = useRef<EchoSession | null>(null);
  const echoIdRef = useRef(0);
  const echoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    const echo = echoRef.current;
    if (!echo?.active) return;

    const fresh = rows.filter((row) => {
      if (row.kind !== "agent_speak") return false;
      if (row.ts < echo.startedAt) return false;
      const key = chatRowKey(row);
      if (echo.processed.has(key)) return false;
      echo.processed.add(key);
      return true;
    });

    if (fresh.length === 0) return;
    echo.buffer.push(...fresh);
    if (!echo.inFlight) scheduleEchoTick();
  }, [rows]);

  useEffect(() => {
    return () => {
      if (echoTimerRef.current) clearTimeout(echoTimerRef.current);
    };
  }, []);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    // echo my message locally for instant feedback.
    chatStore.push({ kind: "chat", identity, name, text, ts: Date.now() });
    setDraft("");
    setRouting({ pending: true });
    clearEchoTimer();

    const echoId = ++echoIdRef.current;
    const transcript = [{ speaker: identity, text }];
    echoRef.current = {
      id: echoId,
      active: true,
      startedAt: Date.now() - 1000,
      round: 0,
      transcript,
      processed: new Set(),
      buffer: [],
      inFlight: true,
    };

    try {
      const body = await postTeamChat({ from: identity, text });
      if (echoRef.current?.id !== echoId) return;

      const round = body.round ?? 1;
      const responders = body.responders ?? [];
      const stillActive = !body.capped && !body.terminated && responders.length > 0 && round < TURN_LIMIT;
      if (!stillActive) {
        echoRef.current = null;
        setRouting({ pending: false, reasoning: body.reasoning, responders, round });
        return;
      }

      const echo = echoRef.current;
      echo.round = round;
      echo.inFlight = false;
      setRouting({ pending: false, reasoning: body.reasoning, responders, round });
      if (echo.buffer.length > 0) scheduleEchoTick();
      // agents will reply via the poll loop; reset routing badge after 6s.
      setTimeout(() => setRouting({ pending: false }), 6000);
    } catch (e) {
      echoRef.current = null;
      setRouting({ pending: false, error: (e as Error).message });
    }
  }

  function clearEchoTimer() {
    if (!echoTimerRef.current) return;
    clearTimeout(echoTimerRef.current);
    echoTimerRef.current = null;
  }

  function scheduleEchoTick() {
    if (echoTimerRef.current) return;
    echoTimerRef.current = setTimeout(() => {
      echoTimerRef.current = null;
      void runEchoTick();
    }, ECHO_TICK_DELAY_MS);
  }

  async function runEchoTick() {
    const echo = echoRef.current;
    if (!echo?.active || echo.inFlight) return;
    if (echo.round >= TURN_LIMIT) {
      echoRef.current = null;
      return;
    }

    const batch = echo.buffer.splice(0, echo.buffer.length);
    if (batch.length === 0) return;

    const turn = rowsToTranscriptTurn(batch);
    const nextTranscript = [...echo.transcript, turn].slice(-12);
    const requestRound = echo.round;
    const echoId = echo.id;
    echo.inFlight = true;
    setRouting({ pending: true, round: requestRound + 1 });

    try {
      const body = await postTeamChat({
        from: turn.speaker,
        text: turn.text,
        transcript: echo.transcript,
        round: requestRound,
      });
      if (echoRef.current?.id !== echoId) return;

      const current = echoRef.current;
      const round = body.round ?? requestRound + 1;
      const responders = body.responders ?? [];
      const stillActive = !body.capped && !body.terminated && responders.length > 0 && round < TURN_LIMIT;
      current.transcript = nextTranscript;
      current.round = round;
      current.inFlight = false;
      setRouting({ pending: false, reasoning: body.reasoning, responders, round });

      if (!stillActive) {
        echoRef.current = null;
        return;
      }
      if (current.buffer.length > 0) scheduleEchoTick();
    } catch (e) {
      if (echoRef.current?.id === echoId) echoRef.current = null;
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
                <div style={{ opacity: 0.7 }}>
                  mimi{routing.round ? ` r${routing.round}/${TURN_LIMIT}` : ""}: {routing.reasoning}
                </div>
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

async function postTeamChat(body: {
  from: string;
  text: string;
  transcript?: TranscriptTurn[];
  round?: number;
}): Promise<TeamChatResponse> {
  const res = await fetch(TEAM_CHAT_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`chat ${res.status}: ${text.slice(0, 100)}`);
  }
  return await res.json() as TeamChatResponse;
}

function rowsToTranscriptTurn(rows: ChatRow[]): TranscriptTurn {
  if (rows.length === 1) {
    return { speaker: rows[0]!.identity, text: rows[0]!.text };
  }
  return {
    speaker: "agents",
    text: rows.map((row) => `${row.name}: ${row.text}`).join("\n"),
  };
}

function chatRowKey(row: ChatRow): string {
  return `${row.identity}:${row.ts}:${row.text}`;
}
