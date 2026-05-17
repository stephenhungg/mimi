# agents.framer.website reverse engineering plan

- [x] capture reference evidence from `https://agents.framer.website/`: screenshots, dom text, computed layout, fonts, colors, image urls, and motion behavior.
- [x] scaffold `apps/landing` as a next.js + tailwind css app.
- [x] implement the page at high visual fidelity: spacing, layout, typography, images, footer, and responsive behavior.
- [x] port observed motion into gsap using react-safe setup and cleanup.
- [x] verify locally with build/lint plus browser screenshots against the reference.
- [x] document final evidence and remaining fidelity gaps here.

## resume 019e3374-755b-7a93-bc04-327ce57c3385

- [x] add `/Users/stephenhung/Documents/GitHub/mimi/.claude/settings.json` with a project permission allowlist.
- [x] run the landing production build from `apps/landing`.
- [x] start `next start` from the fresh production build and verify the landing page returns `200`.
- [x] inspect the served page enough to confirm the gsap/vendor chunk issue is gone.
- [x] record verification results here.

## verification results

- reference evidence captured with headed gstack browser:
  - `tasks/artifacts/agents-reference/ref-desktop-full.png`
  - `tasks/artifacts/agents-reference/ref-mobile-full.png`
  - `tasks/artifacts/agents-reference/ref-desktop-cssdom.json`
  - `tasks/artifacts/agents-reference/ref-inspect-desktop.txt`
  - `tasks/artifacts/agents-reference/ref-media-styles.json`
- local evidence captured from `http://127.0.0.1:3000/`:
  - current implementation lives at `/agents` to preserve the separate mimi homepage at `/`.
  - `tasks/artifacts/agents-local/local-agents-route-desktop.png`
  - `tasks/artifacts/agents-local/local-agents-route-mobile.png`
  - `tasks/artifacts/agents-local/local-agents-route-cssdom.json`
  - `tasks/artifacts/agents-local/local-agents-route-hover-work.png`
  - `tasks/artifacts/agents-local/local-agents-route-final-video.png`
  - `tasks/artifacts/agents-local/local-desktop-final.png`
  - `tasks/artifacts/agents-local/local-mobile-final.png`
  - `tasks/artifacts/agents-local/local-desktop-final-cssdom.json`
  - `tasks/artifacts/agents-local/local-hover-work.png`
  - `tasks/artifacts/agents-local/local-scroll-final-video.png`
- layout audit at 1440x1200:
  - hero, hero copy, work section, first work card, service preview, clients section, and final section matched reference dimensions within ~1px.
  - hero title now lands within 40px width and 4px height of the reference capture while preserving the same bottom hero placement.
  - footer height differs by ~18px because the local implementation uses a live browser clock instead of the stale static timestamp.
- animation coverage:
  - load animation: gsap timeline for nav, hero title, and hero copy.
  - scroll animation: hero media scrub, reveal-up batch, service preview parallax, service active-state triggers, final video reveal.
  - hover animation: work-card media reveal/scale via gsap; client mark reveal handlers are wired for mouse/focus events.
- verification commands:
  - `bun run lint`
  - `bun run typecheck`
  - `bun run build`
  - `curl http://127.0.0.1:3000/agents` returned `200`.
  - next static asset probe for `/agents` checked 10 `/_next/` refs with 0 failures.
  - headed browser interaction probe confirmed `.agents-work-inset` reaches opacity `1` on work-card hover.
  - headed browser scroll probe confirmed `.agents-final-video` reaches opacity `1` when the final section enters view.
  - client mark reveal handler confirmed `.agents-client-mark` reaches opacity `1` and width `32px`.

remaining fidelity notes:
- the hero video frame can differ between captures because the framer reference and local page both play remote video; static screenshots should be compared by layout and treatment, not a single exact frame.
- `tasks/artifacts/` is gitignored, so evidence is local-only unless explicitly moved into tracked docs.

## headed animation fidelity pass

- [x] sample reference load, scroll, and hover motion in headed chrome.
- [x] sample local `/agents` motion in the same headed chrome setup.
- [x] patch gsap timings/transforms/hover behavior where the local motion diverges.
- [x] rebuild and verify `/agents` with headed screenshots plus lint/typecheck.

### headed animation pass notes

- found and fixed a stale next server/build mismatch where `/agents` was returning a css asset that no longer existed; rebuilt clean before sampling.
- hero media now matches the reference scroll parallax at 1440x1200: `scrollY 240 -> y -192`, `640 -> -512`, `1050 -> -840`, `1200 -> -960`.
- removed non-reference motion from work cards, service preview, hero copy/nav, and final video; those are static/visible in the headed reference samples.
- kept the headline load as the only hero load tween, tuned to the framer-style slide-up without opacity fade.
- latest artifacts:
  - `tasks/artifacts/agents-headed/motion-audit-v2.json`
  - `tasks/artifacts/agents-headed/motion-audit-local-v4.json`
  - `tasks/artifacts/agents-headed/motion-audit-local-v5.json`
  - `tasks/artifacts/agents-headed/local-v4-hover.png`
  - `tasks/artifacts/agents-headed/local-v4-final-scroll.png`

## headed hover audit

- [x] audit nav hover against the framer reference.
- [x] audit work card hover against the framer reference.
- [x] audit service row hover against the framer reference.
- [x] audit client row hover against the framer reference.
- [x] audit footer link hover against the framer reference.
- [x] patch mismatches and verify local production bundle in headed chrome.

### hover audit notes

- nav links matched the reference: white to `rgb(134, 134, 139)` on hover.
- footer links matched the reference: gray to `rgb(240, 240, 240)` on hover.
- work cards now match the reference cursor behavior: `pointer` before hover, `none` on hover.
- client logos now match the reference headed sample by staying visible at `32px` before and after hover instead of animating in from width `0`.
- service hover remains local active-state behavior; the framer DOM sample reports service rows as static text, so no extra transform/scale was added.
- latest hover artifacts:
  - `tasks/artifacts/agents-headed-hover/hover-audit.json`
  - `tasks/artifacts/agents-headed-hover/hover-verify-local.json`
  - `tasks/artifacts/agents-headed-hover/local-hover-verified-work.png`
  - `tasks/artifacts/agents-headed-hover/local-hover-verified-client.png`

## deeper motion fidelity pass

- [x] restore hover-only work-card inset media.
- [x] add gsap smooth scrolling with `ScrollSmoother`.
- [x] audit reference motion deeper through load, scroll, card hover, service activation, client hover, and footer.
- [x] tune local gsap against headed chrome samples.
- [x] rebuild, verify, and record evidence.

### deeper motion pass notes

- work-card inset media is hover-only now: initial state is opacity `0`, hidden, scaled to `0.96`; hover animates to opacity `1`, scale `1`, cursor `none`, and starts the inset video; leaving pauses and resets the video.
- `ScrollSmoother` is active on the agents page wrapper/content. headed wheel audit shows native `scrollY` jumps to `900`, while `.agents-smooth-content` eases from `0` to `-900` over ~1.2s.
- hero title load now matches the headed framer timing closely at 1440x1200:
  - reference y: `953.84`, `928.45`, `913.61`, `899.24`, `892.04`, `891.34`
  - local y: `954`, `931.08`, `914.32`, `899.97`, `891.72`, `891`
  - sampled at `0ms`, `81ms`, `162ms`, `301ms`, `613ms`, `1001ms` after load event.
- had to stop a stale `next dev` listener and clean-rebuild `.next`; it was mixing dev css manifest paths with the production build and made browser measurements bogus until removed.
- latest deeper artifacts:
  - `tasks/artifacts/agents-deep-motion/deep-motion-audit.json`
  - `tasks/artifacts/agents-deep-motion/local-final-load-audit.json`
  - `tasks/artifacts/agents-deep-motion/local-final-interaction-audit.json`
  - `tasks/artifacts/agents-deep-motion/local-final-load-301.png`
  - `tasks/artifacts/agents-deep-motion/local-final-load-1001.png`
  - `tasks/artifacts/agents-deep-motion/local-final-wheel.png`
  - `tasks/artifacts/agents-deep-motion/local-final-hover.png`

## mimi kawaiify pass

- [x] audit the current `/` page and existing local assets as the kawaii brand source.
- [x] add `apps/landing/public/kawaii/BRAND.md` with the mascot, palette, props, and typography lock.
- [x] port `/agents` from the framer agency content to mimi content: hero, room cards, workflow rows, squad roster, final section, and footer.
- [x] replace remote framer media with existing mimi assets from `public/`.
- [x] add kawaii palette/sticker treatments while preserving the gsap smooth scroll, hero title motion, parallax, and hover-only card overlay mechanics.
- [x] add cute fonts: `Fredoka` for display/hero/section text and `Nunito` for nav/body labels.
- [x] remove uppercase transforms from `/agents` so the rounded lowercase typography comes through.
- [x] make `/` render the kawaiified agents page by re-exporting `./agents/page`.
- [x] verify `/agents` source returns `200` from the local dev server and contains the new mimi content.

### kawaiify verification notes

- `./node_modules/.bin/eslint src/app/agents/page.tsx --max-warnings=0` passed.
- `./node_modules/.bin/eslint src/app/page.tsx src/app/agents/page.tsx --max-warnings=0` passed after routing `/` to the agents page.
- `curl http://127.0.0.1:3000/agents` returned `200` and shows `mimi.`, `a 3d agent workspace...`, `notion sync`, and the local sprite/image paths.
- `curl http://127.0.0.1:3000/` returned `200` and now shows the same agents page content.
- full `bun run lint`, `bun run typecheck`, and production build are currently blocked by unrelated untracked landing files under `apps/landing/src/app/api/notion/`, `apps/landing/src/app/connected/`, and `apps/landing/src/lib/`.
- local server is running with `next dev` so `/agents` reflects the current source despite those unrelated production-check blockers.

## cuteness overloadmaxx pass

- [ ] replace the remaining framer-portfolio structure with a mascot-led mimi landing composition.
- [ ] make the hero feel like a sticker command center: wordmark asset, squad chips, stronger product promise, and cleaner mobile crop.
- [ ] add extra gsap delight: intro pop sequence, floating mascots, scroll reveals, hover bounce/tilt, and active squad/workflow motion.
- [ ] make work/squad sections read as mimi product workflows instead of portfolio cards.
- [ ] update css tokens/treatments for sticker shadows, cute panels, sparkles, cursor behavior, and mobile polish.
- [ ] run targeted lint/build checks and inspect the local page in headed chrome.

## web modular avatar system

- [x] read `docs/AVATAR-SYSTEM.md` end to end.
- [x] download one base humanoid model to `apps/web/public/models/base/mimi_base_v1.glb`.
- [x] add `apps/web/src/lib/agents.ts` with the spec's 5 config rows.
- [x] add `apps/web/src/components/AgentMesh.tsx` for cloned, tinted, animated agent instances.
- [x] replace `AgentBillboard` placeholders in `apps/web/src/scenes/Room.tsx` with `AgentMesh`.
- [x] run `tsc`/`vite build`, fix failures, and record evidence.
- [ ] commit and push the requested files.

### avatar system verification notes

- read all 231 lines of `docs/AVATAR-SYSTEM.md`.
- searched the zero-auth chibi options; used the explicit `Soldier.glb` fallback because mixamo/ready-player-me are auth-gated and quaternius cc0 packs are not a direct glb fit for tonight.
- `apps/web/public/models/base/mimi_base_v1.glb` is 2.1mb and exposes embedded clips: `Idle`, `Run`, `TPose`, `Walk`.
- skipped `apps/web/public/models/animations/mimi_animations.glb` per the fallback rule because the base has baked clips.
- `/Users/stephenhung/.bun/bin/bun run --cwd apps/web typecheck` passed.
- `/Users/stephenhung/.bun/bin/bun run --cwd apps/web build` passed; vite built 601 modules.
- `curl -I http://127.0.0.1:5173/` returned `200`; `curl -I http://127.0.0.1:5173/models/base/mimi_base_v1.glb` returned `200` with `Content-Type: model/gltf-binary`.
- headed Chrome loaded `http://127.0.0.1:5173/` and rendered the 3D room HUD/scene; headless Chrome screenshot did not render WebGL, so it is not used as visual evidence.

## realtime purge

- [x] delete the old realtime client hook, remote peer renderer, and token route.
- [x] remove realtime sdk dependencies from web, landing, runtime, and lockfile.
- [x] wire web to notion-backed `agent-poll`, shared stores, and static `AgentMesh` occupants.
- [x] rename team room metadata from provider-specific naming to `roomId`.
- [x] remove provider references from source comments, docs, and persona examples.
- [ ] run typecheck/build gates and push.

## livekit purge fallout audit

- [x] searched source, docs, package manifests, and lockfiles for stale livekit references.
- [x] removed remaining livekit references from `README.md` and reframed the runtime as notion-backed polling/state.
- [x] found and deleted `workers/.env-tmp/common`, which contained plaintext notion credentials.
- [x] added repo ignore coverage for nested `.env`, `.env.*`, and `.env-tmp/` files while preserving `.env.example`.
- [x] verified no obvious `ntn_...` token remains in searchable non-build files.
- [x] ran typecheck gates for `apps/landing`, `apps/web`, and `agents/runtime`.
- [ ] rotate the exposed notion credential that had been written to `workers/.env-tmp/common`.
- [ ] decide whether to implement real queued echo-chamber recursion or downgrade the docs/comments to the current one-fanout behavior.
