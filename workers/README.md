# workers — notion-hosted runtimes

Five workers deployed via `ntn`. Each is its own directory with an `index.ts`.
For the underlying Notion Workers SDK reference, see [`NOTION-WORKERS-SDK.md`](./NOTION-WORKERS-SDK.md).

Shared types live in [`_shared/src/mimi.ts`](./_shared/src/mimi.ts). They duplicate
the minimum subset of `@mimi/types` needed by workers — keep in sync until the
workspace/npm interop lands.

## Deploy

Each worker is its own deploy target. From the worker's subdir:

```bash
cd <worker-dir>
ntn workers deploy --name <worker-name>
```

Or with `ntn`'s explicit entry flag from the repo root:

```bash
ntn workers deploy --entry mimi-events/index.ts --name mimi-events
```

Type-check everything: `npm run check`.

## The five workers

### `mimi-events/` — `mimi-events`
Central event ingestion. POST `/event` (webhook) accepts any `ExternalEvent`,
writes a row to the events db, and fans out to the matching agent runtime.

Capabilities:
- webhook `event` — POST JSON, normalized into an event row + agent ping
- tool `appendEvent` — write a single row from anywhere
- tool `routeToAgent` — POST a synthetic event to a species' runtime
- tool `health`

Required env:
- `NOTION_TOKEN` (or `NOTION_API_TOKEN`)
- `NOTION_DB_EVENTS`
- `AGENT_BASE_URL` (or per-species `AGENT_TIGER_URL`, `AGENT_OTTER_URL`, …)

### `mimi-github-bridge/` — `mimi-github-bridge`
GitHub webhook receiver. Verifies `X-Hub-Signature-256` using Web Crypto
(`crypto.subtle.verify`), normalizes the payload, forwards to `MIMI_EVENTS_URL`.

Capabilities:
- webhook `github` — POST from GitHub
- tool `simulatePush` — fire a synthetic push for demo
- tool `health`

Required env:
- `GITHUB_WEBHOOK_SECRET`
- `MIMI_EVENTS_URL` (URL of the `mimi-events` `/event` webhook)

### `mimi-overnight-pulse/` — `mimi-overnight-pulse`
30-minute agent pacing pulse. An external scheduler (cron-job.org, GH Actions,
Notion automation) POSTs the `/pulse` webhook every 30m. Each pulse queries
recent activity and sends a synthetic `pulse` event to every active species.

Capabilities:
- webhook `pulse` — POST from an external scheduler
- tool `triggerPulse` — manual demo trigger
- tool `health`

Required env:
- `NOTION_TOKEN` and `NOTION_DB_EVENTS` (optional — falls back to broadcasting to all species)
- `AGENT_BASE_URL` (or per-species `AGENT_*_URL` vars)

### `mimi-thumbnail-render/` — `mimi-thumbnail-render`
Renders the live SVG of the room (used by the Notion image block). Reads
residents + last 5 events and lays out chibis per species at their corners.

Capabilities:
- webhook `thumbnail` — trigger a rebuild (logs the SVG size)
- tool `previewThumbnail` — returns `{ contentType, cacheControl, body }` with `image/svg+xml`
- tool `health`

Required env:
- `NOTION_TOKEN`
- `NOTION_DB_RESIDENTS`
- `NOTION_DB_EVENTS`

### `mimi-mcp-server/` — `mimi-mcp-server`
MCP surface that exposes mimi. as a tool set to any external AI (Notion AI,
Claude Code, Cursor, Codex). Every `worker.tool(...)` is auto-exposed.

Tools:
- `list_residents()` — who's in the house
- `recent_events({ limit })` — last N events
- `summon_agent({ species, prompt })` — call the species runtime's `/dialogue`
- `read_agent_memory({ species })` — read the journal page
- `append_event({ source, type, summary })` — write a row externally
- `health`

Required env:
- `NOTION_TOKEN`
- `NOTION_DB_RESIDENTS`, `NOTION_DB_EVENTS`, `NOTION_DB_AGENT_MEMORY`
- `AGENT_BASE_URL` (or per-species URL vars)

## Workspace import note

Workers run on the Notion runtime, not Node, and this directory uses npm (no
workspaces wiring). The workspace packages `@mimi/types` and `@mimi/notion-client`
are NOT imported here. Instead, the minimum types + constants are inlined in
`_shared/src/mimi.ts` with a `// duplicated from @mimi/types — keep in sync` note.

When the workspace/npm interop is sorted, swap the inline import for the package import.
