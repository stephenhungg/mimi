// trainer card — pokemon gen-1 style profile for an agent.
// summoned by clicking an agent in 3D. modal slides in from the right.
// see PROJECT.md "Agent profile card style: POKEMON GEN-1 TRAINER CARD".

import { useEffect, useState } from "react";
import {
  BRAND,
  SPECIES_COLOR,
  SPECIES_MOTTO,
  SPECIES_VOICE,
  type Mood,
  type Species,
} from "@mimi/types";
import { spriteUrl } from "../lib/sprites";

export interface TrainerCardData {
  species: Species;
  identity: string;
  owner?: string;
  watches?: string;
  tasksToday?: number;
  mood?: Mood;
  computePct?: number;
  tokensUsed?: number;
  tokensLimit?: number;
  memorySnippet?: string;
  down?: boolean;
}

export interface TrainerCardProps {
  card: TrainerCardData | null;
  onClose: () => void;
}

const MOOD_EMOJI: Record<Mood, string> = {
  happy: "🙂",
  focused: "👀",
  sleepy: "😴",
  sad: "🥺",
  panicked: "😵",
  sparkly: "✨",
  down: "💤",
};

export function TrainerCard({ card, onClose }: TrainerCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(card !== null);
  }, [card]);

  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, onClose]);

  if (!card) return null;

  const accent = SPECIES_COLOR[card.species];
  const motto = card.down ? "back in a sec…" : SPECIES_MOTTO[card.species];
  const computePct = card.computePct ?? 42;
  const tokensUsed = card.tokensUsed ?? 0;
  const tokensLimit = card.tokensLimit ?? 100_000;
  const tokensPct = Math.min(100, Math.round((tokensUsed / tokensLimit) * 100));
  const dim = card.down ? 0.4 : 1.0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      {/* click-outside dismiss */}
      <button
        type="button"
        aria-label="close trainer card"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "transparent",
          border: 0,
          pointerEvents: "auto",
          cursor: "default",
        }}
      />
      {/* card */}
      <aside
        role="dialog"
        aria-label={`${card.species} trainer card`}
        style={{
          position: "absolute",
          top: 24,
          right: visible ? 24 : -440,
          width: 380,
          fontFamily: "'Press Start 2P', monospace",
          color: BRAND.asphalt,
          background: BRAND.paper,
          border: `4px solid ${BRAND.asphalt}`,
          boxShadow: `8px 8px 0 ${BRAND.asphalt}`,
          padding: 0,
          transition: "right 240ms cubic-bezier(.22,1,.36,1)",
          pointerEvents: "auto",
          opacity: dim,
        }}
      >
        {/* corner triangles per species */}
        <CornerTri color={accent} pos="tl" />
        <CornerTri color={accent} pos="tr" />
        <CornerTri color={accent} pos="bl" />
        <CornerTri color={accent} pos="br" />

        {/* black header bar */}
        <header
          style={{
            background: BRAND.asphalt,
            color: BRAND.paper,
            padding: "10px 16px",
            fontSize: 10,
            letterSpacing: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>AGENT CARD</span>
          <span style={{ color: accent }}>{card.species.toUpperCase()}</span>
        </header>

        <div style={{ display: "flex", gap: 12, padding: 16 }}>
          {/* left — sprite portrait */}
          <div
            style={{
              width: 110,
              height: 140,
              background: BRAND.asphalt,
              border: `3px solid ${accent}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 6,
            }}
          >
            <img
              src={spriteUrl(card.species, card.down ? "down" : "idle")}
              alt={card.species}
              className="trainer-card-sprite"
              style={{ width: "100%", height: "auto", imageRendering: "pixelated" }}
            />
          </div>

          {/* right — stat lines */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, fontSize: 8 }}>
            <StatLine label="NAME" value={card.identity} />
            <StatLine label="OWNER" value={card.owner ?? "—"} />
            <StatLine label="WATCH" value={card.watches ?? "—"} />
            <StatLine label="VOICE" value={SPECIES_VOICE[card.species]} />
            <StatLine label="TASKS" value={String(card.tasksToday ?? 0)} />
            <StatLine
              label="MOOD"
              value={`${MOOD_EMOJI[card.mood ?? "happy"]} ${card.mood ?? "happy"}`}
            />
            <Bar label="CMP" pct={computePct} color={accent} />
            <Bar label="TOK" pct={tokensPct} color={accent} />
          </div>
        </div>

        {/* memory snippet */}
        {card.memorySnippet ? (
          <div
            style={{
              padding: "0 16px 12px",
              fontSize: 7,
              lineHeight: 1.6,
              color: "#5a5a55",
            }}
          >
            “{card.memorySnippet}”
          </div>
        ) : null}

        {/* motto strip */}
        <footer
          style={{
            background: accent,
            color: BRAND.paper,
            padding: "8px 16px",
            fontSize: 8,
            letterSpacing: 0.5,
            textAlign: "center",
            textTransform: "lowercase",
          }}
        >
          ★ {motto}
        </footer>
      </aside>
      <style>{`
        @keyframes idleBob {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-3px); }
        }
        .trainer-card-sprite { animation: idleBob 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
      <span style={{ color: "#777" }}>{label}</span>
      <span style={{ textAlign: "right", textTransform: "lowercase" }}>{value}</span>
    </div>
  );
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: "#777", width: 28 }}>{label}</span>
      <div
        style={{
          flex: 1,
          height: 8,
          background: "#dad7cb",
          border: `1px solid ${BRAND.asphalt}`,
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
      <span style={{ width: 24, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function CornerTri({ color, pos }: { color: string; pos: "tl" | "tr" | "bl" | "br" }) {
  const size = 14;
  const base: React.CSSProperties = {
    position: "absolute",
    width: 0,
    height: 0,
    borderStyle: "solid",
  };
  if (pos === "tl") {
    return <span style={{ ...base, top: 0, left: 0, borderWidth: `${size}px 0 0 ${size}px`, borderColor: `${color} transparent transparent transparent` }} />;
  }
  if (pos === "tr") {
    return <span style={{ ...base, top: 0, right: 0, borderWidth: `${size}px ${size}px 0 0`, borderColor: `${color} ${color} transparent transparent` }} />;
  }
  if (pos === "bl") {
    return <span style={{ ...base, bottom: 0, left: 0, borderWidth: `0 0 ${size}px ${size}px`, borderColor: `transparent transparent ${color} transparent` }} />;
  }
  return <span style={{ ...base, bottom: 0, right: 0, borderWidth: `0 0 ${size}px ${size}px`, borderColor: `transparent transparent ${color} ${color}` }} />;
}
