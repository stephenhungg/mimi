# mimi. — Kawaii Brand Lock

This is the visual ground truth. Every asset reuses these specs. No new mascots, no new palette per asset.

## Mascot

**The Golden Retriever** is mimi.'s identity character. Standing chibi proportions, warm leader expression, wearing a small navy bowtie. Soft golden fur, big round eyes. The retriever appears in:
- The wordmark (face nestled inside the letter "m")
- The CTA button (face on the left)
- The app icon (head centered)
- The hero (at the workstation, standing)
- Anywhere the brand needs a face

The other agent species (tiger, otter, bunny, giraffe) are supporting cast — they appear in the workspace but the dog/retriever is the brand mark.

## Palette (locked hexes — ASPHALT + PAPER)

```
paper:       #EFEDE3   (warm off-white, cream undertone — page surface)
cloud:       #F7F5EE   (lighter paper variant for cards)
soft:        #E5E2D5   (subtle warm gray surface, hover background)
hairline:    #D6D2C3   (soft warm border line)
muted:       #6B665C   (readable warm-gray body text)
ink:         #302F2C   (asphalt — warm near-black, olive undertone, all outlines and headings)
accent-100:  #E5E2D5   (very pale warm gray)
accent-300:  #8F8B7E   (mid warm gray)
accent-500:  #302F2C   (primary "accent" — asphalt)
accent-700:  #1F1E1B   (deeper asphalt for shadow offsets)
shadow:      #302F2C   (asphalt offset shadow)
```

The brand sits on warm paper, drawn in asphalt ink. Both colors have undertone — paper has cream warmth, asphalt has olive depth. Never pure white, never pure black. This warmth is what makes the kawaii chibis feel right when drawn in monochrome.

Roles:
- backgrounds → paper (off-white)
- cards / surfaces → cloud (pure white) with hairline border
- borders / outlines on chibis → ink (thick 3-4px black)
- primary CTA → black pill with white text and black shadow offset (chunky)
- text body → muted; headings → ink
- hover/active states → soft (#F2F2F2) fill
- accent color on chibis is INTERNAL ONLY — each species can have its own subtle internal color (the tiger's orange fur, the otter's blue tint) but the brand frame, wordmark, and ui are monochrome

**Brand reads**: linear / vercel / arc browser — serious infrastructure with personality. Mimi. is not a cute toy. Mimi. is a real product made by people with taste.

## Line + Shadow Treatment

- All chibis and brand marks have **thick black outlines** (ink, ~3-4px equivalent at hero size)
- Sticker keyline = thick **white** border (cloud) wrapping the full chibi or wordmark, ~6-8px equivalent
- Offset drop shadow = hard, no blur, ~6-8px offset down-right, accent-700 for pink elements, shadow for neutral elements
- No gradients, no glow, no glassmorphism. Flat shading with one soft blush highlight on chibis.

## Props (mimi.'s prop vocabulary)

Reuse these as small accents across compositions:
- ⭐ small sparkles (4-point or 6-point)
- ✉️ tiny envelope (otter's domain)
- 💻 laptop / code monitor (tiger's domain)
- 📅 calendar / clock (bunny's domain)
- 🎙 microphone / notebook (giraffe's domain)
- 🦴 small bone or bowtie (mimi./dog's domain)
- 🌱 small house plant (cozy office decor)
- ☁️ thought puff bubbles (dialogue)
- ❤️ pixel heart (use sparingly, as period in "mimi.")

## Typography Direction

- Wordmark "mimi." = chunky rounded bubble letters, hand-drawn feel, accent-500 fill with cloud (white) keyline and shadow offset. Period as a pixel heart or small dot in accent-500.
- Display (hero, headings) = friendly rounded sans-serif, ink color. Recommend Nunito 800 or similar.
- Body = same family, lighter weight, muted color.
- UI in 3D world / pixel sprites = "Press Start 2P" for trainer card / retro game UI.

## Agent Identity (the supporting cast)

Each agent is a different chibi animal in the same rendering style as the dog mascot. They are NOT brand marks. They are characters living inside the product.

| Species | Domain | Voice cluster | Color accent |
|---|---|---|---|
| 🐯 Tiger | github | dry/technical | orange + black stripes |
| 🦦 Otter | email/gmail | warm/social | sky blue + cream |
| 🐰 Bunny | calendar | chipper/punctual | cream + pink |
| 🦒 Giraffe | meeting notes | thoughtful | mustard + brown |
| 🐕 Dog | oversight (mimi.) | warm/leader | golden + navy bowtie |

All five share: thick black outlines, soft pastel fills, round chibi proportions, big eyes with small white highlight, soft blush cheeks.

## Asset Family (what we need)

Required:
- `wordmark.png` + `wordmark-t.png` (transparent)
- `app-icon.png` (1:1, retriever head centered, sticker border)
- `favicon.png` (32x32, simplified retriever head)
- `og-image.png` (1200x630, hero scene)
- `hero-scene.png` (cozy office with all 5 agents)
- 5 agent portraits — full body chibis, transparent
- 5 agent "working" poses — keyboard slam variants
- 5 agent "down" puddle states — color-matched to species
- agent profile card frames — one per species (orange tiger, blue otter, pink bunny, mustard giraffe, gold dog)
- CTA button assets — pink rounded pill with retriever face

Existing in `design/generated/`:
- ✅ wordmark-mimi.png
- ✅ landing-hero-kawaii.png
- ✅ cta-pill-button.png
- ✅ office-room-iso.png
- ✅ tiger-agent.png, otter-agent.png, bunny-agent.png, giraffe-agent.png, dog-mimi.png
- ✅ tiger-down-puddle.png
- ✅ agent-card-tiger.png

Missing (next batch priorities):
- Down/puddle for otter, bunny, giraffe, dog
- Working/keyboard-slam pose for all 5
- App icon (1:1, retriever head)
- Favicon
- OG image
- Agent card frames for the other 4 species
- Human chibi base (the player character — keep simple, customizable)

## Rules

- Every generated asset gets `wordmark-mimi.png` OR `dog-mimi.png` attached as a reference image so the model anchors on the locked mascot identity.
- No new palette ever — accent-500 only, no rogue purples or yellows.
- No photorealism. No anime. Always chibi proportions + thick outlines.
- Avoid sterile minimalism — the brand has warmth.
- Never overcrowded — generous whitespace is the rule.
- If a generation drifts, throw it out and re-prompt with the brand lock attached.
