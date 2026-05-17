# mimi. — architecture

> a two-layer agent workspace. notion is canonical state. the 3D room is the live surface.

## tl;dr

```
                  ┌──────────────────────────────┐
                  │  LAYER A · NOTION (dashboard) │
                  │  ─ workspace page             │
                  │  ─ live thumbnail (svg)       │
                  │  ─ 5 dbs as inline views      │
                  └──────────┬───────────────────┘
                             │ canonical state
                  ┌──────────▼───────────────────┐
                  │  5 NOTION DBS                 │
                  │  residents · events           │
                  │  artifacts · conversations    │
                  │  agent_memory                 │
                  └──────────┬───────────────────┘
            ┌────────────────┼────────────────┐
            │                │                │
   ┌────────▼─────────┐ ┌────▼──────┐ ┌──────▼───────────┐
   │  4 NOTION        │ │ AGENT     │ │  LAYER B · 3D    │
   │  WORKERS + MCP   │ │ RUNTIMES  │ │  WORLD           │
   │  ─ mimi-events   │ │ (bun)     │ │  vite + r3f      │
   │  ─ github-bridge │ │ ─ tiger   │ │  + livekit       │
   │  ─ thumbnail     │ │ ─ otter   │ │  ─ first-person  │
   │  ─ overnight     │ │ ─ bunny   │ │  ─ wasd walk     │
   │  ─ mcp-server    │ │ ─ giraffe │ │  ─ multiplayer   │
   └────────┬─────────┘ │ ─ dog     │ │  ─ animalese     │
            │           └─────┬─────┘ │  ─ npc dialogue  │
            │                 │       └──────▲───────────┘
            │                 │              │
            │     livekit data channel       │
            └─────────────────┴──────────────┘
                       broadcasts
```

## layers

### layer A — notion (the dashboard)

what teams see day-to-day. open notion → the mimi. page renders:
- a 2D pixel-art thumbnail of the shared room (svg, refreshed every ~5s via `mimi-thumbnail-render`)
- inline db views: residents, events, artifacts
- a button linking to layer B

judges scroll notion and the product is *right there*. they don't have to open another app first.

### layer B — 3D world (the live space)

what `apps/web` renders. click the thumbnail → vite + r3f scene:
- first-person camera, wasd walk (PointerLockControls)
- 2.5D sprite billboards for chibis (humans + agents)
- one open room with themed corners per agent species
- multiplayer presence via livekit data channel (10hz pos broadcast)
- text chat overlay
- npc dialogue when you walk up to an agent

## packages (`packages/`)

| name | what |
|---|---|
| `@mimi/types`         | single source of truth for `Species`, `AgentState`, `Broadcast`, db row shapes, env var keys, brand constants |
| `@mimi/notion-client` | typed wrapper over `@notionhq/client` — `appendEvent`, `createArtifact`, `upsertResident`, `appendAgentMemory`, etc |
| `@mimi/animalese`     | procedural chirp synth (web audio API), per-species voice profile, subtitle reveal callback |

cross-import via `@mimi/*` path aliases set in `tsconfig.base.json`.

## services

### `apps/web` — 3D client

vite + react 19 + r3f + drei + livekit-client. consumes `@mimi/animalese` for in-room agent voice. fetches livekit jwt from `apps/landing/api/livekit-token`. renders sprites from `public/sprites/`.

### `apps/landing` — marketing + token server

next.js 15. hosts the marketing page + `GET /api/livekit-token` (mints livekit jwts via `livekit-server-sdk`).

### `agents/runtime` — per-agent bun process

one process per species (`bun --cwd agents/runtime dev -- --persona tiger`). connects to anthropic api (sonnet 4.6). exposes a tiny http endpoint (`POST /event`, `POST /dialogue`). on event:

1. claude is called with the agent's system prompt + tool definitions
2. tool calls (walk_to, type_at_keyboard, speak, set_mood, curl_up, file_artifact) drive
   - the chibi's visible state via livekit data channel
   - notion db writes via `@mimi/notion-client`
3. on rate-limit / api error → `curl_up()` broadcast, mimi (dog) walks over

### workers (`workers/`)

deployed via `ntn workers deploy --name <worker>`. cloudflare-workers-style runtime, web APIs only.

| worker | role |
|---|---|
| `mimi-events`          | central event ingestion → events db + fan out to agent runtimes |
| `mimi-github-bridge`   | github webhook verifier → forwards to mimi-events |
| `mimi-overnight-pulse` | periodic ping (every 30 min) → agents journal + pace the room |
| `mimi-thumbnail-render`| renders the room thumbnail as svg (cached 5s) |
| `mimi-mcp-server`      | exposes mimi. as an MCP server — `list_residents`, `recent_events`, `summon_agent`, `read_agent_memory`, `append_event` |

## the broadcast contract

every message on the livekit data channel is a `Broadcast` (defined in `@mimi/types`):

```ts
type Broadcast =
  | { type: "presence"; identity; kind: "human"|"agent"; species?; name; pos }
  | { type: "agent_state"; identity; species; state: AgentState; pos?; mood? }
  | { type: "agent_speak"; identity; species; text; animalese: true }
  | { type: "chat"; identity; name; text }
  | { type: "npc_request"; from; toAgent; text }
  | { type: "event_echo"; eventId; source; eventType; payload };
```

agents publish via `livekit-server-sdk`'s `RoomServiceClient.sendData` (server-side, no participant connection needed). web clients publish via `LocalParticipant.publishData`. all clients in the room receive everything.

## sponsor alignment (why this is the killer app for notion's dev platform)

- **5 dbs** modeled cleanly with consistent semantic types
- **4 workers + MCP server** = 5 worker-shaped pieces touching the platform
- **dual-direction sync**: workers write notion ↔ agents read notion ↔ external agents read mimi via MCP
- **meeting-notes endpoint** consumed by giraffe agent
- **notion-as-thumbnail**: the dashboard surface IS a notion page. live svg embedded as image. zero custom UI on notion's side.

## demo loop (3 min)

per `PROJECT.md`. the killshot is at 1:30 — a real github push → tiger jolts → walks to desk → keyboard-slam → speaks (animalese + subtitle) → files PR draft to notion artifacts db. judges see notion update live.
