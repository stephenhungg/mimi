# demo runbook — mimi.

> the step-by-step for the 1-min video + the 3-min judging walkthrough. read before recording.

## pre-flight (do once, t-30min before recording)

```bash
# 0 — env loaded
cat .env.local | grep -E "NOTION_TOKEN|LIVEKIT|ANTHROPIC|GITHUB" | wc -l   # expect 7+

# 1 — provision notion (idempotent — safe to re-run)
bun run provision:notion
# verify .env.local now has NOTION_DB_* ids

# 2 — seed demo state so notion looks lived-in
bun run seed:demo

# 3 — deploy workers
cd workers
ntn workers deploy --name mimi-events
ntn workers deploy --name mimi-github-bridge
ntn workers deploy --name mimi-thumbnail-render
ntn workers deploy --name mimi-overnight-pulse
ntn workers deploy --name mimi-mcp-server
cd ..

# 4 — configure the github test repo webhook
gh api repos/$GITHUB_REPO/hooks -X POST \
  -f name=web \
  -f active=true \
  -F events[]=push -F events[]=pull_request \
  -F config[url]=$MIMI_GITHUB_BRIDGE_URL/github \
  -F config[content_type]=json \
  -F config[secret]=$GITHUB_WEBHOOK_SECRET
```

## launch order (t-5min before recording)

terminal 1 — landing (token server):
```bash
bun run dev:landing
```

terminal 2 — web (3D client):
```bash
bun run dev:web
# opens http://localhost:5173
```

terminal 3 — agents (parallel):
```bash
AGENT_PORT=8081 bun run dev:tiger
# new tab — different port per agent
AGENT_PORT=8082 bun run dev:otter
AGENT_PORT=8083 bun run dev:bunny
AGENT_PORT=8084 bun run dev:dog
```

terminal 4 — utility (left open for the killshot):
```bash
cd ~/path/to/opal   # the test github repo
```

## demo loop (3 minutes) — per PROJECT.md

| time | beat | who | action |
|---|---|---|---|
| 0:00–0:30 | thesis hook | stephen on camera | "every team uses 5 ai tools that don't talk to each other. mimi. is the workspace where your team's specialized agents live..." |
| 0:30–1:00 | notion thumbnail | screen on notion page | thumbnail is live + animated. point at events db filling. roster shows 5 residents. |
| 1:00–1:30 | enter the 3D world | maddy clicks thumbnail | loads `localhost:5173`. she walks (WASD) around. stephen's chibi visible. tiger at code corner, bunny at calendar wall, mimi center. |
| 1:30–2:00 | **KILLSHOT** | stephen at terminal 4 | `git commit -am "fix: tighten retry"` + `git push`. WITHIN 2s in the 3D room: tiger jolts, walks to corner (-5,-5), keyboard-slam animation, animalese chirp "stephen pushed to opal — drafting a fix...", artifact appears in notion artifacts db. |
| 2:00–2:30 | mimi dispatch | new tab — gmail send | send a real email to the wired mailbox. mimi (dog) speaks: "team — incoming email, otter triage." otter walks across, opens convo. bunny twitches. |
| 2:30–3:00 | notion close | alt-tab to notion | events db: 12+ rows in last 5 min. artifacts db: PR draft. agent_memory pages: tiger's journal. "every primitive notion shipped — workers, dbs, agents api, MCP server. mimi. is the killer app." |

## 1-min cut

trim to: thesis 5s + thumbnail 8s + enter room 8s + killshot 22s + dispatch 10s + close 7s = 60s.

## fallback plan (if something breaks during recording)

- **tiger doesn't react to push** → run `bun scripts/poke-agent.ts tiger` in terminal 4 instead — same visual, no github roundtrip
- **livekit drops** → refresh browser, re-join room. peer state will re-broadcast within 1s
- **agent crashes** → it should `curl_up()` automatically. mimi walks over. that's actually a feature shot — keep rolling.
- **notion api 429** → seed demo state is already in place; events db rows persist. just point at existing rows.

## artifact checklist (before submission)

- [ ] github repo public, MIT license
- [ ] README.md links to demo video + ARCHITECTURE.md
- [ ] PROJECT.md committed
- [ ] CHANGELOG short note
- [ ] 1-min video uploaded (cerebral valley submission form)
- [ ] tagline ≤ 140 chars: "mimi. — the notion-native 3D workspace where your team's agents live, watch the outside world, and coordinate."
