// mimi. animalese — procedural chirp synth + subtitle reveal.
// no TTS service. browser web audio only. char-by-char blip with species voice cluster.
// usage:
//   const a = new Animalese();
//   await a.speak("hello world", { voice: "dry", onChar: (c, i) => updateSubtitle(c, i) });

import type { VoiceCluster } from "@mimi/types";

export interface VoiceProfile {
  // base pitch hz for "a" (other letters offset from here).
  basePitch: number;
  // ms per char (lower = faster speaker).
  charMs: number;
  // oscillator type — sine = soft, triangle = chirpier, square = sharp.
  wave: OscillatorType;
  // randomization range for pitch jitter (hz).
  jitter: number;
  // amplitude 0..1.
  amp: number;
}

export const VOICE_PROFILES: Record<VoiceCluster, VoiceProfile> = {
  dry:        { basePitch: 220, charMs: 55, wave: "square",   jitter: 10, amp: 0.18 },
  warm:       { basePitch: 280, charMs: 60, wave: "sine",     jitter: 18, amp: 0.22 },
  chipper:    { basePitch: 380, charMs: 45, wave: "triangle", jitter: 30, amp: 0.20 },
  leader:     { basePitch: 240, charMs: 65, wave: "sine",     jitter: 12, amp: 0.25 },
  thoughtful: { basePitch: 200, charMs: 75, wave: "triangle", jitter: 8,  amp: 0.18 },
};

export interface SpeakOptions {
  voice?: VoiceCluster;
  /** callback per char as it's spoken — drive typewriter subtitle reveal. */
  onChar?: (char: string, index: number, total: number) => void;
  /** called when full utterance done. */
  onDone?: () => void;
  /** master volume 0..1, multiplied with profile amp. */
  volume?: number;
}

export class Animalese {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  private ensure(): { ctx: AudioContext; master: GainNode } {
    if (this.ctx && this.master) return { ctx: this.ctx, master: this.master };
    const AudioCtx = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext;
    if (!AudioCtx) throw new Error("animalese: AudioContext unavailable (run in a browser).");
    const ctx = new AudioCtx() as AudioContext;
    const master = ctx.createGain();
    master.gain.value = 1.0;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    return { ctx, master };
  }

  /** must be called after a user gesture in browsers that suspend audio. */
  async resume(): Promise<void> {
    const { ctx } = this.ensure();
    if (ctx.state === "suspended") await ctx.resume();
  }

  /** speak `text` in the given voice. resolves when done.
   *  driven by setTimeout, not strict audio scheduling — close enough for chibis. */
  async speak(text: string, opts: SpeakOptions = {}): Promise<void> {
    const profile = VOICE_PROFILES[opts.voice ?? "warm"];
    const volume = opts.volume ?? 1.0;
    const chars = [...text];

    await this.resume();
    const { ctx, master } = this.ensure();

    return new Promise<void>((resolve) => {
      let i = 0;
      const step = () => {
        if (i >= chars.length) {
          opts.onDone?.();
          resolve();
          return;
        }
        const ch = chars[i]!;
        opts.onChar?.(ch, i, chars.length);
        // only chirp on visible/letter chars. spaces/punctuation = silent gap.
        if (/[a-zA-Z0-9]/.test(ch)) {
          this.chirp(ctx, master, ch, profile, volume);
        }
        i++;
        setTimeout(step, profile.charMs);
      };
      step();
    });
  }

  private chirp(ctx: AudioContext, master: GainNode, ch: string, p: VoiceProfile, volMult: number) {
    const code = ch.toLowerCase().charCodeAt(0);
    // map a..z (97..122) to pitch range. digits map similarly.
    const offset = ((code - 97) / 25) * 280; // 0..~280 hz spread above base
    const jitter = (Math.random() - 0.5) * 2 * p.jitter;
    const pitch = Math.max(60, p.basePitch + offset + jitter);
    const dur = p.charMs / 1000 * 0.9;

    const osc = ctx.createOscillator();
    osc.type = p.wave;
    osc.frequency.setValueAtTime(pitch, ctx.currentTime);
    // slight downward glide for charm.
    osc.frequency.linearRampToValueAtTime(pitch * 0.9, ctx.currentTime + dur);

    const gain = ctx.createGain();
    const peak = p.amp * volMult;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(peak, ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);

    osc.connect(gain).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }
}

// convenience singleton — most apps want one shared context.
let _shared: Animalese | null = null;
export function animalese(): Animalese {
  if (!_shared) _shared = new Animalese();
  return _shared;
}
