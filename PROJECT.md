# mimi.

A two-layer agent workspace. **Layer A** lives inside Notion as 2D pixel-animated thumbnails — tiny live previews of your team's workspace, the agents in it, what they're doing. **Layer B** opens when you click a thumbnail: a free-walk, first-person, multiplayer 3D room where humans (chibi avatars) and agents (chibi animals) coexist, navigate, and collaborate. Every action in the 3D world syncs back to Notion as ground truth, and the thumbnails reflect it live.

Each user has a **personal squad** of customized agents. Users **assign** any squad member to the shared workspace — so the shared room is a curated guest list of agents people contribute.

Multiplayer communication is **text-based chat** in v1 (no voice). Agents speak in **animalese** (procedural chirp + subtitle reveal). The vibe is animal crossing.

**Brand: 'mimi.'** — lowercase with period.

---

## The two layers

### Layer A: Notion-native thumbnails (the dashboard surface)

**Where the team SEES the workspace day-to-day.** Open Notion. Your team's mimi. workspace page renders:

- A 2D pixel-animated thumbnail of the shared 3D room — refreshes every few seconds via worker
- Each agent in the room shown as a little pixel sprite at their current location
- Live mood indicators (animal crossing sticker palette) per agent
- Real-time event feed (db view): "github agent picked up a PR 30s ago"
- Roster of who's in the workspace right now (humans + agents)
- Click → enter the 3D world

**Why this is the cracked play**: judges scroll Notion and see this. They don't have to open another app. The Notion thumbnail IS the product surface. Notion's databases drive the pixel art. We use db views + worker-rendered images + the new comment/event taxonomy. Maximum notion-native.

### Layer B: The 3D world (the live space)

**Where work actually happens.** Click a thumbnail → load the 3D room.

- First-person camera (you ARE your chibi, you don't see your own body)
- Free walk (WASD) — you navigate the room, agents navigate the room, other humans navigate the room
- Multiplayer presence — see other humans' chibis, see other agents' chibis, all moving live
- NPC-style dialogue when you walk up to an agent — chat box opens, you type, it responds in animalese + subtitle
- Multiplayer chat between humans — text-only, in-room chat overlay
- Agents react to external events (github webhook, gmail, calendar) by visibly walking to their desks and "working" (keyboard slam animation)
- Specialized agent areas inside the room — github agent has a corner with code monitors, email agent has a desk with envelope stacks, etc. NOT separate cubicles you navigate to — one open space with themed sections.

---

## Personal squad + shared workspace

Each user goes through onboarding ONCE — creates a personalized squad of N agents:
- Pick from animal species (dog, giraffe, tiger, bunny, otter, more)
- Pick personality (the 8 vibe cards)
- Pick what each agent watches (github, gmail, calendar, etc)
- Get a notion page with your squad listed

Then for any shared workspace, you ASSIGN agents from your squad to participate.
- Two teammates can both assign their `github agent` — there are two github agents in the room
- One user can have a unique `linear agent` that only she has
- The room is the curated guest list of contributed agents

**This is the angel x mimi-v1 synthesis maddy described.** Personal agents that become collaborative when assigned.

---

## Visual direction (LOCKED — per maddy's design doc + ongoing chat)

**Aesthetic**: very very cute, animal crossing, soft outlines, warm minimal colors, lots of expression.

**Animal roster** (each agent is a different species):
- Dog (golden retriever energy)
- Giraffe (tall, observant)
- Tiger (sharp, focused)
- Bunny (alert, fast)
- Otter (chatty, social)
- (Extensible — more as we have time)

**Human chibis**: human-shaped chibis (not animals). You pick yours during onboarding. Skin tone, hair, outfit, etc — kept simple. The HUMAN is the user, the AGENT is the animal — clear visual distinction.

**Notion thumbnails**: 2D pixel art, ~16-bit JRPG style. Each scene rendered server-side from current state. Sprites are pixel versions of the same animals.

**3D world**: low-poly chibi, soft colors, warm lighting, plants, desks, monitors. Cozy office vibe. NOT vrchat dystopia. Reference: animal crossing villager housing interior, harry potter bank floor, minecraft trading post.

**Mood expressions**: each agent has a mood state visible on its face. Reference: the cat sticker sheet from maddy's doc (sad, happy, surprised, sparkly-eyed, sleepy, etc).

**Animations to nail**:
- Idle bob (every chibi at rest)
- Walking
- Keyboard slam (bongo cat / laptop cat) when an agent is "working"
- Talking pose (when in NPC dialogue with you)

---

## Camera + interaction (LOCKED)

**First-person camera** in the 3D world. You see what your chibi sees. No top-down.

**Free walk** WASD movement for humans + agents.

**Multiplayer presence**: livekit data channel for position + rotation broadcast. ~10hz. All clients in the same livekit room.

**Multiplayer chat**: TEXT ONLY in v1. In-room chat overlay. Animalese is for agents speaking; humans type. No voice, no mic, no audio mixing. Massive de-scope.

**NPC dialogue**: walk up to an agent → chat box opens locally → type your message → agent responds in animalese with subtitle. Other humans in the room can see this conversation happening if they're nearby (the chat bubble appears over the agent's head).

**Notion thumbnail**: separate React component embedded in a Notion page via the workers + an image-render endpoint. Updates every ~5 seconds.

---

## Agent roster (LOCKED for v1)

Each species has a clear specialty in the SHARED workspace:

1. **the github agent — TIGER** 🐯. Watches PRs, commits, issues. Voice cluster: dry/technical.
2. **the email agent — OTTER** 🦦. Watches gmail. Voice cluster: warm/social.
3. **the calendar agent — BUNNY** 🐰. Watches calendar invites. Voice cluster: chipper/punctual.
4. **mimi. (the oversight) — DOG** 🐕. Watches the other agents. Coordinates dispatch. Head-of-bank energy. Voice cluster: warm/leader.

If time permits:
5. **the meeting notes agent — GIRAFFE** 🦒. Watches notion's `/v1/blocks/meeting_notes/query`. Voice cluster: thoughtful.
6. **the linear agent — TBD species** — watches tickets.

These are TEMPLATES. In personal squads, users can have any agent type. In shared workspaces, you assign from your squad. So the shared room can have 4 github agents from 4 different users if all 4 contributed one.

---

## Demo loop (3 min, refit for the two-layer architecture)

[0:00-0:30] **Thesis hook**. Stephen: "every team uses 5 ai tools that don't talk to each other. mimi. is the workspace where your team's specialized agents live, watch the outside world, and coordinate. notion is the dashboard — you scroll it like any other page. but click in and you're inside the room."

[0:30-1:00] **Notion thumbnail beat**. Stephen on screen: a notion page. Embedded in it: a live 2D pixel-art thumbnail of the mimi. workspace. Tiger pixel sprite at one corner, bunny pixel sprite at another, otter at the desk. The thumbnail UPDATES live as we watch — tiger walks across screen, bunny's mood ticker changes. "this is your team's workspace, rendered live, native to notion."

[1:00-1:30] **Click in — 3D world**. Maddy clicks the thumbnail. Loads into 3D first-person room. She sees her own chibi self in the mirror (the title bar). Walks around the room. Stephen's chibi is there. Tiger is at the desk monitoring github. Bunny is by the calendar. Maddy says (text chat): "tiger, what's going on with opal?"

[1:30-2:00] **LIVE EVENT KILL-SHOT**. Stephen pushes a real commit on his laptop. In the 3D room: tiger LITERALLY JOLTS, runs across the room to its corner, slams the keyboard (bongo cat animation), animalese chirping with subtitle: "stephen pushed to opal — livekit.test.ts failing. drafting a fix..." Maddy: "approve." Tiger: "filing PR." External tab: github actually shows the new PR. Notion event row appears live. The thumbnail in notion updates to show tiger at its desk slamming.

[2:00-2:30] **MIMI. DISPATCH MOMENT**. Calendar invite arrives in a real gmail inbox we wired. Both bunny and otter twitch. Mimi. (the dog) at the center barks: "team — calendar event in 15min, otter check if there's a related email thread." Otter walks across the room to bunny. They exchange in animalese. Otter narrates the email context, bunny logs the meeting. The judges WATCH the agents collaborate visually.

[2:30-3:00] **NOTION GROUND TRUTH + CLOSE**. Alt-tab back to notion. Events db: 73 rows from the last 10 minutes. Artifacts db: PR draft, calendar entry. Agent memory pages: tiger's journal entry timestamped 30s ago. "every primitive notion shipped on tuesday — 4 workers, db sync, external agents api, meeting notes endpoint, MCP server we expose ourselves. mimi. is the room your team's agents live in. simon, this is your dev platform's killer app."

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER A: NOTION (the dashboard surface)                        │
│  • workspace page with embedded live thumbnail                  │
│  • db views: events, artifacts, residents, agent_memory         │
│  • thumbnail = server-rendered pixel art, refreshed every ~5s   │
│  • click thumbnail → opens layer B in browser                   │
└─────────────────────────────────────────────────────────────────┘
                            ↑↓ ground truth
┌─────────────────────────────────────────────────────────────────┐
│  LAYER B: 3D WORLD (vite + r3f + livekit data channel)          │
│  • first-person camera, WASD walk                               │
│  • multiplayer presence via livekit                             │
│  • in-room text chat (livekit data channel)                     │
│  • chibi humans + animal agents                                 │
│  • NPC dialogue mode when near an agent                         │
│  • agent animations: idle, walk, keyboard-slam, talk, mood      │
└─────────────────────────────────────────────────────────────────┘
                            ↑↓ events
┌─────────────────────────────────────────────────────────────────┐
│  AGENT RUNTIMES (per agent, node + bun)                         │
│  • claude sonnet 4.6 via anthropic api                          │
│  • subscribes to its source webhook                             │
│  • subscribes to dispatch from mimi. oversight                  │
│  • drives chibi position + dialog + mood                        │
└─────────────────────────────────────────────────────────────────┘
                            ↑↓
┌─────────────────────────────────────────────────────────────────┐
│  NOTION WORKERS (4 — MAX NOTION TOOLING)                        │
│  ① mimi-events: webhooks in → notion db writes                  │
│  ② mimi-overnight-pulse: 30-min sync, agents pace + journal     │
│  ③ mimi-thumbnail-render: produces the live pixel-art thumbnail │
│  ④ mimi-github-bridge: github webhooks → agent broadcast        │
│  + mimi-mcp-server: exposes mimi. as MCP for any external AI    │
│  + db sync: meeting notes endpoint                              │
│  + external agents api: claude code can join as agent           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  NOTION (canonical state, 5 dbs)                                │
│  • residents (the agents + humans in the workspace)             │
│  • events (everything that happened)                            │
│  • artifacts (decisions, PRs, drafts)                           │
│  • conversations (dialog transcripts)                           │
│  • agent_memory (per-agent journal pages, cross-readable)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Onboarding flow

1. land on mimi.[domain]/onboard
2. pick your human chibi (skin tone, hair, outfit — keep minimal, 4 options each)
3. pick your squad: 2-4 agents to build
4. for each agent: pick species, vibe (8 cards), what source it watches
5. each agent's chibi is generated + named
6. you land in your personal squad room — see all your agents
7. you pick which to assign to the shared workspace
8. click "join shared workspace" → drop into the 3D room

---

## Pronouns + framing (HARD RULE)

- Agents are "it" — no gender
- "Team agents," "workspace agents," "the tiger" — never "your agent," "personal agent," "companion"
- mimi. is infrastructure for mixed human-agent teams. NOT an AI friend.

---

## Hackathon ops

- Verify Stephen is registered on Cerebral Valley
- 1-min demo video is gating artifact — block 11am-12pm Sunday
- Animalese written fresh inside mimi/ — 1h task
- Onboarding page deploys to Vercel — sponsor alignment, 10min
- Git history is the receipt — all work timestamped during event
- Maddy is a collaborator on the repo (done)

---

## What we're explicitly NOT building (v1)

- Voice chat between humans (text only — massive de-scope, ship-able)
- Real-time agent voice via TTS (animalese only — no elevenlabs)
- Custom 3D assets beyond simple geometry + chibi rigs
- More than one shared workspace per demo
- Webxr / native vr
- Full notion thumbnail editor — thumbnail is auto-rendered, not user-customizable
- Multi-room (the 3D world is one open room with themed sections)

---

## Build priority order (21h)

1. notion dbs (5) provisioned via `ntn api`
2. mimi-events worker (replace template)
3. r3f client: first-person scene, one chibi human, WASD walk, basic room geometry
4. livekit multiplayer: 2 clients can see each other in the room
5. text chat overlay in 3d
6. one agent (tiger / github) — runs claude, posts to notion
7. github webhook → mimi-events worker → broadcast → tiger reacts visibly
8. NPC dialogue: walk up to agent → chat box → animalese response with subtitle
9. keyboard-slam animation for agent "working"
10. agent mood states (idle / working / done)
11. animalese written fresh
12. mimi. oversight (dog) + dispatch logic
13. 2 more agents (otter email, bunny calendar)
14. shared agent_memory pages
15. notion thumbnail renderer — server-side pixel art
16. embedded thumbnail in notion via worker
17. overnight pulse + daily brief
18. mcp server exposure
19. onboarding flow (simplified)
20. vercel deploy of onboarding
21. polish, demo prep, 1-min video
