# agents.framer.website reverse engineering plan

- [ ] capture reference evidence from `https://agents.framer.website/`: screenshots, dom text, computed layout, fonts, colors, image urls, and motion behavior.
- [ ] scaffold `apps/landing` as a next.js + tailwind css app.
- [ ] implement the page at high visual fidelity: spacing, layout, typography, images, footer, and responsive behavior.
- [ ] port observed motion into gsap using react-safe setup and cleanup.
- [ ] verify locally with build/lint plus browser screenshots against the reference.
- [ ] document final evidence and remaining fidelity gaps here.

## resume 019e3374-755b-7a93-bc04-327ce57c3385

- [x] add `/Users/stephenhung/Documents/GitHub/mimi/.claude/settings.json` with a project permission allowlist.
- [ ] run the landing production build from `apps/landing`.
- [ ] start `next start` from the fresh production build and verify the landing page returns `200`.
- [ ] inspect the served page enough to confirm the gsap/vendor chunk issue is gone.
- [ ] record verification results here.
