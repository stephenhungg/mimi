// onboarding flow — pick your human chibi → pick your squad → assign to shared workspace.
// 4 steps. simplified: persists to localStorage (no auth in v1). links into apps/web on finish.

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Species = "tiger" | "otter" | "bunny" | "dog" | "giraffe";

const SPECIES_OPTIONS: Array<{
  id: Species;
  label: string;
  watches: string;
  motto: string;
  color: string;
  sprite: string;
}> = [
  { id: "tiger",   label: "tiger",   watches: "github",    motto: "tests are sacred",          color: "var(--accent-tiger)",   sprite: "/tiger.png" },
  { id: "otter",   label: "otter",   watches: "gmail",     motto: "no email left behind",      color: "var(--accent-otter)",   sprite: "/otter.png" },
  { id: "bunny",   label: "bunny",   watches: "calendar",  motto: "always five minutes early", color: "var(--accent-bunny)",   sprite: "/bunny.png" },
  { id: "dog",     label: "mimi",    watches: "oversight", motto: "everyone goes home safe",   color: "var(--accent-dog)",     sprite: "/dog.png" },
  { id: "giraffe", label: "giraffe", watches: "notion",    motto: "i wrote that down",         color: "var(--accent-giraffe)", sprite: "/giraffe.png" },
];

const VIBES = [
  "dry/technical", "warm/social", "chipper/punctual", "warm/leader",
  "thoughtful", "sparkly", "stoic", "chatty",
];

const SKIN_TONES = ["#f3d6b5", "#e7b08a", "#c08862", "#7a4f30"];
const HAIR_COLORS = ["#2b2118", "#7a4f30", "#d7a55a", "#b0386a"];
const OUTFIT_COLORS = ["#3b82f6", "#ec4899", "#10b981", "#f59e0b"];

interface SquadAgent {
  species: Species;
  vibe: string;
}

interface OnboardState {
  humanSkin: number;
  humanHair: number;
  humanOutfit: number;
  squad: SquadAgent[];
}

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:5173";

export default function Onboard() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [state, setState] = useState<OnboardState>({
    humanSkin: 1,
    humanHair: 0,
    humanOutfit: 0,
    squad: [],
  });

  const toggleSquad = (species: Species) => {
    setState((s) => {
      const exists = s.squad.find((a) => a.species === species);
      if (exists) return { ...s, squad: s.squad.filter((a) => a.species !== species) };
      if (s.squad.length >= 4) return s; // cap at 4
      return { ...s, squad: [...s.squad, { species, vibe: VIBES[0]! }] };
    });
  };

  const setVibe = (species: Species, vibe: string) => {
    setState((s) => ({
      ...s,
      squad: s.squad.map((a) => (a.species === species ? { ...a, vibe } : a)),
    }));
  };

  const finish = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mimi_onboard", JSON.stringify(state));
      const identity = `human-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("mimi_identity", identity);
    }
    window.location.href = WEB_URL;
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--asphalt)", padding: "48px 24px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, opacity: 0.7, marginBottom: 32 }}>
          ← back to mimi.
        </Link>
        <Steps step={step} />

        {step === 1 && (
          <Card title="step 1 — your human chibi" subtitle="pick how you look. you won't see your own body (first-person), but other humans will.">
            <SwatchRow label="skin" colors={SKIN_TONES} selected={state.humanSkin} onChange={(i) => setState({ ...state, humanSkin: i })} />
            <SwatchRow label="hair" colors={HAIR_COLORS} selected={state.humanHair} onChange={(i) => setState({ ...state, humanHair: i })} />
            <SwatchRow label="outfit" colors={OUTFIT_COLORS} selected={state.humanOutfit} onChange={(i) => setState({ ...state, humanOutfit: i })} />
            <NavButtons onNext={() => setStep(2)} />
          </Card>
        )}

        {step === 2 && (
          <Card title="step 2 — build your squad" subtitle="pick 1–4 agents. tiger watches github, otter watches gmail, bunny watches calendar, mimi is the dog (oversight), giraffe watches notion.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
              {SPECIES_OPTIONS.map((s) => {
                const selected = !!state.squad.find((a) => a.species === s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSquad(s.id)}
                    className="sticker"
                    style={{
                      background: selected ? s.color : "var(--paper)",
                      color: selected ? "var(--paper)" : "var(--asphalt)",
                      padding: 14,
                      cursor: "pointer",
                      transition: "transform 120ms ease",
                      transform: selected ? "translate(-2px, -2px)" : "none",
                    }}
                  >
                    <Image src={s.sprite} alt={s.label} width={90} height={90} style={{ margin: "0 auto 8px", height: "auto" }} />
                    <div className="pixel" style={{ fontSize: 10, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 11, opacity: 0.75 }}>{s.watches}</div>
                  </button>
                );
              })}
            </div>
            <NavButtons onBack={() => setStep(1)} onNext={state.squad.length > 0 ? () => setStep(3) : undefined} />
          </Card>
        )}

        {step === 3 && (
          <Card title="step 3 — pick each agent's vibe" subtitle="voice cluster + personality. shows up in animalese cadence + tool-call habits.">
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              {state.squad.map((a) => {
                const opt = SPECIES_OPTIONS.find((s) => s.id === a.species)!;
                return (
                  <div key={a.species} className="sticker" style={{ background: "var(--paper)", padding: 16, display: "flex", gap: 16, alignItems: "center" }}>
                    <Image src={opt.sprite} alt="" width={60} height={60} style={{ height: "auto" }} />
                    <div style={{ flex: 1 }}>
                      <div className="pixel" style={{ fontSize: 10, marginBottom: 6, color: opt.color }}>
                        {opt.label.toUpperCase()}
                      </div>
                      <select
                        value={a.vibe}
                        onChange={(e) => setVibe(a.species, e.target.value)}
                        style={{
                          padding: 8,
                          border: "2px solid var(--asphalt)",
                          background: "var(--paper)",
                          color: "var(--asphalt)",
                          fontSize: 14,
                          width: "100%",
                          borderRadius: 6,
                        }}
                      >
                        {VIBES.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
            <NavButtons onBack={() => setStep(2)} onNext={() => setStep(4)} />
          </Card>
        )}

        {step === 4 && (
          <Card title="step 4 — you're set" subtitle="your squad will be assigned to the shared workspace. click below to enter the room.">
            <Summary state={state} />
            <NavButtons
              onBack={() => setStep(3)}
              onNext={finish}
              nextLabel="enter the room →"
            />
          </Card>
        )}
      </div>
    </main>
  );
}

function Steps({ step }: { step: number }) {
  const labels = ["chibi", "squad", "vibes", "enter"];
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
      {labels.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div
            key={label}
            className="pixel"
            style={{
              flex: 1,
              padding: "12px 16px",
              border: "3px solid var(--asphalt)",
              background: active ? "var(--asphalt)" : done ? "var(--paper-2)" : "var(--paper)",
              color: active ? "var(--paper)" : "var(--asphalt)",
              fontSize: 10,
              textAlign: "center",
              opacity: done ? 0.6 : 1,
            }}
          >
            {n}. {label}
          </div>
        );
      })}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="sticker" style={{ background: "var(--paper)", padding: 32 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 600 }}>{title}</h2>
      <p style={{ margin: "0 0 24px", opacity: 0.7, fontSize: 15 }}>{subtitle}</p>
      {children}
    </div>
  );
}

function SwatchRow({ label, colors, selected, onChange }: { label: string; colors: string[]; selected: number; onChange: (i: number) => void }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", gap: 12 }}>
        {colors.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            aria-label={`${label} ${i}`}
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              border: selected === i ? "4px solid var(--asphalt)" : "2px solid #c0bcae",
              background: c,
              cursor: "pointer",
              transition: "transform 120ms",
              transform: selected === i ? "translate(-2px, -2px)" : "none",
              boxShadow: selected === i ? "4px 4px 0 var(--asphalt)" : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function NavButtons({ onBack, onNext, nextLabel }: { onBack?: () => void; onNext?: () => void; nextLabel?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      {onBack ? (
        <button type="button" onClick={onBack} className="pill" style={{ background: "var(--paper)", color: "var(--asphalt)" }}>
          ← back
        </button>
      ) : <span />}
      {onNext ? (
        <button type="button" onClick={onNext} className="pill">
          {nextLabel ?? "next →"}
        </button>
      ) : (
        <span style={{ opacity: 0.5, fontSize: 13, alignSelf: "center" }}>pick at least one agent</span>
      )}
    </div>
  );
}

function Summary({ state }: { state: OnboardState }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 16, fontSize: 14 }}>
        <strong>your chibi:</strong>{" "}
        <SwatchDot c={SKIN_TONES[state.humanSkin]!} />
        <SwatchDot c={HAIR_COLORS[state.humanHair]!} />
        <SwatchDot c={OUTFIT_COLORS[state.humanOutfit]!} />
      </div>
      <div style={{ fontSize: 14, marginBottom: 8 }}><strong>squad ({state.squad.length}):</strong></div>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8 }}>
        {state.squad.map((a) => (
          <li key={a.species}>
            {SPECIES_OPTIONS.find((s) => s.id === a.species)?.label} — vibe: <em>{a.vibe}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SwatchDot({ c }: { c: string }) {
  return <span style={{ display: "inline-block", width: 18, height: 18, borderRadius: 4, border: "2px solid var(--asphalt)", background: c, marginRight: 4, verticalAlign: "middle" }} />;
}
