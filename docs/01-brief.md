# Salon Queue — Project Brief

**Status:** Draft 2 · written from scratch · feeds `02-screens.md`, `03-flows-rules.md` and `AGENTS.md`
**Working name:** Salon Queue (the salon's display name is a setting, "LateCuts")

> **How to read this file.** It answers *why*, *for whom*, *what*, and *what not*. It never says how a screen looks (that is `02-screens.md`) or how the queue decides things (that is `03-flows-rules.md`).
> Features are in three tiers. **P0 = must ship. P1 = smart upgrades, built one at a time only after P0 works end to end. P2 = stretch.** An agent must not build P1 or P2 unless a build step names it.

---

## 1. Problem

A busy salon runs on a paper token list and memory. On weekends:

- Customers sit **1–2 hours** in the shop with no idea when their turn is, so some give up and walk out (lost revenue) and others hover at the reception desk (noise, stress).
- **"Who came first?" arguments** happen because the order lives in the receptionist's head.
- With **several barbers and customers who insist on one barber**, the order is not a simple line. A paper list can't show it, so the receptionist improvises and customers feel cheated.
- Customers can't use their waiting time. They could have eaten, shopped or finished work, but they don't dare leave.
- **No-shows block a chair** because nobody knows whether a called customer is nearby or gone.

*(These are the lab scenario's stated problems plus the usual consequences. They are design assumptions, not measured data.)*

## 2. Vision

> **Anyone can see their turn coming, and nobody has to wait in the salon to keep it.**

A phone-first live queue that is **fair by construction** (the system, not a person, decides the order), **honest** (wait times are estimates and are labelled that way), and **fast for staff** (one tap per action).

## 3. Design principles

These settle arguments in later documents. When two options conflict, the higher principle wins.

1. **Fair by construction.** First come, first served, with barber preference *never* violated. Staff never have to hand-pick who is next.
2. **One glance.** Each screen answers its user's one question at a glance: customer "when is my turn?", receptionist "who do I call?", barber "who is next?", owner "how are we doing?", audience "is it my token?"
3. **No install, no login for customers.** Scan or tap, enter name and phone, done. Staff use a shared PIN.
4. **Honest about uncertainty.** "About 35 min", never a fake-exact number. Never "0 min" while people are ahead.
5. **Staff speed beats customer features.** If a feature slows the receptionist during a rush, it is cut or hidden.
6. **Calm, bilingual, readable.** English and Gujarati everywhere, large text, high contrast, short friendly sentences, no jargon.
7. **Collect the minimum.** Only name and phone number. Never show personal data publicly (the TV shows tokens, not names).

## 4. Users

| User | Device | Their one question | Pain today | What wins them |
|---|---|---|---|---|
| **Customer** | Own phone, browser only | "When is my turn, and can I leave?" | Stuck in the shop, no information | Live position and wait, a gentle early warning, a clear "go now" alert |
| **Receptionist** | 10-inch tablet, landscape | "Who do I call next for this barber?" | Remembering order, arguments, no-shows | One-tap "Call next" that follows the rules, everything on one screen |
| **Barber** | Own phone, often with wet or gloved hands | "Who is my next customer?" | Being interrupted, not knowing who is next | Two big buttons (Start / Done), clear "next for you" |
| **Owner** | Phone or tablet | "How busy are we and is it fair?" | No data on waits, walkouts, service times | Simple settings and a stats card |
| **Waiting-room audience** | TV, read-only, seen from 5 m | "Is it my token yet?" | Asking staff repeatedly | Big tokens, flash and chime when called |

**Typical customer (for tone and testing):** Kunal, 24, arrives Saturday 5 pm, sees 8 people waiting, scans the QR code on the door, joins in under a minute, and goes to eat nearby.

## 5. The experience in one story

1. Kunal scans the **QR code** (on the door, the TV and the reception desk) → Home shows "6 people waiting · about 50 min".
2. He joins: picks Haircut and "Any barber", sees "45 min · ₹230 · about 35 min wait", confirms → gets token **S-14**.
3. He walks to the café. **My Status** shows "4th in line, about 35 min".
4. At 2nd in line, the page says **"Start coming to the salon"**. He taps *I'm on my way* (P1).
5. The receptionist taps **Call next** on Amit's card. Kunal's phone goes full-screen gold: **"It's your turn! Go to Amit"**. The TV flashes **S-14 → Amit** with a chime.
6. Amit taps **Start**, then **Done**. Kunal's spot closes and the owner's stats update. No argument at any step.

## 6. Features

### P0 — Must ship (every row is required)

| ID | Feature | Why it matters | Done when |
|---|---|---|---|
| **C1** | **Join from phone.** Name, 10-digit phone, 1–3 services, barber or "Any barber (fastest)", live summary of total time, price and expected wait | Core value; replaces the paper list | A customer goes from landing to a token in under 45 s, and totals are always correct |
| **C2** | **Live status.** Token, position, estimated wait that updates itself, three alert stages: "Start coming" (2nd), "You're next!" (1st), full-screen "It's your turn!" (called). Cancel with confirmation | Lets customers leave the shop with confidence | Stage changes appear on the phone within 5 s of the cause |
| **C3** | **Reception console.** Add walk-ins, one-tap **Call next** per barber (the system picks the customer), No-show, Cancel, long-wait highlight (over 60 min) | Staff run the whole queue from one screen | Call next never breaks FCFS or barber preference; mistakes can't corrupt the queue |
| **C4** | **Barber screen.** Current customer, Start / Done, "Next for you", On break / Available | Barbers update status without walking to the desk | Start and Done reach Reception, TV and customer within 5 s |
| **C5** | **Waiting-room TV.** One row per barber ("Now: S-12"), next 5 tokens with estimates, gold flash and chime on call, **QR code to join** | Removes "is it me?" questions and advertises remote joining | Readable from 5 m; no names or phone numbers shown |
| **C6** | **Owner settings and stats.** Services (EN/GU name, minutes, price, on/off), barbers on duty today, open/close online joining, closing time, today's stats (served, average wait, no-shows) | The salon controls its own menu and sees results | A change in settings shows on every other screen within 5 s |
| **C7** | **English / Gujarati toggle** on every screen, from a single language file | Most customers are more comfortable in Gujarati | Every label switches, nothing overflows |
| **C8** | **Staff PIN** on reception, barber and owner screens | Customers must not reach staff controls | Without the PIN those three URLs show only the PIN screen |

### P1 — Smart upgrades (build one at a time, after P0 works and is deployed)

| ID | Upgrade | The idea | Done when |
|---|---|---|---|
| **U1** | **Barber skills.** The owner marks which services each barber offers (for example only Imran does Hair spa) | Real salons have specialists. "Any barber" must mean *any barber who can do all my services*, so customers are never called to a barber who can't serve them | Choosing Hair spa lists only capable barbers; Call next never gives a customer to an incapable barber |
| **U2** | **Learned wait time.** Once at least 3 customers have finished a service today, the estimate uses the **average actual** duration of that service instead of the planned minutes | Planned times are guesses; real times are the truth. Estimates get more honest as the day goes on. (Plain averaging, no machine learning) | Owner stats show planned vs actual minutes per service; estimates change accordingly and still say "about" |
| **U3** | **"I'm on my way" signal.** After the "Start coming" banner, the customer can tap *On my way — about 10 / 20 min* | Tells reception who is genuinely close, so they can call sensibly and judge no-shows. It never changes the customer's position | Reception shows an "On the way · 10 min" chip beside that customer within 5 s |
| **U4** | **Owner insights.** A simple bar chart of customers per hour and average wait per hour (today and last 7 days) | Shows when to add staff. The data already exists in finished spots | Chart matches the recorded data |

### P2 — Stretch (only if time remains)

| ID | Item |
|---|---|
| **X1** | Printable QR poster page (`/poster`) with salon name and the join link |
| **X2** | "Add to home screen" for the staff screens (web app manifest) |
| **X3** | Automatic deletion of customer names and phone numbers after 30 days (stats kept as numbers only) |

## 7. Screens

Detailed in `02-screens.md`.

| # | Screen | URL | Device | Access | Serves |
|---|---|---|---|---|---|
| 1 | Home | `/` | Phone | Public | C1 |
| 2 | Join Queue | `/join` | Phone | Public | C1 |
| 3 | My Status | `/status/:id` | Phone | Public (link holder) | C2 |
| 4 | Reception Dashboard | `/reception` | Tablet | Staff PIN | C3 |
| 5 | Barber View | `/barber/:name` | Phone | Staff PIN | C4 |
| 6 | Waiting Area TV | `/display` | TV | Public, read-only | C5 |
| 7 | Owner Settings | `/admin` | Phone or tablet | Staff PIN | C6 |

## 8. Scope boundaries

### In scope
Everything marked P0. P1 and P2 only when a build step names them.

### Out of scope — do not build
| Don't build | Reason |
|---|---|
| Online payment | Out of lab scope; money handling is a different problem |
| Future-date appointments or time slots | This is a *walk-in queue*, a different product |
| SMS, WhatsApp, email or push notifications | Cost and complexity. The page alert plus TV cover the lab; the status page tells customers to keep it open |
| Loyalty points, coupons, reviews, ratings | Not needed to solve the queue problem |
| Multiple branches or multiple salons | One salon only |
| Customer accounts, sign-up, passwords | Principle 3: no login for customers |
| Changing a waiting customer's barber | Edge cases multiply; they cancel and re-join, or reception re-adds them |
| Any AI or machine-learning feature | U2 is simple averaging only |

Anything not in `02-screens.md` or `03-flows-rules.md` is out of scope. If something seems missing, **ask, don't invent**.

## 9. Look and feel (direction only)

- **Mood:** premium salon. Dark charcoal background (`#1F2937`) with a gold accent (`#D4A017`), rounded cards, generous space.
- **Mobile-first.** Tablet and TV are separate, purpose-built layouts.
- **Language:** every label in English and Gujarati; layouts must survive longer Gujarati text.
- **Tone of voice:** short, warm and plain. "You're next!", "Start coming to the salon", "No one waiting — walk right in!". No jargon like "queue entity" or "status code".
- **Motion:** gentle (a pulse on the "your turn" screen, a flash on the TV). Respect the device's "reduce motion" setting.
- Exact colours, sizes and component rules are in `02-screens.md`.

## 10. Demo scenario and data

- **Barbers:** Ravi, Amit, Imran.
- **Services (EN / GU, min, price):** Haircut / વાળ કાપવા, 30, ₹150 · Beard trim / દાઢી ટ્રિમ, 15, ₹80 · Hair spa / હેર સ્પા, 45, ₹400 · Head massage / માથાની માલિશ, 15, ₹100 · Facial / ફેશિયલ, 30, ₹300.
- **Hours:** closes 9:00 PM, India time (Asia/Kolkata). Online joining stops 30 min before closing.
- **Customers:** realistic Indian first names (Kunal, Meera, Dev, Priya, Rohan, Nisha, Jay, Hetal) with 10-digit phone numbers.
- **Demo story to record (3 min):** join on a phone → status moves to "Start coming" → reception calls next → phone flashes "It's your turn" and the TV chimes → barber taps Start then Done → owner stats update. Add one barber-preference moment (Ravi's customer is skipped when Amit is called).

## 11. Constraints and assumptions

- **Platform:** React + Vite + Tailwind web app. Hosting on free tiers (Vercel for the frontend; Render or Railway if a backend is needed). The live link must open on a phone with no setup.
- **Time:** about 45 minutes for documents and 2–3 hours for building. This is why P1 and P2 exist as separate, optional tiers.
- **Devices:** Android Chrome and iPhone Safari for customers; a 10-inch tablet for reception; a TV showing a browser (often a laptop or stick).
- **Browser limits to design around:** iPhones do not support vibration; browsers block sound until someone taps the page once (the TV needs a "Tap to turn on sound" step); alerts only work while the customer's page is open.
- **Demo mode:** the deployed demo runs with a `DEMO_MODE` flag so it works for a marker on any day or hour (the closing-time cutoff and the nightly "Closed" reset are not enforced). Nothing else changes. See `03-flows-rules.md`, section 12.
- **Sync:** every change appears on every other screen within **5 seconds**, without refreshing.
- **Privacy:** only name and phone are collected; no personal data in URLs or on the TV; the public status link uses a random id, not the token number.
- **Salon assumptions (design only, not data):** 3 barbers, about 10 operating hours, 40–80 customers on a busy Saturday, services of 15–45 minutes.

## 12. Success targets for the demo

| Target | How it is checked |
|---|---|
| Landing to token in **≤ 45 s** on a phone | Stopwatch, a practised user |
| Reception calls next in **1 tap** | Count taps |
| Any change visible on other screens in **≤ 5 s** | Phone, tablet and TV windows side by side |
| **0** barber-preference violations | Scenarios in `03-flows-rules.md` |
| **0** duplicate active spots for one phone | Test checklist |
| Works at 360 px phone, 1280×800 tablet, 1920×1080 TV | Browser device mode |
| All labels work in Gujarati without overflow | Visual check on every screen |

## 13. Risks and how the docs handle them

| Risk | Mitigation |
|---|---|
| The agent invents features or builds everything at once | Tiers, a don't-build list, and "one screen or feature per task" in `AGENTS.md` |
| Customer misses the alert (page closed, phone locked) | Early "Start coming" warning at 2nd in line, a visible hint to keep the page open, the TV flash and chime, and reception can still mark a no-show |
| Wait estimates feel wrong | Labelled "about", rounded, recalculated live; U2 improves accuracy during the day |
| Fairness disputes | The order and every move are rule-driven and recorded with server timestamps |
| Two staff devices acting at once | The server is the only judge; one action wins, the other refreshes |
| Gujarati text breaks layouts | Wrapping rules in `02-screens.md` and a Gujarati review step before submission |
| Time runs out | P0 first, deploy early, P1 only after P0 passes |

## 14. Decisions needed from you (my defaults apply if you don't object)

1. **Which P1 upgrades do you want?** Default: U1 (barber skills) and U3 (on my way) first, since they change the rules in `03-flows-rules.md`. U2 and U4 come later. *This decides how big the next two documents are.*
2. **Salon display name and logo.** Display name: "LateCuts" with a placeholder logo.
3. **Closing time.** Default: 9:00 PM.
4. **Is the Gujarati glossary going to be reviewed by a Gujarati speaker?** Default: yes, before submission.

## 15. Definition of done

The project is done when:

- All P0 features (C1–C8) work end to end and match `02-screens.md`.
- Every item in the test checklist in `03-flows-rules.md` passes.
- Phone, tablet and TV stay in sync within 5 seconds.
- Any P1 or P2 feature that was built passes its own "Done when" line above.
- The app is live, and the live link is the first line after the title in `README.md`, followed by the test staff PIN.
