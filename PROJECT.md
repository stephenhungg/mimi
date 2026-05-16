# mimi.

A blueprint-navigable agent house. You see a top-down map of a cute "house" with multiple rooms/cubicles. Each cubicle holds a specialized agent (github agent, email agent, calendar agent, etc), and there's an oversight character at the center (the bank manager / head goblin). Click into a cubicle → enter in 3D → talk to the agent NPC-style → it makes cute noises, says "let me go do some research," walks to its desk, slams keyboard bongo-cat-style, returns with results. Everything grounds in Notion.

**Brand: 'mimi.'** — lowercase with period. Animal-crossing-coded. Specifically cute.

---

## Visual direction (LOCKED — per maddy's design doc)

**Landing**: birds-eye blueprint of the house. Thick black outlines, blocked solid colors. Reference image: the yellow/red/white minecraft-villager-trading-style house. Reads like a children's book illustration.

**House**: multiple rooms/cubicles, each visually distinct based on the agent it holds. Trinkets on display match the agent's specialty:
- Github agent's room: code books, terminal monitors, a hoodie on the chair
- Email agent's room: stacks of envelopes, a typewriter, a quill
- Calendar agent's room: planners, alarm clocks, sticky notes
- (etc, scoped to whatever sources we wire up)

**Oversight character**: at the center of the house (Harry Potter bank manager / goblin king energy). The mimi. agent itself. It dispatches. It coordinates. It's the only one who sees everything.

**Sprites**: chibi LITTLE ANIMALS (cats per the sticker sheet references). NOT human chibis. Animal Crossing villager DNA. Round, soft, expressive.

**Reference images in maddy's doc**:
- House: the minecraft-trading-post yellow/white/red building
- Standing/animated agent: chrono-trigger-style sprite (https://i.pinimg.com/originals/fe/32/71/fe3271c2f92d9d098bd5a3281eb889e5.gif)
- Keyboard slam: bongo cat / laptop cat gif (https://giphy.com/explore/laptop-cat-stickers)
- Mood expressions: animal crossing cat sticker sheet (multi-state emoji sheet from page 3)
- UI inspo: the "Meow... what's your request?" cat-paw chat dialog from notion ai (page 4)

**Aesthetic descriptors**: very very cute, animal crossing, soft outlines, warm but minimal colors, lots of expression.

---

## Camera + interaction (LOCKED — per maddy's design doc)

**NO first-person walking. NO free-walk multiplayer voice room.**

**Two-mode interaction**:
1. **Blueprint mode (default)**: top-down 2D-ish map. See all cubicles. See which agents are active (small motion/idle animations). Click a cubicle to enter.
2. **Cubicle mode (3D)**: zoom in to a 3D rendered version of that one room. Agent is there. Talk to it NPC-style — dialog box pops up, agent stands and is animated. You give it a request. It says "let me go do some research." Walks to desk. Plays the keyboard-slam animation. Returns with output.

**No multi-human multiplayer in the room** (v1). Multiplayer is via Notion ground truth — multiple humans can each open mimi., everyone sees the same state synced from the database. We can add real-time presence ghosts in v2.

**Communication**:
- Voice: animalese (agents only) — procedural chirps, character-by-character with subtitle reveal
- Text: chat box always visible in dialogue mode
- Mood: each agent has a current mood state, visually expressed on its face (animal crossing sticker palette)

---

## Agent roster (LOCKED for v1)

Each agent owns one external data source + one cubicle. Minimum viable house has these agents:

1. **the github agent** — watches PRs, commits, issues. Cubicle: code monitors, hoodie. Voice cluster: dry/technical.
2. **the email agent** — watches gmail. Cubicle: envelopes, typewriter. Voice cluster: warm/professional.
3. **the calendar agent** — watches calendar invites. Cubicle: planners, clocks. Voice cluster: chipper/efficient.
4. **mimi.** (the oversight) — sits at the center. Doesn't watch a source — watches the other agents. Coordinates dispatch. The "head of bank." Voice cluster: warm/leader.

If time permits in build:
5. **the linear agent** — watches tickets. Cubicle: post-it notes, sprint boards.
6. **the meeting notes agent** — watches notion's `/v1/blocks/meeting_notes/query`. Cubicle: a microphone, a notebook.

---

## Demo loop (3 min, rewritten for the new direction)

[0:00-0:30] **Thesis**. Stephen: "every team has 5 ai tools. they don't talk to each other. agents lie to each other. mimi. is a house where your team's specialized agents live, watch the outside world, and coordinate."

[0:30-1:00] **Open the house**. Maddy navigates to mimi.[domain]. Blueprint loads. 4-5 cubicles visible. Each has a chibi animal agent at its desk with subtle idle animation. Mimi. (the oversight) sits at the center, looking around. Maddy says (over voice): "this is our team's agent house."

[1:00-1:30] **First live moment — github webhook fires**. Stephen pushes a commit to a real repo on his laptop. Blueprint immediately shows: github agent's cubicle FLASHES. Cute "!" pops over its head. Animalese sound. Maddy clicks the cubicle → zooms into 3D. Github agent says (animalese + subtitle): "stephen just pushed to opal. tests failing in livekit.test.ts." Maddy: "okay, fix it." Github agent: "let me go do some research." Walks to desk. Bongo-cat keyboard slam animation. ~5 seconds. Returns: "drafted a fix, opened a PR. waiting on your review."

[1:30-2:00] **NOTION GROUND TRUTH**. Stephen alt-tabs to notion on projector. Shows: events db (real rows from the webhook). artifacts db (the PR draft). agent_memory db (github agent's journal entry timestamped 5 seconds ago). decisions db (record of maddy's "okay, fix it"). "the house you just watched is THIS data. no demo magic."

[2:00-2:30] **MIMI. DISPATCH MOMENT**. Maddy goes back to the blueprint. Calendar agent's cubicle flashes — a calendar invite came in. Email agent's cubicle flashes — a related email arrived. Mimi. (oversight) jolts at the center. Animalese subtitle: "team — both calendar and email just got hit by the same person. let me dispatch." mimi. directs both agents. They coordinate. One artifact gets filed. Real cross-agent coordination through the central character.

[2:30-3:00] **CLOSE**. "We use literally every notion primitive that shipped tuesday — 4 workers, db sync, external agents api, meeting notes endpoint, MCP server we expose ourselves. mimi. is a house your team's agents live in. simon, this is your dev platform's killer app."

---

## Architecture (updated for new direction)

```
┌────────────────────────────────────────────────────────────────┐
│  CLIENT (vite + r3f + react)                                   │
│  ① BLUEPRINT VIEW: top-down 2D-ish map, click cubicles         │
│  ② CUBICLE VIEW: zoom into 3D room, NPC dialogue, keyboard     │
│  • chibi animal agents (cats), idle + working animations       │
│  • mood expressions per agent                                  │
│  • animalese player + subtitle reveal                          │
│  • chat input                                                  │
└────────────────────────────────────────────────────────────────┘
              ↓ events both ways
┌────────────────────────────────────────────────────────────────┐
│  AGENT RUNTIMES (per agent, node process)                      │
│  • claude sonnet 4.6 via anthropic api (your key)              │
│  • each agent has: persona, mood state, tools, source feed     │
│  • subscribes to its source webhook                            │
│  • subscribes to dispatch from mimi. oversight                 │
└────────────────────────────────────────────────────────────────┘
              ↓ ↑
┌────────────────────────────────────────────────────────────────┐
│  NOTION WORKERS (4 — MAX NOTION TOOLING)                       │
│  ① mimi-events: webhooks in → notion db writes                 │
│  ② mimi-overnight-pulse: 30-min sync, agents pace + journal    │
│  ③ mimi-mcp-server: exposes mimi. as MCP for any external AI   │
│  ④ mimi-github-bridge: github webhooks → agent broadcast       │
│  + db sync: meeting notes endpoint                             │
│  + external agents api: claude code can join as a cubicle      │
└────────────────────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────────────────────┐
│  NOTION (canonical state, 5 dbs)                               │
│  • residents (the agents in the house)                         │
│  • events (everything that happened)                           │
│  • artifacts (decisions, PRs, drafts made)                     │
│  • conversations (dialog transcripts per cubicle)              │
│  • agent_memory (per-agent journal pages, cross-readable)      │
└────────────────────────────────────────────────────────────────┘
```

---

## Pronouns + framing (HARD RULE, unchanged)

- Agents are "it" — no gender
- "Team agents," "workspace agents," "the github agent" — never "your agent," "personal agent," "companion"
- mimi. is infrastructure for mixed human-agent teams. NOT an AI friend.

---

## Hackathon ops

- Registered on Cerebral Valley (verify stephen)
- 1-min demo video is the gating artifact — block 11am-12pm Sunday
- Animalese rewritten fresh inside mimi/ this weekend (not lifted from angel) — 1h task
- Onboarding page (the "make your account" first step) deploys to Vercel — sponsor alignment, 10min
- All work timestamped in this repo, no prior code
- Maddy gets write access to the github repo

---

## What we're explicitly NOT building

- First-person walking camera
- Multi-human voice chat / livekit voice multiplayer
- Free-walk avatars (you ARE the camera, you don't have a body)
- Real-time human-to-human in-room presence (sync via notion only in v1)
- Custom 3D assets beyond simple geometry + chibi sprites
- Multi-room beyond the agent house
- Webxr / native vr

---

## What we ARE building (priority order)

1. notion dbs (5) provisioned
2. mimi-events worker (replace template)
3. r3f client: blueprint view + 1 cubicle view + 1 chibi animal sprite
4. one agent runtime (github agent) — runs claude, posts to notion
5. webhook from github → mimi-events worker → broadcast to github agent → agent visibly reacts in blueprint
6. NPC dialogue mode in cubicle: click → zoom → talk → animalese + subtitle
7. keyboard-slam animation when agent is "doing work"
8. agent moods (3 states minimum: idle, working, done)
9. animalese module written fresh
10. mimi. oversight character + dispatch logic
11. 2-3 more agents (email, calendar) — only if time
12. shared agent_memory pages
13. overnight pulse + daily brief
14. mcp server exposure
15. external agents api integration
16. onboarding flow (simplified — pick agents from a roster, populate the house)
17. polish, demo prep, video
