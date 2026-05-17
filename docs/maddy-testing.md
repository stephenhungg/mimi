# What Maddy can test + give feedback on RIGHT NOW

Updated: 2026-05-16 18:05 PT

## 1. The 3D Room (apps/web)

**What's shipped**: r3f scene with room geometry, asphalt+paper lighting, agent billboards placed at species desks, player controller (WASD walk + mouse look), name tags + speech bubbles.

**How to run it**:
```bash
cd ~/Documents/mimi
bun install   # first time only
bun --cwd apps/web dev
```
Opens at `http://localhost:5173`.

**What to give feedback on**:
- Does the room feel cozy or sterile? (lighting, color, scale)
- Are the chibi sprites the right size in 3D space?
- Does WASD movement feel right? Too fast / too slow?
- Are the desks where you'd expect each agent's section to be?
- Does the camera fog blend the edges of the room nicely or does it kill atmosphere?
- Do the speech bubbles + name tags read well at distance?
- What's missing visually — plants? rugs? wall art? coffee bar? wallpaper texture?

**Write feedback to**: `docs/room-feedback.md` — bullet points, screenshots welcome.

---

## 2. The Landing Page (apps/landing)

**What's shipped**: next.js page reverse-engineering `agents.framer.website` (codex is mid-pass right now — check `tasks/todo.md` for progress). Has hero with framer assets temporarily, ready for our asphalt+paper swap.

**How to run it**:
```bash
bun --cwd apps/landing dev
```
Opens at `http://localhost:3000`.

**What to give feedback on**:
- Layout structure — does it work for showing off mimi.?
- Where would the "agent roster" (5 species cards) section go best?
- Where does our hero illustration (`design/generated/landing-hero-asphalt.png`) belong?
- What CTA copy should live above the fold? "meet mimi." / "join the workspace" / something else?
- What sections are missing — pricing? FAQs? footer credits? press kit?

**Write feedback to**: `docs/landing-feedback.md`.

---

## 3. The Agent Personas (agents/runtime/personas)

**What's shipped**: 5 system prompt markdown files — one per species — that define how each agent speaks, what they care about, their motto, their watched source.

**Files to read + edit**:
- `agents/runtime/personas/tiger.md` (github agent — "tests are sacred")
- `agents/runtime/personas/otter.md` (email agent — "no email left behind")
- `agents/runtime/personas/bunny.md` (calendar agent — "always five minutes early")
- `agents/runtime/personas/giraffe.md` (meeting notes agent — "i wrote that down")
- `agents/runtime/personas/dog.md` (mimi. oversight — "everyone goes home safe")

**What to do**:
- Read each one
- Edit the persona voice / tone / mottos / "what they care about" to feel more YOU
- These are what claude reads to act as that agent — your voice shapes the agent's voice
- Commit + push when done so stephen's runtime picks them up

---

## 4. Agent Profile Card Designs

**What's shipped**: sample card at `design/generated/agent-card-tiger.png` (pokemon trainer card style, orange frame).

**What to do**:
- Design the same card layout for otter (blue), bunny (pink), giraffe (mustard), dog (gold)
- Keep the structure: frame + sprite + stat lines + motto strip
- Sketch or describe each one in `design/agent-cards.md`
- I can regenerate via higgsfield once your direction is locked

---

## 5. Cozy Office Reference Refinement

**What's shipped**: `design/generated/office-room-iso.png` (the isometric cozy office with all 5 agents at their stations).

**What to do**:
- Does this scene feel right? Or want more cozy / more cyberpunk / more X?
- Drop pinterest refs to `design/refs/` of office spaces you want stephen's r3f scene to feel like
- Describe in 3 sentences in `design/office-vibe.md`

---

## 6. Demo Script (HIGHEST LEVERAGE)

**What's not yet shipped**: `docs/demo-script.md`. This is what you'll READ on stage Sunday.

**3-min structure**:
- 0:00–0:30 hook
- 0:30–1:00 onboard a fresh agent live
- 1:00–1:30 walk into mimi.'s house, see agents working
- 1:30–2:00 KILL-SHOT: stephen pushes real commit, tiger reacts in real-time
- 2:00–2:30 mimi. dispatches between two agents (cross-agent moment)
- 2:30–3:00 close, point at notion, judge framing

**What to do**: draft this in your voice, save to `docs/demo-script.md`. You're the closer.

---

## Priority order if you can only do one

1. **Demo script (#6)** — only thing nobody else can do for you, highest stage impact
2. **Persona voice edits (#3)** — 30 min, shapes every agent's text everywhere
3. **3D Room feedback (#1)** — once stephen has the dev server up
4. **Profile card sketches (#4)**
5. **Landing page feedback (#2)** — once codex finishes the reverse-engineer
6. **Office vibe refs (#5)**
