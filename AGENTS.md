# AGENTS.md — Salon Queue Management

Web app for a salon with several barbers: customers join a live queue from their phone (no login), see position and wait time and get alerted; reception runs the queue; barbers tap Start/Done; a TV shows who is next; the owner manages settings. English and Gujarati throughout.

## 1. Read first (before every task)

| File | Gives you | Wins on |
|---|---|---|
| `docs/01-brief.md` | Why, users, feature tiers (P0/P1/P2), **Don't-build list** | Scope |
| `docs/02-screens.md` | Every screen: layout, buttons, states, theme, language strings | Layout and wording |
| `docs/03-flows-rules.md` | Statuses, queue rules, wait formula, constants, test checklist | Behaviour and numbers |

- If the docs disagree or are silent, **stop and ask**. Never guess, and never invent a feature, rule or screen.
- If you think a doc is wrong, say so and propose the edit. **Docs change first, code second.** Do not quietly deviate.

## 2. What to build, and what not to

- **Build P0 (C1–C8) only**, unless the task names an upgrade. P1 upgrades are **U1** barber skills, **U2** learned wait time, **U3** "I'm on my way", **U4** owner insights. P2 items are X1–X3. Blocks tagged **[P1 · U#]** in the docs are ignored until that upgrade is requested. P0 must work perfectly without them.
- **Never build anything on the Don't-build list** (`01-brief.md`, section 8): payments, appointments, SMS/WhatsApp/email/push, loyalty/reviews, multiple branches, customer accounts, changing a waiting customer's barber, AI/ML features.

## 3. Stack and commands

- **React + Vite + Tailwind CSS**, TypeScript preferred. A router for the seven routes. Only these extra dependencies without asking: a QR-code library, an icon set, a chart library (U4 only). **Ask before adding anything else.**
- Fonts: Noto Sans plus Noto Sans Gujarati (Gujarati must render correctly everywhere).
- Commands that must exist and work:

| Command | Does |
|---|---|
| `npm run dev` | Run locally |
| `npm run build` | Production build, no errors or warnings that matter |
| `npm test` | Unit tests for the rules module |
| `npm run seed` | **Dev-only** demo data: 3 barbers, 5 services, 8 dummy customers (see `01-brief.md`, section 10). Not a screen in the app |

- Suggested structure (adapt, but keep these separations):
  - `src/rules/` — **the one rules module** (pure functions + tests)
  - `src/i18n/` — `en` and `gu` language files
  - `src/theme/` — design tokens from `02-screens.md`, section 1.1
  - `src/screens/`, `src/components/` (shared components from `02-screens.md`, section 1.3)
  - `server/` or the hosted-backend code, if there is one

## 4. Data, sync and storage

- **Choose the simplest storage that meets all of these, then explain your choice in 3 lines and wait for approval before using it:**
  1. Phone, tablet and TV on different devices stay in sync within **5 seconds**.
  2. The **server is the only judge** of moves; validation and rules run there, not only in the browser.
  3. Moves are **atomic** (no double-calling, no duplicate phone spots).
  4. Data **survives a server restart** and redeploy.
  5. Fits a free tier.
- **Do not** use `localStorage`/browser storage as the shared store (devices wouldn't sync), and do not rely on server memory alone. Watch free-tier traps: a file database on a host with an ephemeral disk loses data on restart; free servers can sleep, so the first request may be slow (show skeletons, never a blank screen).
- Use **server time** (India, Asia/Kolkata) for every timestamp and duration, through one time helper.

## 5. Working rules

1. **One screen or one feature per task.** Don't touch other screens. If a fix needs another screen changed, say so and ask.
2. **Queue rules live in ONE module** (`src/rules/`), with the constants from `docs/03-flows-rules.md` section 2. Every screen and the server import it. **Never copy a rule into a component.** The module is pure (no screen, no database inside) so it can be tested.
3. **Write the tests first for the rules:** examples E1–E9 (wait estimates), the Call-next scenarios 1–4 (and 7–8 for upgrades), validation, and the move table. `npm test` must pass before moving on.
4. **All visible text comes from the language files.** No hard-coded strings anywhere, including toasts, errors and empty states. Start from the strings in `02-screens.md` section 4. Gujarati text must wrap, never overflow.
5. **Theme tokens in one place** (`#1F2937` charcoal, `#D4A017` gold, and the rest of `02-screens.md` 1.1). No colour values scattered in components.
6. **Mobile-first.** Phone tap targets at least 44 px (barber buttons 72 px). Tablet and TV have their own layouts. Respect "reduce motion".
7. **Every screen needs all its states** from `02-screens.md`: loading skeleton, empty, error, connection lost. **Never a blank or white screen.**
8. **Status moves exactly as the table** in `03-flows-rules.md` section 4. The server refuses anything else, whatever the screen sends.
9. **Security basics:** the staff PIN is checked on the server and read from the environment variable `STAFF_PIN` (never in the code or the browser bundle). Staff actions need a staff session. Public screens get only the data in the visibility table (`03` section 14): **the TV and Home never receive names or phone numbers**, and a customer can only reach their own spot. No personal data in URLs, logs or error messages. Keep `.env` out of git and commit a `.env.example` with placeholders.
10. **Keep changes small and reviewable.** Don't refactor unrelated code. Don't remove a feature while fixing another. No dead code, `TODO` placeholders or lorem ipsum in what you hand over.

## 6. Environment variables

| Variable | Purpose |
|---|---|
| `STAFF_PIN` | The shared 4-digit staff PIN |
| `NO_SHOW_AFTER_MINUTES` | **Development only** override of the 10-minute no-show wait (set 0 or 1 to test) |
| `DEMO_MODE` | `true` on the **deployed demo** so a marker can use it any day or hour: the 30-minute closing cutoff is not applied and the nightly reset leaves the Online joining switch as it was. Everything else behaves exactly as documented. A small "Demo" tag shows on the Owner screen. See `03` section 12 |
| Storage keys | Whatever the approved storage needs |

## 7. Build order (one step per task; run, test by hand, then commit)

Each step: show a short plan and the files you'll create, wait for approval, then build. Stop when the step's "done when" is true.

| Step | Build | Docs | Done when |
|---|---|---|---|
| **0** | Read `AGENTS.md` and all of `docs/`. Summarise the app in 8 bullets and list every question. **No code.** | all | The questions are answered |
| **1** | Project setup: Vite, Tailwind, router, theme tokens, EN/GU language files with the toggle, empty pages for all 7 routes, **the rules module with its tests** | 02 §1; 03 §2–8 | `npm run dev` and `npm test` pass; toggle switches labels |
| **2** | Storage and sync approach (explain, wait for approval), data layer, `npm run seed` | 03 §3, §15 | Two browser windows show the same data within 5 s |
| **3** | Screen 1 Home + Screen 2 Join, with all disabled states and validation | 02 Screens 1–2; 03 §5 | Join creates a spot; duplicate phone shows the existing spot |
| **First deploy** (right after step 3, not on the last night) | Deploy; send the live link | §9 below | The live link works on a phone |
| **4** | Screen 3 My Status, including the full-screen "It's your turn!" takeover and cancel | 02 Screen 3; 03 §6–9 | Banners appear at positions 2 and 1; takeover within 5 s of a call |
| **5** | Staff PIN gate, then Screen 4 Reception (barber cards, queue, Add walk-in, No-show, Cancel, Finished today) | 02 §1.6, Screen 4; 03 §7, §9, §14 | Scenarios 1–4 give the stated results |
| **6** | Screen 5 Barber View + Screen 6 TV (call banner, chime, QR, sound prompt) | 02 Screens 5–6; 03 §10 | Start/Done reach Reception, TV and the phone within 5 s |
| **7** | Screen 7 Owner Settings and stats | 02 Screen 7; 03 §13 | Settings changes show on other screens; stats match the checklist |
| **8** | Edge cases and polish: empty states, connection-lost behaviour, day reset, Gujarati on every screen, tap targets, reduced motion | 02 §5; 03 §12, §17 | No overflow in Gujarati; banner appears when offline |
| **9** | **Verify:** go through the whole checklist in `03` section 19 (P0 only) | 03 §19 | Every item is pass, or listed as a fix |
| **10** | Final deploy, `DEMO_MODE` on, README as in §9 | §9 | A fresh phone opens the live link and can join |
| **P1** | **Only when asked, one upgrade per task**, in this order: U1 → U3 → U2 → U4. Each ends with its own checklist items | 01 §6; 02 and 03 tagged blocks | Its checklist items pass and P0 still passes |

## 8. After every task

1. List the **files you changed** (and why, in a line each).
2. Give the exact **steps to test by hand** and the expected result.
3. Say what you were **unsure about** or what a doc doesn't cover.
4. Run `npm test` and `npm run build` and report the result.
5. Suggest a **git commit message** (e.g. `step 3: home and join`). Don't push unless asked.

When asked to **verify**: go through the checklist item by item and report **pass or fail and how you checked it**. Fix failures **without changing the design**. If a failure comes from a doc problem, say so instead of working around it.

## 9. Deployment and README

- Frontend on **Vercel**; if a backend is needed, **Render** or **Railway**. Single-page-app routes such as `/reception` and `/status/abc` must **not 404 on refresh** (configure the fallback). No `localhost` URLs in deployed code. Set environment variables in the host, not in the repo. Configure CORS for the real domain only.
- `README.md` must start exactly like this (the live link is the **first line after the title**):

```
# Salon Queue Management System

**Live demo:** <url>

**Hosted on:** Vercel (frontend) + <backend host if any>

**Test staff PIN** (Reception, Barber, Owner screens): <pin>
```

- Then: short "About" with a screenshot or two; routes table (`/`, `/join`, `/status/:id`, `/reception`, `/barber/ravi`, `/display`, `/admin`); how to run locally (`npm install`, `.env`, `npm run dev`, `npm run seed`); which storage was chosen and why; that `DEMO_MODE` is on in the demo; which P1 upgrades were built.
- Before handing in, check on a **phone with no setup**: the live link opens Home, Join works, and (with the PIN) the staff screens open.

## 10. Definition of done

- All P0 features work end to end and match `02-screens.md`.
- Every P0 item in the `03` checklist passes, plus the items of any P1 upgrade that was built.
- `npm test` and `npm run build` pass; no console errors on any screen.
- Phone, tablet and TV windows stay in sync within 5 seconds.
- The app is live, the README starts as in section 9, and the demo works on a fresh phone.
