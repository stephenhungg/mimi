# lessons — mimi.

self-improvement log per the chill-dev style guide. each correction or non-obvious win lives here so future-me doesn't relearn the same shit.

format: **<topic>** — what to do / what not to do. **why:** the reason. **how to apply:** when this kicks in.

---

## brand

**palette is asphalt #302F2C + paper #EFEDE3, never pure black/white.** both colors carry warm undertones (olive on asphalt, cream on paper). this gives chibis room to breathe while keeping a serious-product brand frame.
**why:** went through monochrome → warm palette pivot (commits 1af2a8b → 42510e8). pure b/w reads cold and generic; the warm undertones make it feel cozy without being cute. brand frame is for judges; chibi color is for delight.
**how to apply:** any html/css/svg/3D scene/sprite. import `BRAND.asphalt` / `BRAND.paper` from `@mimi/types` — never hardcode.

## architecture

**2.5D sprite billboards, not full 3D rigged characters.** each chibi is a 2D plane that always faces the camera (drei `<Billboard>`). state changes = sprite swap.
**why:** ships in 30 min vs 6+ hours of rigging. uses sprites we already generated. matches the brand reference exactly (animal crossing sprite + 3D world). failure-mode recovery: if r3f breaks, the same sprites work in a 2D top-down fallback.
**how to apply:** never reach for gltf loaders, mixamo, or skeletal animation. one plane per agent, three sprite states (idle, working, down), done.

**no voice chat, no TTS in v1.** text chat between humans (typed); animalese (procedural chirp) for agents.
**why:** massive de-scope. no elevenlabs latency. no mic permission. no audio mixing. animalese is faster to write, fully offline, and on-brand for animal-crossing-coded.
**how to apply:** if anyone asks "should we add voice" — no. ship the text+chirp first.

**failure is a first-class state (`curl_up`).** every agent loop wraps the anthropic call in try/catch. on rate-limit / timeout / error → broadcast state='down', mood='down'. mimi (the dog) walks over and says "you good?".
**why:** judges WILL probe failure. most demos hide it. we celebrate it visually — it's a rubric-killer per PROJECT.md.
**how to apply:** never `throw` from an agent loop. always catch → curl_up → log. recover after backoff.

## tooling

**workspace tsconfig: do NOT set `rootDir` when packages cross-import via path aliases.** tsc complains "file is not under rootDir" because the @mimi/types source lives outside the package's src.
**why:** hit this during wave 0 typecheck — every workspace package errored on the import. dropping rootDir + relying on `noEmit: true` for development typecheck is the clean fix. let bundlers (vite, next, tsx) handle actual output.
**how to apply:** every package tsconfig in this repo uses `noEmit: true` and skips `rootDir`. if we ever need actual emit, switch to project references (`composite: true` + `references`).

**`@notionhq/client` callout block `icon.emoji` is typed as `EmojiRequest` (an enum), not a generic string.** even though the api accepts any emoji.
**why:** strict ts blocked the build at notion-client wave 0.
**how to apply:** when passing dynamic emoji to notion blocks, cast: `icon: { type: "emoji", emoji: myEmoji as any }`. document the as-any with a comment.

**`notion-agents-sdk-js` is published as `@notionhq/agents-client` ONLY on github (not npm), and ships source-only (`private: true`, no `dist/`).** install with `"@notionhq/agents-client": "github:makenotion/notion-agents-sdk-js"` and add a `postinstall` hook that does `npm install && npm run build` inside the package so tsc can resolve `.d.ts` files.
**why:** `npm view notion-agents-sdk-js` returns 404 — the repo's package.json sets `private: true` so it's not on the registry. installing from github gives raw source with no compiled output, so type imports fail until the SDK is built. tried this for the mimi-notion-agents worker (step 1 of the sponsor flex) — postinstall build path worked first try; typecheck passed clean across all 6 workers.
**how to apply:** any time you depend on a public github sdk that isn't on npm, check `node_modules/<pkg>/dist/` after install. if missing, add postinstall: `node -e "...if (!fs.existsSync(p+'/dist')) execSync('npm install --no-save && npm run build', {cwd: p})"`. avoids vendoring source or forking the repo.

**bun add in a workspace root installs to root by default — pass `--cwd <pkg>` or run inside the package dir to land it in the workspace's package.json.**
**why:** lost a minute installing livekit-server-sdk into the root by accident, had to remove + reinstall.
**how to apply:** always check `bun pm ls` or grep the resulting package.json after install.

## process

**boil-the-ocean works only with a north-star killshot.** when scope is "everything", choose one demo moment (here: 1:30-2:00 commit→tiger jolts→PR) and order tasks so that beat works first, then expand outward.
**why:** infinite scope without a focal beat = no demo at submission time. focal beat means at any cut-off, we have something to show.
**how to apply:** wave 0 (foundation) → wave 1 (visual + network + agent + worker spines) → wave 2 (the killshot integration) → wave 3+ (everything else around it).

**parallelize lanes that don't share files.** visual lane (apps/web) + agent lane (agents/runtime) + worker lane (workers/) have zero file overlap → spawn 3 subagents simultaneously instead of serial. main thread handles the seam pieces (token server, env, scripts).
**why:** 3x throughput on independent work. the seams (broadcaster wire format, env contract) live in @mimi/types so they're already locked.
**how to apply:** before spawning subagents, write the seam types first. then lanes can't drift.
