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

- [ ] restore hover-only work-card inset media.
- [ ] add gsap smooth scrolling with `ScrollSmoother`.
- [ ] audit reference motion deeper through load, scroll, card hover, service activation, client hover, and footer.
- [ ] tune local gsap against headed chrome samples.
- [ ] rebuild, verify, and record evidence.
