# mimi. — the locked pitch (2026-05-17)

## one-sentence thesis

**Notion is the database. the 3D office is the presence layer. the 2D pixel map is the command center. all three views render the same world state.**

## three surfaces, one state

```
                    NOTION
                  (source of truth)
                  databases · pages · comments
                          │
                          │ bidirectional sync
                          ▼
                ┌─────────────────────────┐
                │ NORMALIZED WORLD STATE  │
                │ { agents, rooms, tasks }│
                └─────────┬───────────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
        3D OFFICE                   2D PIXEL MAP
        (presence)                  (command center)
        first-person                glanceable minimap
        chibi animals               sprite-level statuses
        spatial dialogue            click → zoom in
```

## why each surface has a job

### Notion (source of truth)
- the canonical state. every agent action, every task, every room is a row.
- you change tasks IN NOTION. the office reacts.
- judges have already learned Notion. zero onboarding.
- mimi. doesn't replace Notion — it makes it *embodied*.

### 3D office (presence layer)
- you walk in. you SEE your agents working.
- it's not decoration: it's how you feel "the team is busy" without reading text.
- spatial dialogue: walk up to an agent, press E, talk. matches how human teams actually communicate.
- multiplayer: see teammates' chibis in the room.

### 2D pixel map (command center)
- the dashboard you glance at while doing other work.
- shows: agent positions, statuses, task ownership, alerts.
- click agent → detail panel. click room → zoom into 3D.
- this is the EVERYDAY view. 3D is for the immersive moments.

## status visual language (matches across all three surfaces)

| state | 3D | 2D pixel | Notion |
|---|---|---|---|
| idle | bob | static sprite | mood: 😌 |
| working | typing animation | typing dots | status: in_progress |
| blocked | red exclamation | red ! icon | status: blocked |
| meeting | calendar icon overhead | calendar pin | linked event |
| done | sparkle + celebrate | green checkmark | status: done |
| errored | dizzy animation | dizzy sprite | mood: 😵 |
| sleeping | curled puddle | zzz | status: offline |

## the bidirectional sync loop

### Notion → office
1. user changes a Notion task row's status from `todo` → `in_progress`
2. Notion webhook fires → mimi-events worker
3. worker normalizes → broadcasts agent state change
4. 3D office: agent walks to desk, plays typing animation
5. 2D pixel map: sprite walks across grid in real-time
6. trips < 2s end to end

### Office → Notion
1. user drags a task card in the 3D world (or in the 2D map)
2. client → mimi-events worker → notion-client → updates row
3. Notion db reflects the change
4. (other surfaces refresh from the new state)

## the demo loop (3 min)

### [0:00–0:20] OPEN ON NOTION
"this is a notion workspace. tasks, residents, events, artifacts. it's the database for everything that happens in mimi."
- show the dbs, scroll the agent_memory page

### [0:20–0:40] EMBED THE 2D MAP
"but notion can do more than text. here's the live state of our workspace, rendered as a pixel-art minimap right inside this page."
- pixel art sprites at desks, mood bubbles, task indicators

### [0:40–1:30] WALK INTO THE 3D
"click the map → you walk into the office. it's the same world state, rendered as a presence layer."
- spawn first-person, walk around, see chibis at desks

### [1:30–2:00] THE BIDIRECTIONAL KILLSHOT
"watch what happens when I change a task in notion."
- alt-tab to notion. drag task from `todo` → `in_progress`.
- cut back to 3D: tiger walks to its desk, typing animation starts
- cut to 2D pixel map embedded in notion: tiger's sprite moved + typing dots animation
- under 2 seconds, three surfaces, one state

### [2:00–2:30] EXTERNAL EVENT (the github webhook beat)
- stephen pushes a real commit
- github webhook fires → tiger reacts in all three surfaces
- artifact row appears in notion

### [2:30–3:00] CLOSE
"notion is the database. the 3D office is the presence layer. the 2D pixel map is the command center. one workspace, three views, all rendered from the same state. we built mimi. in 24 hours on the new notion dev platform."

## why this finally lands

1. **notion isn't decoration**. it's the kingpin. judges who built notion will see it being used the way they always wanted: as a real backend, not a doc store.
2. **the 3D has a job**. presence. not "cute room with cute animals." you have to be in there to feel team activity.
3. **the 2D has a job**. command center. you don't always want to step into a 3D world to check on things.
4. **bidirectional**. office reacts to notion. notion reflects office. it's a real two-way sync, not a one-way visualization.
5. **the framing is composable**. judges can imagine teams of 50 agents, multiple offices, federation. the architecture extends.

## what stays from prior work

- ✅ asphalt + paper brand
- ✅ chibi animals as agents (need real 3D models, not billboards)
- ✅ Pokemon trainer cards (now the "agent detail panel" in 2D map)
- ✅ mimi-thumbnail-render worker (now the 2D pixel map renderer — promoted from background to featured)
- ✅ 6 workers, agent runtime, livekit, notion-client, all the wiring

## what's locked-new

- the 2D pixel map view is a real surface, not a thumbnail. needs its own route.
- bidirectional sync: notion db webhook → world state → broadcast.
- pitch language: "presence + command center + database" — every doc updates to match.
- 3D chibis become real 3D meshes (quaternius pack), not 2D billboards.
