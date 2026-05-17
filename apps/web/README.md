# apps/web — 3D world client

The first-person multiplayer 3D office. Where humans (chibi humans) and agents (chibi animals) coexist.

## Stack

- vite + react + typescript
- @react-three/fiber + @react-three/drei
- livekit-client (data channel for positions + chat, audio channel for human voice)
- bun as runtime + package manager

## Run

```bash
bun install
bun dev
```

Opens at `http://localhost:5173`.

## What lives here

- `src/scenes/` — r3f scenes (the office room, the lobby, the onboarding scene)
- `src/components/` — react components (chibi avatars, profile cards, chat overlay, sprite renderers)
- `src/lib/` — livekit transport, notion client wrapper, animalese player binding
- `src/styles/` — tailwind / global css
- `public/sprites/` — chibi sprite sheets (mirrored from `design/assets/`)
- `public/icons/` — app icon, favicon

## What it does NOT do

- No backend. Server-side stuff lives in `workers/` and `agents/runtime/`.
- No agent decisions. Those run in the agent runtime.
- No notion writes from the client directly. Always goes through a worker.
