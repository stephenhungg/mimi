// mimi. animalese — procedural chirp synth + subtitle reveal.
// no TTS service. browser web audio only. char-by-char blip with species voice cluster.
//
// porting credit: pacing rules + cluster tuning patterns inspired by angel's
// animalese synth (square consonants + triangle vowels, lowpass biquad, downward
// pitch glide, punctuation pacing, emotion speed mults). re-tuned for mimi's
// 5 named voice clusters: dry, warm, chipper, leader, thoughtful.
//
// usage:
//   await animalese().speak("hello world", { voice: "dry", onChar: (c, i) => ... });

import type { VoiceCluster } from "@mimi/types";

export type AnimaleseEmotion = "neutral" | "happy" | "excited" | "thinking" | "soft" | "focused";

export interface ClusterCfg {
  basePitchHz: number;
  pitchVar: number; // ± semitones jitter range
  speedMul: number; // 1.0 = baseline
  feel: string;     // documentation only
}

// per-cluster tuning. tweak these to taste — they drive every chirp.
// asphalt+paper brand vibe: each species reads distinct enough to identify
// from across the room without sounding like instruments. dog=warm leader,
// tiger=low+grounded, bunny=high+playful, otter=warm+melodic, giraffe=neutral.
export const CLUSTERS: Record<VoiceCluster, ClusterCfg> = {
  dry:        { basePitchHz: 320, pitchVar: 1.0, speedMul: 0.95, feel: "low + grounded" },        // tiger
  warm:       { basePitchHz: 460, pitchVar: 1.4, speedMul: 1.00, feel: "warm + melodic" },        // otter
  chipper:    { basePitchHz: 540, pitchVar: 2.2, speedMul: 1.05, feel: "high + playful" },        // bunny
  leader:     { basePitchHz: 480, pitchVar: 1.5, speedMul: 1.00, feel: "bright + soft" },         // dog/mimi
  thoughtful: { basePitchHz: 380, pitchVar: 1.2, speedMul: 0.90, feel: "neutral + deliberate" },  // giraffe
};

const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);

export interface SpeakOptions {
  voice?: VoiceCluster;
  emotion?: AnimaleseEmotion;
  /** fires once per char as it's voiced — used to drive the subtitle typewriter reveal */
  onChar?: (char: string, index: number, isLast: boolean) => void;
  onDone?: () => void;
  /** master volume 0..1 — multiplied with envelope peak */
  volume?: number;
}

// emotion → speed multiplier. layered on top of cluster speedMul.
const EMOTION_SPEED: Record<AnimaleseEmotion, number> = {
  excited:  1.20,
  happy:    1.05,
  thinking: 0.85,
  soft:     0.90,
  focused:  1.00,
  neutral:  1.00,
};

// ─── audio context (singleton, lazily created) ──────────────────────────────

let _ctx: AudioContext | null = null;
function ctx(): AudioContext {
  if (_ctx) return _ctx;
  const Ctor =
    (globalThis as any).AudioContext ??
    (globalThis as any).webkitAudioContext;
  if (!Ctor) throw new Error("animalese: AudioContext unavailable (run in a browser).");
  _ctx = new Ctor() as AudioContext;
  return _ctx;
}

/** must be called after a user gesture in browsers that suspend audio. */
export async function unlockAudio(): Promise<void> {
  try {
    const c = ctx();
    if (c.state === "suspended") await c.resume();
  } catch { /* ignore — no audio is fine */ }
}

// ─── per-char chirp ─────────────────────────────────────────────────────────

interface ChirpOpts {
  cfg: ClusterCfg;
  pitchBoost: number; // semitones added (e.g., from `?` or `!`)
  speedMul: number;
  volume: number;
}

function chirp(c: string, o: ChirpOpts): { duration: number } {
  const audio = ctx();
  const lower = c.toLowerCase();
  const isVowel = VOWELS.has(lower);
  const code = lower.charCodeAt(0);

  // deterministic jitter per char so the same word always sounds the same.
  const jitter = ((code * 9301 + 49297) % 233280) / 233280; // 0..1
  const semitoneOffset = (jitter * 2 - 1) * o.cfg.pitchVar + o.pitchBoost + (isVowel ? -2 : 0);
  const pitch = o.cfg.basePitchHz * Math.pow(2, semitoneOffset / 12);

  // vowels longer (sustained), consonants tighter (percussive).
  const baseMs = isVowel ? 65 : 38;
  const duration = (baseMs / 1000) / o.speedMul;

  const now = audio.currentTime;
  const osc = audio.createOscillator();
  // triangle = rounder (vowel), square = clipped (consonant).
  osc.type = isVowel ? "triangle" : "square";
  osc.frequency.setValueAtTime(pitch, now);
  // tiny downward glide makes it feel "spoken" not "beeped".
  osc.frequency.exponentialRampToValueAtTime(Math.max(60, pitch * 0.85), now + duration);

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(o.volume, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  // gentle low-pass rounds off the square-wave grit so it's not abrasive.
  const lp = audio.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(2400, now);
  lp.Q.setValueAtTime(0.7, now);

  osc.connect(lp).connect(gain).connect(audio.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);

  return { duration };
}

// ─── speak ──────────────────────────────────────────────────────────────────

let _abort = false;

/** cancel any in-flight utterance — call on dialogue close or speech-bubble dismiss. */
export function cancelAnimalese(): void {
  _abort = true;
}

async function _speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  _abort = false;
  await unlockAudio();
  const voice: VoiceCluster = opts.voice ?? "warm";
  const cfg = CLUSTERS[voice];
  const emotion: AnimaleseEmotion = opts.emotion ?? "neutral";
  const volume = Math.max(0, Math.min(1, opts.volume ?? 0.35));

  const baseSpeed = (EMOTION_SPEED[emotion] ?? 1.0) * cfg.speedMul;
  // soft → less varied, excited → more wobbly.
  const pitchMul =
    emotion === "soft" ? 0.6 :
    emotion === "excited" ? 1.4 : 1.0;
  const tunedCfg: ClusterCfg = { ...cfg, pitchVar: cfg.pitchVar * pitchMul };

  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    if (_abort) break;
    const ch = chars[i]!;
    const isLast = i === chars.length - 1;

    let pitchBoost = 0;
    let charSpeed = baseSpeed;
    let pause = 0;

    // punctuation pacing — feels surprisingly like speech.
    if (ch === ".") pause = 200;
    else if (ch === ",") pause = 100;
    else if (ch === "?") pitchBoost = 2.5;
    else if (ch === "!") { pitchBoost = 3; charSpeed *= 1.1; }
    else if (ch === " " || ch === "\n" || ch === "\t") pause = 30;

    if (/[a-z0-9]/i.test(ch)) {
      const { duration } = chirp(ch, {
        cfg: tunedCfg,
        pitchBoost,
        speedMul: charSpeed,
        volume,
      });
      opts.onChar?.(ch, i, isLast);
      await sleep(duration * 1000 + 8);
    } else {
      opts.onChar?.(ch, i, isLast);
      if (pause > 0) await sleep(pause);
    }
  }
  if (!_abort) opts.onDone?.();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── public api (back-compat wrapper) ───────────────────────────────────────

// existing call sites use `animalese().speak(text, opts)`. preserve that shape
// while exposing the lower-level `speakAnimalese` for direct use.
export class Animalese {
  async resume(): Promise<void> {
    await unlockAudio();
  }
  async speak(text: string, opts: SpeakOptions = {}): Promise<void> {
    return _speak(text, opts);
  }
}

let _shared: Animalese | null = null;
export function animalese(): Animalese {
  if (!_shared) _shared = new Animalese();
  return _shared;
}

// also expose the function-shaped api for direct import.
export const speakAnimalese = _speak;
