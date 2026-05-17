# notion page setup — the dashboard surface

> how to wire the notion workspace page so it IS the mimi. layer A dashboard. one-time setup before demo.

## prerequisites

- `bun run provision:notion` completed — the 5 dbs exist
- `bun run seed:demo` ran — dbs have lived-in data
- `mimi-thumbnail-render` worker deployed — get its public URL

## the page

create a new page in your notion workspace titled **`mimi. — workspace`**. set the page icon to 🐕. set the cover to `design/generated/landing-hero-asphalt.png` (upload as page cover).

### content (top → bottom)

1. **page title block** — h1 with the wordmark image inline. drag `design/generated/wordmark-mimi-asphalt.png` to the page header area.

2. **callout block** (gray bg, dog emoji)
   > the room where your team's agents live, watch the outside world, and coordinate. notion is the ground truth. click in to walk around.

3. **embedded thumbnail** — an *image block* with the worker URL as source:
   ```
   https://mimi-thumbnail-render.<your-subdomain>.workers.dev/thumbnail
   ```
   notion fetches the image and renders it. it refreshes when the page is reloaded — and the worker sets `cache-control: max-age=5` so a manual refresh always pulls fresh state. (notion's image block doesn't auto-poll, so it's pull-on-view, not push-live. for the demo, we pre-load it.)

4. **button block** with link to apps/web:
   - label: `enter the room →`
   - url: `https://mimi-web.vercel.app` (or `http://localhost:5173` in dev)

5. **inline db view: residents** — `/Link to view` → select `mimi. residents` db, view = gallery, card preview = Identity. shows the squad.

6. **inline db view: events** — `/Link to view` → `mimi. events`, view = list, sort by `Timestamp desc`, limit 10. the live event feed.

7. **inline db view: artifacts** — `/Link to view` → `mimi. artifacts`, view = gallery, card cover = none, card preview = Title + Kind. PR drafts, decisions, etc.

8. **divider**

9. **toggle block** — "**how this works**" — paste the ARCHITECTURE.md tl;dr inside.

## visual check (before demo)

- thumbnail loads + shows all 5 agents at their themed corners
- events db has ≥5 rows from `seed:demo`
- artifacts db has ≥1 row
- residents db has 3 humans + 5 agents
- "enter the room" button works → 3D client loads

## share

right-side `Share` panel → **publish to web** (read-only) OR add the team as collaborators. for the hackathon demo, publish-to-web is fastest — judges can scroll without notion auth.

copy the published URL. that's the link in the submission form.

## why this matters

per PROJECT.md, the killshot is *the demo page IS a notion page*. judges scroll notion and the product is right there. they don't have to open another app first.
