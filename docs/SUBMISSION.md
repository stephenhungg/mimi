# submission — cerebral valley + sponsor forms

> copy-paste-ready text. update the URL placeholders at the bottom before submitting.

## tagline (≤ 140 chars)

> mimi. — the notion-native 3D agent workspace where chibi animals watch your tools, coordinate in real time, and write back to notion.

## one-line pitch (≤ 280 chars, twitter-style)

> a cozy 3D room where your team's specialized agents live: tiger watches github, otter watches email, bunny watches calendar. push a commit → tiger jolts → slams its keyboard → drafts the PR → notion updates live. all on notion's dev platform.

## full description (~150 words, judging blurb)

mimi. is a two-layer agent workspace built end-to-end on notion's developer platform. **layer A** is a notion page that renders a live svg thumbnail of a shared 3D room, plus inline db views — judges scroll notion and the product is right there. **layer B** is a first-person multiplayer 3D room (vite + r3f + livekit) where chibi animal agents and human chibis coexist. each animal owns a specialty: tiger watches github, otter watches gmail, bunny watches calendar, mimi (the dog) is the dispatcher, giraffe summarizes notion meeting notes.

every action writes back to notion as canonical state — 5 dbs, 6 workers (one per integration + an MCP server + a wrapper around the official notion-agents-sdk-js). agents speak in procedural animalese. **failure is a first-class state**: when an agent rate-limits, it curls into a slime puddle and mimi walks over to check on it. most demos hide failure — we celebrate it.

## team

- **stephen hung** — runtime, workers, 3D client (founders@kalilabs.ai)
- **maddy** — design, room aesthetic, demo narrative, on-stage
- **tenz** — coordination, infra, decisions

## tech stack (sponsor-facing detail)

- **notion dev platform**: 5 dbs · 6 workers (`mimi-events`, `mimi-github-bridge`, `mimi-overnight-pulse`, `mimi-thumbnail-render`, `mimi-mcp-server`, `mimi-notion-agents`) · MCP server · meeting-notes endpoint
- **notion-agents-sdk-js**: the new official sdk, integrated end-to-end (`mimi-notion-agents` worker wraps `@notionhq/agents-client`; mimi can summon notion-hosted custom agents live)
- **3D client**: vite, react 19, three.js, @react-three/fiber, drei, livekit-client
- **multiplayer**: livekit cloud (data channel only — position + chat broadcasts, ~1-10hz)
- **agent runtime**: bun + @anthropic-ai/sdk (claude sonnet 4.6 with tool-use loop). per-agent personas (.md system prompts), 7 tools (walk_to, type_at_keyboard, speak, set_mood, curl_up, reset_pose, file_artifact)
- **voice**: animalese — procedural chirp synth via web audio api, per-species voice cluster (dry / warm / chipper / leader / thoughtful). no TTS service. fully offline.
- **landing + onboarding**: next.js 15 on vercel. token-mint endpoint (`/api/livekit-token`) co-located with the marketing site.
- **brand**: asphalt #302F2C + paper #EFEDE3 (warm undertones, never pure b/w). pokemon gen-1 trainer cards. animal-crossing-coded.

## key links (FILL IN BEFORE SUBMISSION)

- **demo video (1 min)**: <upload to vimeo/youtube unlisted, paste link>
- **github repo**: https://github.com/stephenhung/mimi
- **live landing**: <vercel deploy URL>
- **published notion page**: <notion publish-to-web URL>
- **architecture deep-dive**: https://github.com/stephenhung/mimi/blob/main/docs/ARCHITECTURE.md

## why this is the killer app for notion's dev platform

- **dual-direction sync**: workers write notion ↔ agents read notion ↔ external agents read mimi via MCP. notion is genuinely the substrate, not a side-effect.
- **uses every primitive**: workers, syncs, custom agents (via the new SDK), MCP exposure, meeting-notes blocks, image blocks (for the thumbnail), inline db views. one cohesive app, every part of the platform doing real work.
- **notion as the dashboard surface**: the demo page IS a notion page. judges don't open another tool first. that's the cracked play.

## license

MIT.

## checklist before submission

- [ ] all 3 demo terminals running (web, landing, agents)
- [ ] notion page published to web + link works in incognito
- [ ] github webhook tested live (real push → tiger reacts)
- [ ] 1-min video uploaded + URL replaces placeholder above
- [ ] vercel deploy of apps/landing succeeded
- [ ] README.md at repo root points at demo video
- [ ] no `.env` or secrets committed (git status clean)
- [ ] submission form filled at https://cerebralvalley.ai/events/... (find correct URL morning of)
