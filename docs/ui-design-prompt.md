# UI Design Prompt — Salon Queue

**What this is:** a prompt for Google Antigravity or OpenAI Codex that gives the app a distinctive look, a responsive system for phone, tablet and desktop, and exact button placement rules. It does not change any behaviour or rule.

**How to use it**
1. Put `AGENTS.md`, `docs/` and `public/brand/` in the repo first. Commit.
2. Paste the **Full prompt** below as its own task. Best moment: **after build step 1** (project setup) and **before step 3** (Home + Join), so every screen is built in the final look.
3. Short on time or tokens? Paste the **Compact prompt** at the end instead.
4. Approve the agent's plan before it builds, and look at its screenshots at each width.

**Heads-up:** `02-screens.md` defines phone, tablet and TV layouts. This prompt adds **desktop (1280 px and wider)** layouts that the docs don't have. Per `AGENTS.md`, docs change first, so merge section 7 of this prompt into `02-screens.md` (or ask me to).

---

## Full prompt (copy everything from here to the line "END OF PROMPT")

### 1. Your task

Design and build the **visual layer and responsive layout** of the Salon Queue app: design tokens, shared components, and the look of all seven screens, working on **phone (360–639 px), tablet (640–1279 px) and desktop (1280 px and wider)**, plus the TV screen at 1920 × 1080.

You are changing **how it looks and where things sit**, not **what it does**. Do not change behaviour, rules, data, routes, copy meaning, or the Don't-build list. If a design idea needs a behaviour change, stop and ask.

### 2. Read first, and precedence

Read `AGENTS.md`, `docs/01-brief.md`, `docs/02-screens.md`, `docs/03-flows-rules.md` and the files in `public/brand/`.
- Behaviour and numbers: `docs/03-flows-rules.md` wins.
- Content, states and wording: `docs/02-screens.md` wins.
- This prompt wins on **look, motion, spacing, and layout at each screen width**, including the desktop layouts, which `02-screens.md` doesn't cover.
- Keep **charcoal `#1F2937` and gold `#D4A017` exactly**. Every other colour in this prompt is a refinement around them.

### 3. The design idea

**A barbershop ticket counter after dark.** Warm, tactile, confident. Think: old barbershop signage, a train-station departure board, cinema ticket stubs, a deli number machine. The queue **token is a physical ticket**, and numbers are the heroes of every screen.

It must **not** look like a generic AI-generated SaaS site. Customers should feel they're holding a numbered ticket, not browsing a dashboard.

### 4. Avoid the "AI website" look (hard rules)

Do **not** use any of these:
- Purple, indigo or blue-to-pink gradients; gradient text; glowing shadows.
- Glassmorphism, frosted blur panels, or neon outlines.
- A centred hero with a headline and two buttons; a row of three identical feature cards with icons.
- Emoji as icons (the only emoji allowed is the one in the browser tab title for the "your turn" alert). Use SVG icons.
- The default Tailwind palette, `Inter`, `Roboto`, `Poppins`, or the combination "rounded-2xl + shadow-lg + white card".
- Stock photos, generic 3D blobs, or people illustrations.
- The same radius, shadow and padding on every element; a screen where everything is a centred card of equal weight.
- Placeholder text ("Lorem ipsum", "Welcome to our platform").

Do this instead: **asymmetric, left-aligned compositions; one oversized number per screen; strong hierarchy; real content from the docs.**

### 5. Visual language

**5.1 Colour** (extend the docs' tokens, keep `charcoal` and `gold` exact)

| Token | Value | Use |
|---|---|---|
| `ink` | `#111827` | Deepest background (TV, sheets, behind tickets) |
| `charcoal` | `#1F2937` | Page background |
| `surface` / `surface-raised` | `#374151` / `#4B5563` | Cards, borders (as in docs) |
| `gold` | `#D4A017` | Primary actions, tokens, highlights |
| `gold-soft` | `#E8C766` | Hover/pressed highlights, thin accents on dark |
| `gold-deep` | `#8A6508` | Gold text on light backgrounds only |
| `ivory` | `#F6F1E7` | Main text and "paper" tones (warmer than pure white) |
| `muted` | `#9CA3AF` | Secondary text |
| `success`, `danger`, `amber` | as in docs | States only |

Use gold sparingly: it should mean "this matters / act here". At most one gold fill per view.

**5.2 Typography** (roles matter more than exact fonts; substitute only if loading fails)

| Role | Font | Rules |
|---|---|---|
| Display (salon name, headings) | **Cardo** Bold (matches the logo); Gujarati: **Noto Serif Gujarati** | Sentence case; never all-caps for Gujarati |
| Numerals (tokens, positions, timers, prices, TV) | **Barlow Condensed** SemiBold, tabular figures | Biggest element on screen; `font-variant-numeric: tabular-nums` |
| Body and UI | **DM Sans**; Gujarati: **Hind Vadodara** or Noto Sans Gujarati | 16 px minimum body; inputs 16 px or larger (prevents iOS zoom) |

- Maximum 3 families, 4 weights in total, subset to Latin + Gujarati, `font-display: swap`, preload the display and numeral fonts.
- Gujarati text: line-height at least 1.55, 1 px larger than the English equivalent, never letter-spaced.
- Fluid type with `clamp()`; the numeral scale: phone token 72 px, tablet 96 px, desktop 120 px, TV 160 px+.

**5.3 Shape language**
- **The Ticket:** the signature shape. Rounded corners (6 px) with **semicircular notches** cut into the sides at the perforation line, and a dotted perforation line separating a main area from a stub. Built with CSS masks or inline SVG (no images).
- Cards: 16 px radius, 1 px `surface-raised` border, a subtle inner top highlight, soft warm shadow (low opacity). Buttons 12 px. Chips fully rounded.
- Deliberate variety: tickets are crisp and small-radius, cards soft, chips round. Not everything is a rounded rectangle.

**5.4 Texture and ornament**
- Page background: charcoal with a **very faint paper grain** (about 3–4% opacity) made from a tiny inline SVG noise (under 2 KB), plus a faint warm vignette. No photos.
- **Barber-pole stripe:** a thin diagonal stripe pattern (gold / ivory / charcoal, 6 px tall), used **at most once per screen** (for example the top edge of the Reception bar, the loading/refresh indicator, the frame of the "your turn" takeover). Slow drift animation only when motion is allowed.
- **Ticket barcode:** a decorative strip of vertical bars on the ticket stub (CSS gradient), `aria-hidden`.

**5.5 Signature components**
1. **TokenTicket:** main area with the token ("S-14") in the numeral font, in gold on charcoal; stub with the position ("4th") and the barcode strip. Used on My Status (large), Reception rows (compact) and the TV (huge, no stub).
2. **SplitFlap numerals:** when a token or position changes, characters flip like a departure board (CSS 3D, 220 ms per character, 40 ms stagger). Used on My Status, the TV "Now serving" and "Up next". Under "reduce motion": instant swap with a brief static gold underline.
3. **EstimateRing:** the countdown ring from `02-screens.md`, drawn as a **clock-face with fine tick marks** instead of a plain progress arc; gold arc, numerals in the centre.
4. **BarberCard:** avatar with gold ring, a state chip (dot + word), and a thin **progress rail** for time left. Busy cards look "lit", Free cards look calm, On break cards look dim.
5. **Chip, Toast, Dialog / BottomSheet, Skeleton, EmptyState, LiveDot, LanguageToggle, TopBar** as in `02-screens.md` section 1.3.
6. **Empty states** use a small custom **line illustration of an empty barber chair** (inline SVG, 1.75 px stroke, gold on charcoal) plus the friendly line from the docs.

**5.6 Icons:** one consistent set, 1.75 px stroke, rounded caps, 24 px grid (an open-source set is fine). Add three custom inline SVGs: scissors, comb, barber chair. Never rely on an icon alone; add text.

**5.7 Motion** (purposeful, 150–250 ms, ease-out; never decorative loops except where stated)
- Press feedback within 80 ms: scale to 0.97 and a colour shift.
- Changed numbers split-flap; changed rows get a 1.5 s gold highlight; new rows slide in 8 px.
- "It's your turn!" takeover: gold fills from the bottom up in 350 ms, text pulses gently every 1.6 s, pole-stripe frame.
- TV call banner slides down, the barber's row pulses.
- No parallax, no scroll-jacking, no auto-playing background motion.
- **Everything above degrades to static states when `prefers-reduced-motion` is on.**

**5.8 Sound and haptics:** only the TV chime and the phone vibration already in the docs. No other sounds.

### 6. Responsive system

| Name | Width | Typical device | Notes |
|---|---|---|---|
| `phone` | 360–639 px | Customer, barber, owner | One column; bottom action bar; 16 px side padding |
| `tablet` | 640–1279 px | Reception tablet (design target 1280 × 800 landscape and 1024 × 768), tablets for owner/barber | Two panes; 24 px padding; touch targets 56 px |
| `desktop` | 1280 px and wider | Owner or reception on a PC, customers on a laptop | Three-region layouts; 32 px padding; keyboard and hover enhance, never required |
| `tv` | 1920 × 1080 (scales with the viewport) | Waiting-room TV | Built on a 1920 × 1080 grid and scaled using viewport units so it also works at 1366 × 768 |

- Mobile-first CSS. Layouts are **recomposed** per breakpoint (panels move and regroup), not just stretched.
- Content widths: customer screens max 480 px on phone; up to 1120 px on tablet/desktop. Staff screens use the full width up to 1600 px.
- Spacing on a 4 px grid; section spacing 24 / 32 / 48 px by breakpoint.
- Use `dvh` and safe-area insets so sticky bars never hide behind browser toolbars, notches, or the on-screen keyboard.
- No horizontal scrolling at any width from 320 px to 1920 px. Test 320 px as a stress case.

### 7. Layout and button placement

**Global rules for buttons and controls**
1. **One primary action per view**, gold-filled. Secondary = gold outline. Tertiary = text button. Destructive = red outline (never gold, never filled until confirmed).
2. **Phone:** primary actions sit in the **bottom 40% of the screen (thumb zone)**, inside a sticky bottom bar with safe-area padding. Back is top-left. The **language toggle is always top-right, same size, same place on every screen**; **[Lock]** sits beside it on staff screens.
3. **Never place a destructive button within 16 px of a primary button.** Separate them by space or put destructive actions in another region (end of content).
4. **Dialogs:** on tablet/desktop, safe action on the **left**, risky on the **right**. On phone, a **bottom sheet** with full-width stacked buttons: safe action on top (gold), risky below (red outline).
5. **Button sizes:** phone 48 px tall (barber Start/Done 72 px), tablet 56 px, desktop 44 px. Touch hit areas are at least 44 × 44 px at every size, even if the visual is smaller.
6. **Disabled buttons stay visible** (40% opacity) with the **reason text directly beneath** (as in the docs). A loading button keeps its width and replaces the label with a spinner (no layout shift).
7. **Toggles:** label left, switch right, the whole row is tappable.
8. Button order in a row is always `[secondary] [primary]`, primary on the right.
9. Hover is an enhancement on desktop only; nothing depends on hover or right-click.

**Per screen and breakpoint**

| Screen | Phone | Tablet | Desktop |
|---|---|---|---|
| **1 Home** | Live board first (big numbers), barber chips, then the active-spot card. **[Join Queue] fixed in the bottom bar** | Two columns: left the live board (large numerals), right a Join panel with [Join Queue] at the panel's bottom | Asymmetric 7 / 5 split: giant live numbers on the left; on the right a Join card **plus a QR code with "Prefer your phone? Scan to join"** |
| **2 Join** | Single column; **sticky bottom bar** holds the two summary lines and a full-width **[Confirm]** | Two columns: form on the left, a **sticky summary card on the right with [Confirm] at its bottom**. Back top-left | Same as tablet inside a 1120 px container; the summary card sticks below the top bar |
| **3 My Status** | Ticket and ring first. Details below. **[Cancel my spot] is last**, outlined, at least 24 px from anything tappable. Takeover is full-screen | Two columns: left a sticky Ticket + Ring, right the stepper, details and [Cancel my spot] at the bottom of the right column | Same as tablet, ticket larger (120 px numerals). Takeover is still full-screen |
| **4 Reception** | Two tabs **Barbers \| Queue**. **[+ Add walk-in] as a floating button, bottom-right** (thumb zone). [Call next] is the bottom button of each barber card | **40 / 60 panes** as in the docs. **[+ Add walk-in] top-right** of the bar, always visible. [Call next] at the bottom of each barber card. Row actions right-aligned, [No-show] and [Cancel] at least 16 px apart and styled differently | **Three regions:** barbers (left) · queue (centre) · "Finished today" and the summary tiles (right rail). Keyboard: **N** opens Add walk-in, **/** focuses search, **Esc** closes dialogs. No keyboard shortcut ever calls or cancels a customer |
| **5 Barber** | Current-customer card on top; the **huge Start / Done button in the lower third** (easiest thumb reach); "Next for you" above the break toggle; break toggle at the very bottom | Two columns: left current customer + the big action button, right "Next for you", break toggle, served counter | Same as tablet in a centred 960 px container |
| **6 TV** | n/a. If opened in portrait, show "Rotate your screen" | Scaled 16:9 layout | Scaled 16:9 layout; no controls, no scrolling, cursor hidden after 3 s |
| **7 Owner** | Stacked cards. **A sticky bottom bar with [Save] and [Discard] appears only when a form is changed.** Toggles right-aligned in rows | Two columns of cards. [Save] at the bottom-right of each card | **Left sticky section menu** (Overview, Queue, Services, Barbers, Insights) and content up to 960 px. The **Online joining Open / Closed status is a pill in the top bar**, always visible. [Save] bottom-right of each card |

### 8. UX behaviour

- **Glanceable:** the answer to the user's one question (see the brief) is the largest thing on the screen, readable in two seconds.
- **State is never ambiguous:** every status uses colour **and** icon **and** word.
- **Skeletons** in the exact shape of the final layout; **no blank screens, no layout jumps** when data arrives.
- **Forms:** labels above fields (not placeholder-only), errors in plain words directly under the field, the right keyboard (`inputmode="numeric"` and `autocomplete` for phone and name), the sticky bar never covers the focused field or the keyboard.
- **Honest feedback:** after a tap, show a pending state until the server confirms; never show a result that the rules haven't allowed.
- **Live changes:** a gold flash on what changed; a Live dot with a "last updated" time; the connection banner from the docs.
- **Confirm only what is irreversible** (Cancel, No-show, Done), exactly as the docs say. Don't add extra confirmations.
- **Tone of voice:** short, warm, plain. Follow the strings in `02-screens.md`; do not invent marketing copy.
- **Language:** the toggle works instantly; layouts must not break with Gujarati (wrap, grow vertically, never clip).
- **Branding in the UI:** top bar = the **logo mark** (28 px phone, 36 px larger) plus the **salon name as live text from settings** in the display font (the owner can change it, so don't use the outlined wordmark there). Use the full **lockup** only where the name is fixed: the PIN screen, the README, social preview.

### 9. Accessibility and performance

- Text contrast at least 4.5:1 (large text 3:1); visible 3 px gold focus ring with an offset on every control; full keyboard use on desktop.
- Status changes announced politely to screen readers; the full-screen takeover announced assertively.
- Usable at 200% text size; `prefers-reduced-motion` respected everywhere.
- Performance targets: public screens (Home, Join, Status, TV) load fast on a mid-range phone on mobile data: initial JavaScript at most about 200 KB gzipped, staff screens and any chart library **loaded lazily by route**, fonts subset, no raster images except optional barber photos, logo and icons as inline SVG.

### 10. Brand assets (already in `public/brand/`)

The brand is **LateCuts** ("LateCuts Live Queue"). The wordmark is "Late" in ivory and "Cuts" in gold, set in Cardo Bold. Where the UI shows the salon name as live text, use the same Cardo display style.

`logo.svg` (lockup for dark backgrounds), `logo-on-light.svg`, `logo-mark.svg` (transparent), `logo-icon.svg` and PNGs `favicon-32.png`, `apple-touch-icon-180.png`, `logo-icon-192.png`, `logo-icon-512.png`. Wire up the favicon, the Apple touch icon and the web-app icons. Do not redraw or recolour the logo. The mark is a gold ticket stub with scissors: echo its notches in the ticket components.

### 11. How to work

1. **Plan first. Write no code yet.** Reply with: the final token table (colours, type scale, spacing, radii, shadows, motion durations), the font setup, the component inventory, an ASCII sketch of each screen at phone, tablet and desktop, and any place where this prompt conflicts with the docs. **Wait for my OK.**
2. **Foundation:** theme tokens in one place, fonts, and the shared components from 5.5, plus a **dev-only `/_styleguide` page** showing every component at 360, 768 and 1280 px in English and Gujarati. It must be **excluded from the production build**.
3. **Screens, one per task**, in the order of `AGENTS.md`. Apply the look and the layouts from section 7. Do not change behaviour.
4. After each task: attach screenshots at **360 × 800, 768 × 1024 and 1280 × 800** (the TV also at 1920 × 1080), each in English and Gujarati; list changed files; say how to test by hand; note anything you couldn't do.
5. Before finishing, run the visual QA below and report each item as pass or fail.

### 12. Visual QA checklist

- [ ] No horizontal scrolling from 320 to 1920 px; nothing clipped in Gujarati.
- [ ] Every screen has loading, empty, error and connection-lost states in the new look.
- [ ] Exactly one primary (gold-filled) action per view; destructive buttons are never next to it.
- [ ] Phone primary actions are inside the bottom 40% and clear of the browser bar and the keyboard.
- [ ] Language toggle is in the same top-right place on every screen.
- [ ] Token numerals are the largest element on Status, Reception rows, TV.
- [ ] With "reduce motion" on, nothing flips, pulses or slides.
- [ ] Contrast and focus rings pass; whole app usable by keyboard on desktop.
- [ ] None of the "avoid" items in section 4 appear.
- [ ] Production build contains no `/_styleguide`.

## END OF PROMPT

---

## Compact prompt (if you are short on time)

```
Read AGENTS.md, docs/ and public/brand/. Restyle the Salon Queue app and make it responsive for phone (360-639px), tablet (640-1279px), desktop (1280px+) and the TV (1920x1080). Change look and layout only, never behaviour or rules. Keep charcoal #1F2937 and gold #D4A017 exactly.

Concept: a barbershop ticket counter after dark. The queue token is a physical ticket (small-radius shape with side notches, a dotted perforation, a barcode stub). Numbers are the heroes: Barlow Condensed numerals, Cardo headings, DM Sans body (Gujarati: Noto Serif Gujarati / Hind Vadodara). Warm ivory text #F6F1E7, faint paper grain, one thin barber-pole stripe per screen at most, split-flap flips for changing numbers, a clock-face estimate ring, empty states with a line-art barber chair.

Avoid the generic AI look: no purple/blue gradients, no glassmorphism, no emoji icons, no centred hero with two buttons, no three-identical-feature-cards, no Inter/Roboto/default Tailwind blues, no stock photos, no equal rounded cards everywhere.

Button rules: one gold-filled primary per view; on phone it lives in a sticky bottom bar in the thumb zone with safe-area padding; destructive buttons (red outline) are never within 16px of the primary; language toggle always top-right; dialogs: safe left / risky right (phone: bottom sheet, safe on top); targets 48px phone (barber Start/Done 72px), 56px tablet, 44px desktop; disabled buttons show the reason underneath. Reception: Add walk-in top-right on tablet, floating bottom-right on phone; Call next at the bottom of each barber card; desktop is three regions (barbers | queue | finished today). Join and Status become two columns from 640px, with a sticky summary card on the right. Owner: sticky Save bar on phone, left section menu on desktop.

Respect prefers-reduced-motion, contrast 4.5:1, 3px gold focus ring, 200% text zoom, Gujarati wrapping. Use the logo files in public/brand for favicon and top bar (mark + salon name as live text).

First reply with a plan (tokens, components, ASCII sketches per breakpoint) and wait for my OK. Then build tokens + shared components + a dev-only /_styleguide, then restyle one screen per task, attaching screenshots at 360x800, 768x1024 and 1280x800 in English and Gujarati.
```
