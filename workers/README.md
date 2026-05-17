# workers — notion-hosted runtimes

Four workers deployed via `ntn`. Each is its own directory with an `index.ts`.

For the underlying Notion Workers SDK reference, see [`NOTION-WORKERS-SDK.md`](./NOTION-WORKERS-SDK.md).

## The four workers

### `mimi-events/`
Webhook target for in-world events (chibi position updates, speech, artifact picks). Writes to the events / conversations / artifacts dbs. The primary fan-in.

### `mimi-overnight-pulse/`
Runs on the 30-min sync schedule. Wakes idle agents, has them pace, posts to events db, drafts the morning brief page each cycle.

### `mimi-mcp-server/`
Exposes mimi. as an MCP server per-room. Any external AI (claude code, cursor, codex, custom claude builds) can connect and call tools: `mimi.join_room`, `mimi.move_chibi`, `mimi.speak`, `mimi.pick_up`, `mimi.write_artifact`, `mimi.query_memory`.

### `mimi-github-bridge/`
GitHub webhooks → notion events + broadcast to the tiger agent's runtime. The "live commit triggers tiger to react" demo beat.

## Shared utilities

`_shared/` holds common types, db helpers, claude client wrappers, etc — imported by all workers.

## Deploy

```bash
cd mimi-events
ntn workers deploy --name mimi-events
```

Workers are deployed to the workspace tied to the active `ntn login`.
