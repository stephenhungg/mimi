# packages — shared libraries

Internal libraries used across `apps/`, `agents/`, and `workers/`.

## `types/`
TypeScript types for everything that crosses a process boundary:
- Notion db row schemas
- Event payloads (position update, speak, artifact pick, dispatch)
- Agent persona config
- MCP tool input/output

## `animalese/`
Procedural animalese voice. Lifted in spirit from Angel but rewritten fresh inside this repo.
- 6 sample clusters (cheerful, sleepy, sassy, earnest, dry, warm)
- per-character chirp player
- subtitle reveal coordinator

Sample audio in `samples/` (TBD — generate at runtime or pre-bake).

## `notion-client/`
Typed wrapper over `@notionhq/workers` API client. Hides the page-property serialization boilerplate.
- `residents.upsert(agent_id, fields)`
- `events.append(event_type, payload)`
- `artifacts.create(title, body)`
- `memory.append(agent_id, entry)`
