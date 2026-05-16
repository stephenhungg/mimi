# THE COMMONS

A cozy 3D office where each team member's personal AI agent — generated as a unique chibi avatar — lives, works, and collaborates with your team. Notion is the canonical state for everything that happens.

**Visual direction locked**: chibi avatars (low-poly, friendly, instagram-able, each procedurally unique to its owner's persona) + cozy office (warm lighting, plants, desks with coffee/laptops/plants/notepads) + VRChat-style multiplayer presence.

**Why chibi**: avoids uncanny-VR-dystopia trap. Reads as toy/playful/team, not parasocial. Fast to render. Big design space for differentiation. Demos beautifully on video. Procedural per-user generation is the viral loop.

Built for the Notion Developer Platform Hackathon, May 16-17 2026.

---

## The synthesis

- **Angel** taught us: personal agents work when they have a body, a voice, a personality, and they remember.
- **MIMI v1** taught us: the win is a shared brain where multiple agents coexist with multiple humans.
- **Stephen's pattern**: multimodal, real-time, spatial, multi-system fan-out, kill-shot demo moment.

The Commons combines all three. Each person onboards a personal agent (Angel-style — swipe / vibe / strengths / context pack). The agent gets a VRM avatar, a voice, a persona. Then she joins the multiplayer room. Other humans + their agents are there. Everyone collaborates. Every spoken word, every artifact created, every decision made — grounded in Notion via Workers.

## The pitch (one paragraph)

The Commons is a multiplayer 3D workspace built on Notion's new Developer Platform. You create a personal AI agent in five minutes — give her a name, a vibe, a context pack. She gets a body and a voice. You drop her into the Commons, where your teammates and their agents are already there. You walk around, you talk, agents collaborate, artifacts get made. Every action — every spoken word, every decision, every doc shipped — lands in Notion as ground truth. Leave the room, open Notion on your phone, the receipts are there. Come back the next morning, your agent's been there overnight, did her work, has a brief ready for you in spatial voice.

## Why this wins

- **Background execution (30%)**: agents persist in the world overnight. You log in at 9am, your agent has been working, talking to other agents, posting to notion. The world has memory because notion has memory.
- **Statefulness (25%)**: world state IS notion state. Avatar positions, conversation logs, artifacts, agent memory — all rows in notion db. Reload from notion on join. Memory is load-bearing — without notion, the world has no past.
- **Agentic depth (25%)**: agents have spatial awareness, plan paths, collaborate side-by-side, hand off tasks by passing artifacts in-world. Multi-step is embodied.
- **Demo (10%)**: live multiplayer 3D agent collaboration with notion-grounded receipts. Multiple kill-shot moments.
- **Personal rating (10%)**: Simon Last sees the next layer of Notion. Max Schoening goes "wait." Anthony Morris realizes Claude Code can have a body. Judges go "I want one."

## Stephen-pattern checklist

- [x] multimodal — voice + spatial + visual + text
- [x] real-time multiplayer — livekit, r3f
- [x] visual-heavy — premade VRMs, cozy room aesthetic
- [x] multi-system fan-out — notion workers + claude api + elevenlabs + livekit + r3f
- [x] kill-shot demo moment — saturday morning, agent greets you in 3D space with overnight brief
- [x] aesthetic-forward — maddy owns the room vibe, you own the runtime
- [x] sponsor narratives — elevenlabs (voice), vercel (frontend), minimax (raffle), anthropic (claude api)

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  CLIENT (vite + r3f + livekit)                                 │
│  • cozy office room: couch, desk, plants, coffee bar           │
│  • premade VRM avatars (pulled from angel's 269 library)       │
│  • position + rotation streamed over livekit data channel      │
│  • mic in + speaker out via livekit voice                      │
│  • subtitles for every spoken line                             │
└────────────────────────────────────────────────────────────────┘
              ↓ livekit data channel
┌────────────────────────────────────────────────────────────────┐
│  AGENT RUNTIME (per-agent process, node + bun)                 │
│  • claude sonnet 4.6 — persona-conditioned                     │
│  • TTS via elevenlabs (per-agent voice id)                     │
│  • STT via deepgram (when listening to humans)                 │
│  • tools: speak, walk_to, pick_up, hand_off, query_notion,     │
│           write_notion, query_other_agent                      │
│  • subscribes → notion changes via worker webhook              │
└────────────────────────────────────────────────────────────────┘
              ↓ every meaningful event
┌────────────────────────────────────────────────────────────────┐
│  NOTION WORKERS (deployed via ntn)                             │
│  • webhook receiver: scene events → notion db writes           │
│  • scheduled sync (30 min): heartbeat, overnight agent ticks   │
│  • agent tool: query_agent(name) callable by external agents   │
│  • database sync: github PRs → in-world artifacts on the desk  │
└────────────────────────────────────────────────────────────────┘
              ↓ ground truth
┌────────────────────────────────────────────────────────────────┐
│  NOTION (the canonical state)                                  │
│  • db: residents (humans + agents in the room)                 │
│  • db: events (everything that happened, timestamped)          │
│  • db: artifacts (docs, PRs, decisions made in-world)          │
│  • db: conversations (transcripts, threaded)                   │
│  • page: today's brief (auto-rendered each morning)            │
└────────────────────────────────────────────────────────────────┘
```

## Onboarding flow (Angel DNA — abbreviated for hackathon)

Skip the 269-card swipe — too much surface for 24h. Compressed:

1. land on commons.[stephen domain]/onboard
2. one-page vibe picker: 4 archetypes × 2 vibes = 8 cards. pick 3 you like.
3. quick form: name, what you're working on (1 sentence), what you want her to be good at (1 sentence)
4. her face fades in, her voice line plays via elevenlabs
5. "let her in" → drops into the commons multiplayer scene

## Demo arc (3 min judging slot)

### [0:00 – 0:30] thesis hook + onboard one fresh agent

stephen (live): "agents today are tools you summon. they don't have a body. they don't live anywhere. they don't remember the room they were in. the commons is a multiplayer workspace where your personal agent has a body, a voice, and a memory grounded in notion."

maddy on stage: lands on the onboarding URL. picks vibes. her agent's face fades in. her agent says one line: "alright maddy, let's get into it." → drop into commons scene.

### [0:30 – 1:30] live multiplayer beat

- maddy's avatar walks into the room
- stephen's agent is already there (was here overnight)
- maddy's agent says: "hey, i talked to your agent at 3am, here's where we left things" — gestures at the desk
- on the desk: a notion page artifact, glowing softly
- maddy walks over, picks it up, the page opens overlay-style
- it's a real notion page populated overnight — github PRs synced, decisions logged, conflicts flagged
- maddy reads one line out loud, agent responds in voice

### [1:30 – 2:00] BG AUTONOMY KILL-SHOT

stephen: "what's been happening here while we were prepping?"

cut to projector: open notion.com on a different machine, navigate to the commons workspace.
- residents db: stephen, maddy, agent-a, agent-b — last_active timestamps
- events db: 47 events in the last 14 hours
- artifacts db: 3 artifacts created overnight by agents alone
- the same room maddy's standing in. but the receipts are there.

stephen: "agents kept the world alive. notion is the ground truth. close the app, the world keeps running."

### [2:00 – 2:30] AGENT-TO-AGENT MOMENT

back to commons: maddy says out loud "agent-a, work with agent-b on the spec doc."

both agents walk to the desk. they speak to each other in elevenlabs voices (audible). their conversation logs to notion in real time on the projector. they reach a decision, file it in the artifacts db, glow on the artifact.

### [2:30 – 3:00] CLOSE

stephen: "every team is gonna have agents next year. they'll have bodies because that's how humans collaborate. and they'll live in notion because that's where the work goes. the commons is the room they hang out in. we built it in 24 hours on the new dev platform. simon — this is your dev platform's killer app."

audible. unforgettable. tweet-able.

## Build timeline (21h to submission)

### Hours 1-4 — foundations
- repo scaffolding, vite + r3f + livekit boilerplate
- notion worker scaffold via `ntn workers new`
- notion workspace setup (databases: residents, events, artifacts, conversations)
- claude api integration smoke test
- elevenlabs voice clone for 2 agent voices

### Hours 4-8 — single-player MVP
- one room, one VRM avatar, free walk
- mic capture → STT → claude → TTS → speaker
- every spoken line writes to notion events db via worker webhook
- desk artifact: load a notion page in-world as a glowing object

### Hours 8-12 — multiplayer
- livekit room, position sync, voice chat
- second avatar (the agent) walks autonomously
- agent has tools: walk_to, speak, pick_up, write_notion
- agent-to-agent voice via livekit (both agents broadcast)

### Hours 12-16 — onboarding flow
- vite landing page at /onboard
- 8-card vibe picker
- generate persona vector → claude system prompt → voice id assignment
- "let her in" → drops into commons scene

### Hours 16-20 — pre-stage + polish
- overnight agent loop: pacing agent in the room, picking up artifacts, logging events
- github webhook → workers → desk artifact pipeline (real PRs from one of stephen's repos)
- polish the room vibe, lighting, sounds
- elevenlabs voice review pass

### Hours 20-21 — demo prep
- 1-min video record, cerebral valley submission
- pitch script for maddy
- contingency: pre-record a 30s overnight loop in case live multiplayer flakes

## Naming

The Commons — locked. Carries the public-square feeling without being twee.

Repo will rename from `mimi` → `commons` after stephen confirms.

## What we're explicitly NOT building

- Custom 3D assets (use premade VRMs from angel's library)
- A general avatar editor
- General-purpose agent marketplace
- Real google/discord/meta context ingestion (vibe picker = enough)
- Multi-room (one room, the commons, that's it)
- Native VR (web first — webxr is post-hackathon)
- Onboarding 8-beat reveal cascade (angel had this, we won't have time)

## Team split

**Stephen**:
- r3f scene + multiplayer transport
- agent runtime + tool layer
- notion workers + webhooks
- elevenlabs + deepgram integration

**Maddy**:
- room aesthetic + vibe direction
- onboarding card design
- notion workspace pages (the "today's brief" template, the receipts views)
- pitch script + demo script
- live demo human

**Tenz (selfbot)**:
- coordination + decision support
- background research
- writing this doc and keeping it tight
- holding stephen accountable to scope

## Risk register

1. **Livekit multiplayer flakes on demo day** → contingency: pre-record a 30s clean clip of overnight activity, fall back to "here's a real recording of last night, now let's go live." Judges accept this.
2. **Elevenlabs latency** → use cached voice lines for the agent's overnight responses, only live-generate for live questions.
3. **Notion API rate limits** → batch writes via worker, only flush on meaningful events not every avatar position tick.
4. **3D scene assets too heavy** → start ugly (gray boxes), only polish the demo room corner that's on camera.
5. **Time** → cut multiplayer to 1 agent + 1 human if hour-16 check shows we're behind. Single-player commons still demos well.
