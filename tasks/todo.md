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
