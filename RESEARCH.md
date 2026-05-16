# Notion Developer Platform — Capability & Gap Research

Compiled 2026-05-16 during the Notion Dev Platform Hackathon. Pulled from notion.com/blog, developers.notion.com, llms.txt index, and TechCrunch/Dataconomy/Winbuzzer coverage of the May 13 announcement.

---

## Confirmed Capabilities

### Workers (hosted runtime)
- **Language**: Node.js / TypeScript only at launch
- **Deployment**: `ntn workers deploy` — CLI is the only path
- **Secrets**: stored securely, injected at runtime
- **OAuth**: built-in flows for GitHub, Google, Salesforce, more
- **Pacer**: rate-limit-aware retry layer to respect third-party quotas
- **Sandboxed exec**: HTTP requests allowed, sandboxed otherwise
- **Three primitive types**: Syncs, Tools, Webhooks

### Syncs
- Pull data from any API → Notion database
- Run on a schedule (DEFAULT: every 30 minutes — **non-configurable as far as docs show**)
- Continuous keep-in-sync
- Salesforce, Stripe, GitHub, Postgres, Zendesk reference impls

### Tools (the killer primitive)
- Functions a Custom Agent can invoke
- Defined via Worker that exposes a tool schema
- Agent calls tool → worker executes → returns result to agent
- This is how MIMI exposes itself TO claude code / cursor / codex

### Webhooks (rich event taxonomy)
**Page**: created, deleted, moved, undeleted, locked, unlocked, content updated, properties updated
**Database**: lifecycle + schema changes
**Data source**: ops
**Comment**: created, updated, deleted
**File upload**: created, completed, failed, expired
**View**: ops
**Meeting**: transcript deletion (yes, really)

### REST API surface
- v1/users, v1/pages, v1/databases, v1/blocks, v1/views, v1/comments, v1/search
- `POST /v1/blocks/meeting_notes/query` — pull AI meeting notes (rare, underused)
- Comment update/delete now GA
- Multi-value select, status, multi_select on db filters
- Personal access tokens supported

### CLI (`ntn`)
- `ntn login` — workspace auth
- `ntn workers new / deploy / list`
- `ntn api <path>` — direct REST proxy with -X PATCH support
- `ntn files create / list` — file uploads (also `--external-url`)
- Data source commands (referenced but undocumented in overview)

### External Agents API
- Bring claude code, cursor, codex, decagon natively into notion
- They appear as workspace participants, chat in notion, take action
- Cursor explicitly: "build features, fix bugs, open PRs from notion tasks"

### MCP Integration
- Notion MCP server lets external AI tools (claude code, chatgpt, cursor) read/write notion
- Documented at developers.notion.com/guides/mcp/overview

---

## Documented GAPS (where docs admit limitation or omit)

1. **NO scheduled triggers documented beyond syncs' 30-min default**. If you want cron-style "run every 5 min" or "run at 8am" — not natively documented. You'd hack via sync at default cadence + worker that no-ops most cycles.

2. **NO persistent state/memory layer**. The platform's answer is: "use Notion databases as your state." This is actually elegant but means agents have to roundtrip to notion api on every read.

3. **NO conditional workflows / orchestration DAG**. Each worker is independent. Multi-step flows = you write the orchestration yourself.

4. **NO native human-in-the-loop / approval queue pattern**. Workers can take action, but there's no docs-supported "wait for human approval before this commits" primitive. Devs have to fake it via comment events.

5. **NO native agent-to-agent comms protocol**. External agents can each act on notion, but there's no direct A2A — they go through notion as a substrate. This is the gap MIMI exploits.

6. **NO observability dashboard for agent actions**. Workers log to local logs, but there's no "show me everything every agent did in this workspace this week" surface. MIMI is literally this view.

7. **NO trust/reliability scoring on agent outputs**. Notion treats all agent outputs equally. MIMI's trust ledger fills this.

8. **Worker CPU/memory/duration limits NOT documented** in public docs (TBD via empirical test).

9. **No streaming worker responses documented** — request/response model only.

10. **No native vector / embeddings on notion content** — for RAG-like patterns you bring your own.

---

## Non-Obvious Capability Combos

1. **Worker as agent-tool**: build a tool any custom agent (including external claude code) can call. MIMI exposes `review_artifact(notion_page_id) -> verdict + roast`. Cursor or claude code can call this BEFORE shipping.

2. **Webhook → worker → comment**: when a page changes, post a comment with mimi's reaction. Comments are first-class events → other agents can subscribe to them. Creates an A2A bus through notion comments.

3. **Meeting notes endpoint + belief graph**: pull AI meeting notes, extract claims, compare to current beliefs db. Flag contradictions. Nobody is using `/v1/blocks/meeting_notes/query`.

4. **Sync at 30-min cadence + heartbeat**: piggyback on the only scheduled primitive to run a "watcher" tick every 30 min. Tick reads agent activity, runs gremlin, posts decisions page. This IS the background-execution proof.

5. **OAuth GitHub + worker + agent-tool**: agent says "ship the PR," tool checks if mimi has reviewed it first, fails open if not. Forced-trust pattern.

6. **File upload events**: agents drop artifacts as files. File-upload-completed event triggers gremlin review. Multimodal review surface for free.

7. **Database schema as agent permission boundary**: workers can read schema, so the trust ledger schema literally defines what agents are allowed to do/see. Schema-as-policy.

---

## Plays That Have Been Done To Death (avoid)

- "AI for [domain]" chatbot — banned outright by hackathon rules
- Basic RAG over notion pages — banned
- Personality analyzer — banned
- Streamlit anything — banned
- Generic "summarize my notion" agent — done a thousand times in march MCP challenge
- "Slack bot that posts notion updates" — overdone
- Standup writer (it's literally in their example list — telegraphed = boring)
- Meeting notes summarizer — too obvious
- Receipt scanner / budget tracker — example in their docs

## Plays the Comp Will Build

- Chief-of-staff agent (brian lovin tweeted his, judges have seen it)
- Personal agent launcher (the obvious post-announcement play)
- Code review bot (claude code + notion task = obvious)
- Multi-agent project manager (cursor + claude code + notion = obvious)

## What MIMI Does Differently

1. **Meta-layer, not parallel competitor** — observes other agents, doesn't replace them
2. **Belief graph as core artifact** — not just task list, evolving world model
3. **Adversarial review (the gremlin)** — personality-driven critic, durable memory of agent failure patterns
4. **Trust ledger** — quantifies which agents are full of shit, when
5. **Schema-as-policy** — notion database schema literally encodes what agents may do
6. **Background-execution-first** — designed to run overnight with no human input, walks the rubric's biggest category

---

## Judge-Impressing Code Patterns

1. Use `POST /v1/blocks/meeting_notes/query` to integrate AI meeting notes into the belief graph — nobody else will.
2. Define MIMI as a tool callable by external agents via worker schema export — shows you read the agent tool docs deep.
3. Use comment events as A2A bus — clever use of webhook taxonomy.
4. Build the trust ledger as a notion db with status property = creates a native notion view of agent reliability the judges can scroll.
5. Schema-as-policy: agents can only read columns the trust ledger marks them trusted for. Shows architectural maturity.

---

---

## Round 1 detached research (unverified, sandbox-blind synthesis)

These came from a detached subagent that hit a sandbox and inferred from in-context signal only — verify before quoting in demo:

- **Cross-agent event subscription**: filter `agent.message.posted` where `agent_id != self`. Foundation of the watcher pattern. Most teams won't know this exists.
- **Streaming reply API**: token-stream the gremlin's roast directly into a notion block. Live demo gold.
- **One worker, both schedule + event triggers**: `ntn.toml` with `[[triggers]]` covering background-exec AND event-driven in one file. Single artifact, rubric-hitting.
- **Worker-local KV**: trust ledger lives in worker KV, no external store provisioning.
- **Agent tool advertisement**: publish `query_trust_ledger(agent_id)` as a tool other agents can call. Recursion bait for anthropic + conviction judges.

### Spicy round-1 angles
- Self-critique mode: gremlin reviews mimi itself
- "Anti-slop" signal: flag when two agents agree too confidently (suspicious echo chamber)
- Name the gremlin something notion-internal as a wink to simon/max

### Verify before demo
- Exact event names + filters
- Whether streaming replies are v1 or roadmap
- Cross-agent visibility oauth scope
- Real post rate limits
- `ntn agent register` real syntax (find via `ntn --help`)

---

## Stack (locked)

- `ntn` CLI for everything deploy-related
- 1 Worker exposing the `mimi.review` tool
- 1 Worker subscribing to page + comment + file webhooks
- 1 Worker on the 30-min sync cadence for heartbeat/background pass
- Claude Sonnet 4.6 for belief extraction + gremlin persona
- Notion db: agents, actions, beliefs, conflicts, reviews, trust_ledger, decisions
- Simple Next.js demo page that renders the daily decision card (optional polish)
- Real github webhook to demo the "external agent makes PR → mimi catches conflict" loop live

---

## Verified from Round 2 Research
_Source: live fetches from developers.notion.com on 2026-05-16 (post-launch May 13 2026)_

### Worker SDK — exact method surface

```ts
worker.database({ type: "managed", initialTitle, primaryKeyProperty, schema })
worker.pacer({ allowedRequests, intervalMs }) // .wait() before external calls
worker.sync(key, { database, mode: "replace" | "incremental", schedule, execute })
worker.tool(key, { title, description, schema, outputSchema?, hints?, execute })
worker.webhook(key, { title, description, execute })
worker.oauth({ clientId, clientSecret, authorizationEndpoint, tokenEndpoint, scope })
```

- Runtime: **TypeScript/Node.js only**, sandboxed Node.
- **CPU/mem/duration limits are NOT publicly documented** as of May 16 2026. Notable gap.
- **Streaming responses: not mentioned anywhere in workers SDK docs.** Tools return strings or JSON-serializable objects. Treat as non-GA for our purposes.
- Tools can be marked `hints: { readOnlyHint: true }` — these auto-execute without user permission. Write tools always require user confirmation unless workspace policy overrides.

### Syncs — schedule grammar (this was guessed before, now verified)

- Allowed schedule strings: `"5m"`, `"15m"`, `"1h"`, `"1d"`, `"manual"`
- **Minimum 5m, maximum 7d.** No sub-minute schedules. No cron expressions — just discrete buckets.
- Mode `"replace"`: full dataset every cycle, missing rows auto-deleted on `hasMore: false`.
- Mode `"incremental"`: changes only, deletions must be explicit.
- Paginated via returning `{ changes, hasMore: true, nextState }` — Notion re-invokes `execute` with that state until `hasMore: false`.

### ntn.toml — NOT shown in any public doc

Both the workers overview AND the quickstart docs **do not include an ntn.toml example**. The configuration appears to live in the TypeScript code (`worker.sync()`, `worker.tool()`, etc.) rather than a separate config file. **The [[triggers]] schedule+event coexistence question is moot — there's no [[triggers]] block. Each capability is its own registration in code.** This means one Worker can absolutely register a `worker.sync()` with `schedule: "5m"` AND a `worker.webhook()` AND multiple `worker.tool()`s in the same `src/index.ts`.

### ntn CLI — full verified surface

```
ntn login / logout / doctor
ntn workers new / deploy / list / get / delete
ntn workers exec <key> [--local] -d '{"json": "input"}'
ntn workers sync trigger <key>
ntn workers sync pause <key> / resume <key> / status
ntn workers env set / list / unset / pull / push
ntn workers oauth start <key>
ntn workers webhooks list
ntn api <path> [-X METHOD] [field:=value]
ntn pages create / get / update / trash
ntn datasources query / resolve
```
Global flags: `--verbose`, `--json`, `--worker-id`. Env: `NOTION_API_TOKEN`, `NOTION_WORKSPACE_ID`.

Install: `curl -fsSL https://ntn.dev | bash`. Node 22+, npm 10+ required.

### Webhook events — full canonical list

Categories: **page**, **database**, **data_source** (new in 2025-09-03 API), **comment**, plus file_upload + view events.

Page: `page.created`, `page.content_updated`, `page.properties_updated`, `page.moved`, `page.locked`, `page.unlocked`, `page.deleted`, `page.undeleted`
Database: `database.created`, `database.moved`, `database.deleted`, `database.undeleted` (note: `database.content_updated` and `database.schema_updated` deprecated as of 2025-09-03 — use the data_source equivalents)
Data source: `data_source.{created,content_updated,schema_updated,moved,deleted,undeleted}`
Comment: `comment.{created,updated,deleted}`

**Delivery: at-most-once aspirational, up to 8 retries with exponential backoff, final retry ~24h after trigger.** Each event has stable `deliveryId` across retries. Payload includes `attempt_number`, `entity{id,type}`, `authors[]`, `accessible_by[]`.

**Worker webhook URL format (auto-generated post-deploy):**
`https://www.notion.so/webhooks/worker/{spaceId}/{workerId}/{uniqueWebhookId}/{webhookName}`

### Custom Agents + External Agents — verified state

- **External Agents** (Claude Code, Cursor, Codex, Decagon) = **PRIVATE BETA, waitlist only**.
- **External Agent API** = ALSO private beta waitlist. We cannot rely on it for the hackathon submission.
- The only public "external agent" doc is **how to connect Cursor to a Notion Custom Agent** — and it's a user-facing flow (paste API key into Notion modal), not a programmable surface.
- **Custom Agents are public** and can call `worker.tool()` tools immediately upon deploy. **This is the actual integration point for mimi.**
- @-mentioning a custom agent in a Notion comment triggers its tools. That's how agents get "assigned work."

### MCP surface — public and documented

- MCP server is hostable open-source (`/guides/mcp/hosting-open-source-mcp`).
- Build custom MCP clients (`/guides/mcp/build-mcp-client`).
- Supported MCP tools list (`/guides/mcp/mcp-supported-tools`).
- This is a complementary lane to Workers — MCP lets external agents (Claude/Cursor/etc.) call into Notion data via MCP protocol, while Workers let Notion call out to your code.

### Notable platform gaps (still true after round 2)

1. **No worker-to-worker pub/sub.** A worker cannot subscribe to another worker's events directly. Routing is via webhooks → external service → webhook back, OR via shared Notion database mutations that fire `data_source.content_updated`.
2. **No runtime limits documented.** Mimi's gremlin reviews need to fit within an undisclosed CPU/mem/duration budget. Plan for short-lived stateless executions; offload long-running analysis to external infra triggered by the worker.
3. **No streaming agent responses** in worker.tool(). Tools are request/response. For "live thinking" UX, must use Notion comments as the streaming channel (append to a comment block in chunks).
4. **No cron beyond 5m/15m/1h/1d.** Mimi's "watch every minute" instinct doesn't work — minimum interval is 5 minutes. Or use webhook-driven (event-arrives → react) which has no min interval.
5. **No External Agent API access.** Mimi cannot register itself as an external agent (Claude Code-style) without waitlist approval. Stick to **Custom Agent tools + webhooks** as the primary surface.
6. **MCP challenge winners (March 2026)** already shipped things like NoteRunway (hybrid API+MCP workspace cleanup). MCP-as-cleanup-tool is done. Mimi's "watch other agents" angle is fresh — nobody won the MCP challenge with a meta-observer.
7. **PAT support** shipped May 12 2026 (one day before platform launch). Personal access tokens now usable for scripts/CLI/trusted tools. Means mimi can authenticate non-Worker components against Notion without OAuth dance during the hackathon.

### Architectural implications for mimi (3-worker plan)

- **Watcher worker**: register `worker.webhook()` for inbound events from claude-code/cursor/codex (each external agent posts via its own webhook URL). Pair with one `worker.sync()` at `schedule: "5m"` for periodic belief-graph reconciliation.
- **Belief-graph worker**: holds the `worker.database({ type: "managed" })` schema for tracked agents, beliefs, and observed actions. Exposes `worker.tool()` endpoints for Custom Agents to query "what does mimi believe about agent X?"
- **Gremlin worker**: `worker.tool()` endpoints for `runAdversarialReview(agentId, scope)`. Custom Agent @-mention in a comment triggers it. Returns structured findings as a comment reply or page append.

All three live in **one Worker project** — no [[triggers]] block needed, just three groups of registrations in `src/index.ts`. Deploy once with `ntn workers deploy`.

### Confirmed competition context

- **Notion Developer Platform Hackathon, May 16-17 2026, in-person SF.** Submissions close Sunday May 17 around 3:30pm but our deadline-of-record is 12pm PT per stephen.
- Prior MCP challenge winner pattern: hybrid API + MCP, judge-friendly demos with clear "before/after" workspace state.
- Workers is **free through August 2026** on Business/Enterprise — no plan-gating risk for the demo.
- Per the changelog: PATs (May 12), markdown insert positions (May 15), meeting notes query (May 11), agent_id parent types (May 11). Fresh primitives — using `agent_id` parents and meeting notes queries could feel cutting-edge to judges.


---

## Round 3 — Cracked Notion Integrations

Deep dive into the non-obvious surfaces of the May 13 2026 platform. Goal: find the angles that will land with simon last, max schoening, anthony morris. Every pattern below is rated 1-5 on `JUDGE-IMPRESS / BUILD-COST / DEMO-VISIBILITY`. Lower build-cost is better.

### Confirmed primitives (the building blocks)

- **`worker.tool(key, { schema, outputSchema, execute, hints })`** — registered tools appear in *any* Notion Custom Agent's tool list. Schema is the `j` (zod-like) builder. `readOnlyHint: true` allows auto-execute without user confirm. Test locally via `ntn workers exec <tool> --local -d '{...}'`.
- **`worker.webhook(...)`** — handler gets `{ deliveryId, body, rawBody, headers, method }`. Retries 3x on error, never on `WebhookVerificationError`. Notion-native webhook events also fan into the same handler surface.
- **`worker.sync({ schedule: "5m"|"15m"|"1h"|"1d"|"manual"|"continuous", mode: "replace"|"incremental" })`** — state read/write between runs via `nextState`. Min interval 5m, max 7d. `"continuous"` is the cracked one — keeps running.
- **`worker.oauth(...)`** — full 3-legged OAuth with auto-refresh, works for github/google/anything. `await provider.accessToken()` from inside any tool/sync/webhook.
- **`worker.pacer()`** — distributes API budget across windows; `await pacer.wait()` from anywhere.
- **`worker.database(...)`** — declares a managed db, auto-migrates schema on deploy. Synced properties are LOCKED in the UI (huge for canonical-state design).
- **Comment `display_name: { type: "custom", custom: { name: "Mimi-Pip" } }`** — a single worker can post comments under *arbitrary* names per-comment. This is the chibi-talks-in-notion primitive.
- **`agent_id` parent type** (shipped 2026-05-11) — pages/blocks parented to an agent. Currently scoped to "agent instruction pages," but the type exists and serializes cleanly.
- **`POST /v1/blocks/meeting_notes/query`** (shipped 2026-05-11) — filter by attendees/title/created_time, returns transcript + summary + notes block IDs. **No webhook yet** — must poll, but `last_edited_time desc + limit 1` makes this a 5-line near-realtime feed.
- **Webhook taxonomy includes:** `comment.created/updated/deleted`, `file_upload.completed/created/expired/failed`, `view.created/updated/deleted`, `page.transcription.block_transcript_deleted` (implies there's also a created variant), `page.content_updated`, `data_source.content_updated`, `data_source.schema_updated`.
- **Markdown `insert_content.position`** (shipped 2026-05-15) — prepend OR append to a page without rewriting it. This is the streaming-into-notion primitive.

### What's a hard NO (we ruled out)

- **No "external agent registration" API yet.** External Agents API is private-beta waitlist. We cannot make mimi appear in someone's agent list without going through partnership flow. (Workaround: ship as a Custom Agent backed by our workers.)
- **No A2A comment subscription.** `comment.created` payload's `created_by` is just a partial user — no agent/bot flag. Workers CAN react to all new comments, but filtering "comments made by agent X" requires checking `display_name.resolved_name` or stashing comment IDs we created.
- **No build-your-own-MCP-server-for-notion.** Notion's MCP is a hosted endpoint at `mcp.notion.com/mcp`. The `notion-mcp-server` OSS is unmaintained. mimi cannot register itself as an MCP server that notion AI talks to.
- **No streaming tool output.** Tools return JSON or string. Nothing fancier.

### THE CRACKED PATTERNS (ranked)

#### 1. Chibi-as-Display-Name comment puppetry  **JUDGE:5 / COST:1 / DEMO:5**
Every chibi in the room posts to the same canonical notion page (or per-agent journal) using `display_name.type: "custom"` with the chibi's name. Demo: a human comments on a notion page → webhook fires → mimi-world-events posts a reply *as the chibi "Pip"* in notion AND broadcasts to the 3D room. Same character, two surfaces. **This is the wow moment.** Simon will recognize it instantly because the custom display_name field is brand new and underused — most integrations still post as "[Integration] my-app".

#### 2. Worker-as-canonical-state with locked synced properties  **JUDGE:4 / COST:2 / DEMO:3**
mimi-world-events declares a managed db (`world_events`) via `worker.database()`. Properties that the 3D room owns (chibi position, last action, current emotion) are sync-written → users SEE them in notion but **cannot edit them in the Notion UI**. This is gold because it makes "notion is canonical state" defensible — judges will ask "what stops a user from editing the db and breaking the room?" Answer: the platform itself.

#### 3. Continuous sync as the agent heartbeat  **JUDGE:4 / COST:1 / DEMO:4**
mimi-overnight-pulse uses `schedule: "continuous"` mode instead of cron. The sync returns `hasMore: true` to keep the runtime alive in a tight loop. Each iteration: query meeting notes / page edits / db changes since last cursor, emit chibi reactions. Effectively: a server-side daemon that does NOT need us to run any infra. **Notion pays the compute, we ship the brain.** Anthony will appreciate the "the platform pays for the always-on agent loop" pattern.

#### 4. Meeting-notes-to-chibi narration  **JUDGE:5 / COST:2 / DEMO:5**
A sync polls `/v1/blocks/meeting_notes/query` every 5 min with `sort: [created_time desc], limit: 1`. New meeting → fetch the transcript block → a chibi in the room walks to the whiteboard and *summarizes the meeting aloud via animalese* with the actual summary as caption text. Pulls the brand-new May 11 endpoint, which nobody at the hackathon will use because it's not in tutorials yet. This is the "oh shit they read the changelog from 5 days ago" moment.

#### 5. File-upload-completed → chibi vision  **JUDGE:5 / COST:2 / DEMO:5**
Webhook on `file_upload.completed` → worker pulls the file → if image, sends to claude vision → chibi walks over to a virtual "photo wall" in the room, holds up the image, "comments" on it (animalese + caption) → posts the description back as a notion comment on the page. Human drops a screenshot into notion, chibi picks it up in the 3D world and reacts. **Cross-surface continuity is the whole pitch.**

#### 6. Agent-tools as the inter-worker bus (workers calling workers via custom agent)  **JUDGE:4 / COST:2 / DEMO:3**
Notion doesn't give us native worker-to-worker pub/sub. But: mimi-agent-tools registers tools like `get_room_state`, `nudge_chibi(name, action)`, `query_trust_ledger(agent_id)`. Any Custom Agent in the workspace (including ones invoked by mimi-overnight-pulse via the comment+@mention pattern) can call these tools. The trick: mimi-github-bridge receives a github event, posts a notion comment "@mimi-coordinator please nudge Pip to celebrate" — the custom agent reads the mention, calls `nudge_chibi` — chibi reacts. **Custom agents become the message bus, with workers as the actual implementation.** This is the agent-orchestration story max schoening will care about.

#### 7. The agent journal pattern (agent_id parent + per-agent page)  **JUDGE:3 / COST:1 / DEMO:3**
Each chibi has a notion page parented to its agent identity. After every action, the chibi's worker handler appends a markdown line via `update-page-markdown` with `insert_content.position: "end"`. **No rewrite, just append.** Agents have actual journals. Demo: open a chibi's notion page, watch lines stream in live as the chibi acts in the 3D room. Bonus: agents can read their OWN journals to maintain continuity across sessions ("yesterday I helped stephen ship X, today I'll check on it"). Uses the May 15 markdown-position feature nobody else has touched.

#### 8. Trust ledger as a queryable agent tool  **JUDGE:3 / COST:1 / DEMO:2**
mimi-agent-tools exposes `query_trust_score(agent_name)`. Backed by a managed db. Other agents (notion custom agents, external claude code sessions via MCP, etc) can call it. **mimi becomes a piece of infrastructure other agents depend on**, not just a demo. Bonus framing: "your AI agents shouldn't trust each other blindly — query mimi first."

#### 9. View-created webhook → reactive 3D layout  **JUDGE:3 / COST:3 / DEMO:4**
Human creates a kanban view in notion → `view.created` webhook → worker pushes the view config to the room → the 3D world rearranges its furniture / whiteboard layout to match the new view's columns. Notion becomes the level editor for the room. Cool but build cost is real (need a layout engine in the client).

#### 10. Today's-brief auto-page at 7am  **JUDGE:2 / COST:1 / DEMO:2**
Sync at `"1h"` cadence, at 7am local: query all changed pages + new comments + new meeting notes since 24h ago, generate a "Today's Brief" page via markdown-append. Useful but generic — every hackathon has one. Use only as filler if we have time.

#### 11. (Spicy unhinged) Cursor backed by mimi  **JUDGE:5 / COST:4 / DEMO:3**
The cursor→notion-custom-agent connect guide reveals the integration is via "User API Key" pasted into notion. We *could* register mimi as a custom agent the same way and let cursor route work through it — every notion-task that cursor picks up gets mirrored as a chibi "working" in the room. Build cost is the unknown (we don't fully know the wire). If we can crack this in 4 hours, it's a category-defining demo: "cursor doesn't just edit your code, it teleports a chibi to your office to do the work alongside you."

### Build priority for the next ~30 hours

**Must-ship (Sat morning):**
1. Chibi-as-display-name comments (#1)
2. Locked synced properties in world_events db (#2)
3. file_upload → chibi vision (#5)

**Stretch (Sat afternoon / Sun morning):**
4. Meeting-notes-to-chibi narration (#4)
5. Continuous-sync heartbeat (#3)
6. Agent journal pattern (#7)
7. Custom-agent as message bus (#6)

**Demo polish:**
8. Trust ledger tool callable from claude code session in the demo video (#8)

### Why this lands with these specific judges

- **simon last** — knows every edge case; will instantly clock that we used `display_name.custom`, `meeting_notes/query`, `insert_content.position`, and `agent_id` parents. Four brand-new surfaces in one demo.
- **max schoening** — head of product; will care about workers-as-orchestration-bus, locked synced properties (a product-thinking move), and the agent-journal pattern as a *new* primitive notion didn't ship explicitly.
- **anthony morris** — claude code MTS; the "platform pays for the heartbeat" continuous-sync angle + cursor-backed-by-mimi is his world.
- **andrew qu (vercel)** — will dig the workers-as-edge-compute story; everything we ship is hosted by notion, zero vercel needed (this is a feature, not a bug for them).
- **mike vernal** — pattern guy; the multi-surface continuity (3D chibi reacts to notion comment AND posts back as same character) is a "wait, this is a new category" moment.

### Sources

- https://developers.notion.com/llms.txt (full doc index)
- https://developers.notion.com/workers/guides/tools.md
- https://developers.notion.com/workers/guides/webhooks.md
- https://developers.notion.com/workers/guides/syncs.md
- https://developers.notion.com/workers/guides/oauth.md
- https://developers.notion.com/workers/reference/sdk.md
- https://developers.notion.com/reference/query-meeting-notes.md
- https://developers.notion.com/reference/parent-object.md
- https://developers.notion.com/reference/comment-display-name.md
- https://developers.notion.com/reference/create-a-comment.md
- https://developers.notion.com/reference/webhooks.md
- https://developers.notion.com/page/changelog.md
- https://www.notion.com/blog/introducing-developer-platform
- https://techcrunch.com/2026/05/13/notion-just-turned-its-workspace-into-a-hub-for-ai-agents/
- https://dev.to/devteam/congrats-to-the-notion-mcp-challenge-winners-28ab
- https://matthiasfrank.de/en/notion-workers-dev-day-2026/
