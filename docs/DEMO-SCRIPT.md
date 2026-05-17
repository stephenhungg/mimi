# demo script — mimi.

> beat-by-beat 60-second video script for the notion dev platform hackathon (deadline sun may 17 12pm PT). plus alternate 90s and 3min cuts.
>
> recorder setup: single screen, three things ready behind the OBS scene — **chrome** (tab A: notion workspace published page; tab B: `localhost:5173` 3D scene; tab C: landing `localhost:3000`), **terminal** (4 panes — landing, web, agents, utility @ `~/opal` for the git push), and the **OBS click-to-focus** hotkey wired.
>
> voice: stephen off-camera, dry and tight. do not oversell — let the chibis do it.

---

## the 60-second cut (primary submission)

| t | screen | stephen says (off-cam) | on-screen action |
|---|---|---|---|
| **0:00–0:04** | chrome tab A — notion workspace | "this is our notion workspace. residents, events, artifacts — five databases." | cursor scrolls down the notion page slowly. the **live svg thumbnail** of the 3D room is visible at top; pixel-art chibis at their corners. |
| **0:04–0:08** | same notion page, zoom on thumbnail | "that thumbnail is live. same world state, rendered as pixel art, inline in notion." | thumbnail re-renders (gentle pulse). a sprite sneezes. |
| **0:08–0:14** | click thumbnail → chrome tab B `localhost:5173` | "click it — and you walk in." | first-person spawn. WASD a step forward. tiger visible at code corner, bunny at calendar wall, mimi center. |
| **0:14–0:22** | 3D scene, walk toward mimi (the dog) | "mimi dispatches. tiger watches github, otter watches email, bunny watches calendar. they don't just answer me — they talk to each other." | walk forward 2s. press **E** near mimi. mimi chirps animalese: *"team — quiet morning."* |
| **0:22–0:38** | **KILLSHOT** — terminal pane 4 (`~/opal`), then snap back to 3D | "watch this. real commit, real github webhook." | type `git commit -am "fix: tighten retry" && git push` — hit enter. **within 2s** snap to 3D: tiger jolts → walks to (-5,-5) → keyboard slam animation → animalese chirp. subtitle: *"stephen pushed to opal — drafting a fix"*. |
| **0:38–0:48** | stay in 3D — echo chamber moment | "**the echo chamber of doom.** mimi calls otter over. they riff." | mimi walks toward tiger. animalese exchange: tiger (dry chirp) → mimi (leader chirp) → otter (warm chirp) → tiger again. subtitles cycle. one agent briefly curls into a **slime puddle** (rate-limit) and mimi nudges it. |
| **0:48–0:55** | alt-tab to chrome tab A — notion | "every word, every action — already in notion." | scroll to artifacts db: new row *"PR draft: tighten retry"* fades in. scroll to conversations db: 4 new rows from the chibi exchange. scroll to events db: github.push row at top. |
| **0:55–0:60** | hold on notion, fade landing logo | "mimi. — the 3D agent workspace for notion." | cut to landing hero card. asphalt + paper. fade. |

### cut points (where the editor can tighten)

- **0:04 thumbnail pulse** — if it doesn't re-render in time, drop to 3s.
- **0:22 git push** — pre-stage the commit in a `git commit -m "..." --no-verify` before recording; only the `git push` should be live, paste-buffer ready.
- **0:38 echo chamber** — minimum two agents speaking + one slime puddle moment. if the slime puddle doesn't trigger naturally, run `bun scripts/poke-agent.ts otter --rate-limit` in the hidden pane.
- **0:48 notion close** — if artifacts row doesn't appear within 2s, alt-tab earlier and let it land mid-cut.

### lines stephen records cleanly (3 takes each, pick best in post)

1. "this is our notion workspace. residents, events, artifacts — five databases."
2. "that thumbnail is live. same world state, rendered as pixel art, inline in notion."
3. "click it — and you walk in."
4. "mimi dispatches. tiger watches github, otter watches email, bunny watches calendar. they don't just answer me — they talk to each other."
5. "watch this. real commit, real github webhook."
6. "the echo chamber of doom. mimi calls otter over. they riff."
7. "every word, every action — already in notion."
8. "mimi. — the 3D agent workspace for notion."

### must-hit visual beats (if a beat is missing, recut)

- ✅ real notion page on screen (not a mock)
- ✅ live thumbnail visible and updating
- ✅ 3D first-person walk
- ✅ git push → tiger reacts within 2s
- ✅ at least 2 chibis speaking to each other (the echo chamber)
- ✅ one slime puddle visible
- ✅ artifacts db row appears live in notion

---

## the 90-second cut (alternate, if hackathon allows up to 90s)

adds two beats — onboarding and the dual-surface reveal:

| t | what changes |
|---|---|
| **0:00–0:10** | **NEW** — open landing `localhost:3000`. click **"install mimi for your notion workspace"**. notion oauth modal flashes. cut to "✓ provisioned 5 dbs in your workspace." stephen: *"any team can install mimi. it auto-provisions five notion dbs. no setup."* |
| **0:10–0:50** | the 60s cut's `0:00–0:38` (notion → thumbnail → 3D → killshot), trimmed by 4s. |
| **0:50–1:10** | **NEW** — split-screen reveal: left half 3D room, right half notion thumbnail. tiger walks in 3D, the pixel sprite walks in lockstep on the right. stephen: *"one normalized world state. two surfaces."* |
| **1:10–1:25** | echo chamber of doom (same as 0:38–0:48). |
| **1:25–1:30** | notion close + tagline. |

---

## the 3-minute cut (judging walkthrough — see DEMO-RUNBOOK)

the 3-min cut already exists in [`./DEMO-RUNBOOK.md`](./DEMO-RUNBOOK.md) as the live judging loop. summary of mapping (this script does not duplicate — just points):

| time | beat | source |
|---|---|---|
| 0:00–0:30 | thesis hook (stephen on camera) | runbook |
| 0:30–1:00 | notion thumbnail, dbs, residents | runbook |
| 1:00–1:30 | enter 3D, walk around, maddy on cam | runbook |
| **1:30–2:00** | **KILLSHOT** (git push → tiger) | runbook |
| 2:00–2:30 | mimi dispatch — real gmail send → otter | runbook |
| 2:30–3:00 | notion close — 12 events rows, PR draft, agent_memory | runbook |

new addition for 3-min cut: **insert a 20-second echo chamber moment at 2:00-2:20**, before the gmail beat — let four agents go at it, then cut to mimi calling order. this is the cracked part judges will quote.

---

## pre-roll checklist (do this in the 10 minutes before recording)

```bash
# preflight (from DEMO-RUNBOOK)
bun scripts/check-env.ts          # all green
bun run seed:demo                 # notion looks lived-in
bun scripts/poke-agent.ts tiger   # smoke — tiger responds in 3D

# stage the git commit so only the push is live
cd ~/opal
git add -A
git commit -m "fix: tighten retry"   # do NOT push yet
# leave the terminal at the prompt, `git push` typed but not entered
```

OBS scene order (left-to-right hotkey: 1, 2, 3, 4):

1. chrome tab A (notion workspace, scrolled to top, thumbnail visible)
2. chrome tab B (`localhost:5173`, pointer-locked, idle pose)
3. terminal pane 4 (`~/opal`, prompt ready)
4. chrome tab C (`localhost:3000`, landing hero — for the 90s + 3min cuts)

verify audio: animalese chirps are NOT muted in the 3D tab. browser tab volume = 70%. stephen's mic = -12dB peak.

---

## what NOT to do on camera

- do not open devtools.
- do not show the localhost URL bar — full-screen the 3D tab.
- do not narrate the implementation ("this is a worker that...") — narrate the experience.
- do not apologize for animalese sounding weird. it's the bit.
- do not skip the slime puddle. it's the most ownable visual.
