# agents/runtime — per-agent process

One process per chibi agent. Drives its claude calls, animalese, position in the 3D world, and notion writes.

## Architecture

```
┌─────────────────────────────────────┐
│ agent runtime (node + bun)          │
│ • persona config (loaded from       │
│   ./personas/<species>.json)        │
│ • claude sonnet 4.6 via anthropic   │
│ • tools: speak, walk_to, pick_up,   │
│   write_notion, query_other_agent   │
│ • livekit-server-sdk → joins room   │
│   as a participant                  │
│ • subscribes to notion webhooks via │
│   the mimi-events worker            │
└─────────────────────────────────────┘
```

## Run

```bash
# tiger (github agent)
bun dev -- --persona tiger --workspace <notion-workspace-id>

# all five at once via a process manager (PM2-lite)
bun start-all
```

## Tools the agent has

- `speak(text)` — animalese to the room via livekit data channel
- `walk_to(x, y, z)` — broadcast a new position
- `pick_up(artifact_id)` — claim an artifact, animate hold
- `write_notion(db, row)` — call mimi-events worker to write a db row
- `query_notion(db, filter)` — read from notion
- `query_other_agent(name, msg)` — dispatch to another agent's runtime

## Personas

`personas/<species>.json` defines:
- name, species, motto, voice cluster
- system prompt (persona-conditioned)
- watched source (github/gmail/calendar/etc)
- tool list
- mood transitions

Five v1 personas: tiger, otter, bunny, giraffe, dog (mimi.).
