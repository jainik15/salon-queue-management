# Salon Queue — Screens & Features

**Status:** Draft 2 · implements `01-brief.md` · rules and numbers are defined in `03-flows-rules.md` (written next)

> **Scope of this file.** What each screen shows, what each control does, how it looks on its device, and what happens when data is loading, empty or broken. It does **not** decide queue logic. Where a screen shows a computed value (position, estimate, who is next, whether a button is enabled) the rule lives in `03-flows-rules.md`; this file says only how that value is displayed.
>
> **Tags.** Unmarked = **P0** (must ship). Blocks tagged **[P1 · U1]**, **[P1 · U2]**, **[P1 · U3]**, **[P1 · U4]** belong to the upgrades in the brief. Build them **only when a build step names them**; until then the screens must work exactly as if the tagged block did not exist.

---

## 0. Words used on screens

These names are fixed. The same word is used in every screen, message and the language file.

| Concept | Values shown to people |
|---|---|
| **Spot status** | Waiting · Called · In chair · Done · Cancelled · No-show |
| **Barber state** | Free · Busy · On break (a barber who is not on duty today is simply not shown) |
| **Token** | `S-14` (letter S, hyphen, number; never reused in a day) |
| **Position** | "1st / 2nd / 3rd / 4th in line" among Waiting customers |
| **Estimate** | "about 35 min", "about 1 h 15 min", "No wait", or "Waiting for a barber" |
| **Preference** | A barber's name, or "Any barber" |

---

## 1. Global rules (every screen)

### 1.1 Design tokens

| Token | Value | Used for |
|---|---|---|
| `ink` | `#111827` | Deepest background and ticket/TV backgrounds |
| `charcoal` | `#1F2937` | Page background |
| `surface` | `#374151` | Cards, inputs |
| `surface-raised` | `#4B5563` | Borders, dividers, pressed cards |
| `gold` | `#D4A017` | Primary buttons, selected states, token numbers, highlights |
| `gold-pressed` | `#B8890F` | Pressed state of gold buttons |
| `gold-soft` | `#E8C766` | Gold accents and hover highlights on dark backgrounds |
| `gold-deep` | `#8A6508` | Gold text on light backgrounds only |
| `ivory` | `#F6F1E7` | Main text and warm paper tones |
| `text` | `#F9FAFB` | Legacy text token retained where already used |
| `muted` | `#9CA3AF` | Secondary text, hints |
| `success` | `#22C55E` | Free, success toasts |
| `danger` | `#EF4444` | Errors, destructive buttons |
| `amber` | `#F59E0B` | Long-wait highlight (always with an icon and bold text) |
| `qr-tile` | `#FFFFFF` on `#111827` modules | QR code only (needs high contrast to scan) |

- Text on gold is `charcoal`. Never put gold text on white.
- **Shape:** tickets 6 px radius, cards 16 px radius, buttons 12 px, chips and avatars fully rounded. Use a 4 px spacing grid.
- **Type:** Cardo Bold for display and Noto Serif Gujarati for Gujarati display; Barlow Condensed SemiBold for numerals; DM Sans with Noto Sans Gujarati for UI. Numbers use tabular figures.
- **Texture:** faint charcoal paper grain at about 3–4% opacity with a subtle warm vignette. Use the barber-pole pattern at most once per screen.
- **Ticket:** 6 px radius with semicircular side notches, a dotted perforation line and a barcode strip on the stub.
- **Motion:** transitions 150–250 ms; press feedback 80 ms; split-flap 220 ms per character with 40 ms stagger; the "It's your turn!" fill 350 ms.
- **Never rely on colour alone.** Every state also has an icon or text (for example "Busy" with a dot and the word).

### 1.2 Device layouts

| Device | Screens | Canvas | Rules |
|---|---|---|---|
| **Phone** | 1, 2, 3, 5, 7 | 360–639 px, portrait | One column. 16 px side padding. Every tap target at least 44 × 44 px; buttons 48 px tall. Primary actions use the bottom thumb zone. Barber actions 72 px tall. |
| **Tablet** | 4 (and 7 as 2 columns) | 640–1279 px; 1024 × 768 or 1280 × 800 | Recompose in two panes. 24 px padding. Touch targets 56 px tall. No hover-only actions. |
| **Desktop** | 1–5 and 7 | 1280 px and wider | Recompose in asymmetric or three-region layouts. 32 px padding. Customer screens use at most 1120 px; staff screens use at most 1600 px. |
| **TV** | 6 | 1920 × 1080, 16:9 | Use a 16:9 grid scaled with viewport units. No scrolling or clicks. Portrait view asks for rotation. |

- Test no horizontal scrolling at 320, 360, 768, 1280 and 1920 px widths.
- Numerals scale to 72 px on phones, 96 px on tablets, 120 px on desktops and 160 px+ on TV.
- Use `dvh` and safe-area inset padding for sticky bars.

### 1.3 Shared components

| Component | Behaviour |
|---|---|
| **Top bar** | Salon name + logo left. Language toggle **EN \| ગુ** right (all screens except the TV). Staff screens also show **[Lock]**. |
| **Language toggle** | Switches instantly with no reload. Choice remembered on the device. |
| **Token chip** | Gold text on a dark pill: `S-14`. |
| **Token ticket** | Ticket-shaped token display with a main area and position stub. Used by My Status, compact Reception rows and TV when no stub is needed. |
| **Split-flap numerals** | 220 ms character flips with 40 ms stagger for tokens and positions. Reduced motion uses instant change with a static gold underline. |
| **Clock estimate ring** | Circular countdown with fine clock ticks, gold progress and the estimate in the centre. |
| **Barber card** | Gold-ring avatar or initial, state chip and time-left rail. Busy looks lit, Free calm and On break dim. |
| **Empty-chair state** | Custom 1.75 px line-art empty barber chair in gold on charcoal, paired with the documented friendly line. |
| **Spot status chip** | Waiting = grey outline · Called = gold fill · In chair = green fill · Done = green outline · Cancelled = grey · No-show = red outline. Always icon + word. |
| **Barber state chip** | Free = green dot · Busy = gold dot · On break = grey dot, plus the word. |
| **Avatar** | Round photo, or the barber's initial on a gold ring if there is no photo. |
| **Estimate display** | Always formatted by one shared function: "about 35 min", "about 1 h 15 min", "No wait", "Waiting for a barber". |
| **Toast** | Bottom of screen, 4 seconds, one line, never covers a primary button. |
| **Confirm dialog** | Centered card, a question, a short consequence line, two buttons: safe action on the left, risky action on the right. Closes on outside tap only for the safe choice. |
| **Connection banner** | Slim bar under the top bar: "Connection lost — retrying…". Shown after two failed refreshes in a row; disappears when the connection returns. Old data stays visible. |
| **Loading skeleton** | Grey pulsing blocks in the final layout. **Never a blank or white screen.** |
| **Empty state** | One small icon and one friendly line (never an error tone). |
| **Live dot** | A small green dot with "Live" next to data that refreshes on its own. Turns grey with "Reconnecting" when the connection is lost. |

### 1.4 Live updates

- Every change on one device reaches all others within **5 seconds** without refreshing.
- All durations and "waiting time" values are computed from **server time**, never from the device clock.
- A new or changed row, card or number gets a brief gold highlight (about 1.5 s) so people notice what changed. With "reduce motion" on, use a static gold left-border instead of animation.

### 1.5 Language

- Every visible string comes from one language file (English and Gujarati), keyed, with placeholders such as `{barber}`. **No hard-coded text in components**, including toasts, errors, empty states and button labels.
- Service names are stored in both languages by the owner. Names of people (customers, barbers) are shown as entered.
- The **TV shows both languages at once** for fixed labels (see Screen 6); it has no toggle.
- Layout must survive Gujarati: longer text wraps to the next line; nothing is cut off, overlaps or runs outside its card. Buttons grow in height before they shrink text.
- Starter strings are in section 4 and **must be reviewed by a Gujarati speaker** before submission.

### 1.6 Staff PIN gate (screens 4, 5, 7)

- Opening a staff URL first shows only: salon name, title "Staff access", a **4-digit PIN** field (numeric keypad on phones and tablets, digits masked) and **[Unlock]**.
- Wrong PIN → "Wrong PIN. Try again." and the field clears. After 5 wrong tries in a row → locked for 30 seconds with a visible countdown.
- One shared PIN, supplied by an environment variable (never written into the code). It is remembered for the browser tab session; **[Lock]** in the top bar forgets it immediately.
- Public screens (1, 2, 3, 6) never show a PIN.
- Until the PIN is accepted, no staff data is loaded or visible on screen, even briefly.

### 1.7 Accessibility baseline

- Body text contrast at least 4.5:1 (all tokens above comply when used as listed).
- Visible focus ring on every control (gold, 3 px).
- Changes to position and status are announced to screen readers politely; the full-screen "It's your turn!" takeover is announced assertively.
- Layout stays usable at 200% browser text size.
- Respect the device's **reduce motion** setting: no pulse or flash animations, use static highlights instead.
- Every icon-only button has a text label for assistive technology.

### 1.8 Formats

- Price `₹150`. Duration `30 min`; 60 min or more as `1 h 15 min`.
- Clock times 12-hour with AM/PM, India time. Elapsed time as `mm:ss` up to an hour, then `h mm`.
- Phone numbers shown as `98765 43210` (staff screens only).

### 1.9 What is remembered on a device

| Item | Where | Why |
|---|---|---|
| Language choice | The device's browser storage | Keep the chosen language |
| The customer's active spot id | The device's browser storage | Home shows "You are in the queue as S-14"; the link survives a closed tab |
| Customer capability | The device's secure private browser storage | Authorizes private Status/cancel operations; it is never put in the URL |
| Last used name and phone | The device's browser storage only, never sent elsewhere | Prefill the Join form next time |
| Staff session | The browser tab session | Staff are not asked again until expiry, revocation or tab-close |

---

## 2. Navigation map

```
 QR code / link
      │
      ▼
   Home (/) ──► Join (/join) ──► My Status (/status/:id)
      │                               ▲
      └── "You are in the queue" card ┘

 Staff (PIN):  Reception (/reception)   Barber (/barber/:name)   Owner (/admin)
 TV (no PIN):  Display (/display)
```

Unknown URLs show a friendly "Page not found" with a button to Home. Direct opening of any URL (refresh, shared link, bookmark) must work on the deployed site.

---

## 2.1 Responsive layout and button placement

### Global button rules

1. Use one gold-filled primary action per view. Secondary actions use a gold outline; tertiary actions use text.
2. Destructive actions use a red outline and stay at least 16 px from any primary button.
3. On phones, primary actions live in a sticky bottom thumb-zone bar with safe-area and keyboard clearance.
4. On tablet/desktop dialogs, the safe action is left and the risky action is right.
5. On phones, dialogs become bottom sheets: safe action stacked on top, risky red-outline action below.
6. Phone button height is 48 px, tablet 56 px and desktop 44 px. Barber Start/Done remain 72 px on phones.
7. The language toggle remains in the top-right position on every public and staff screen except TV.

### Per-screen layouts

| Screen | Phone | Tablet | Desktop |
|---|---|---|---|
| Home | Live board, barber chips and active-spot card; Join Queue fixed in the bottom bar. | Two columns: live board left, Join panel right with Join Queue at the bottom. | Asymmetric 7/5 split: live numerals left, Join card plus QR right. |
| Join | Single column with a sticky summary and Confirm bar. | Form left, sticky summary card right. | Same as tablet inside a 1120 px container. |
| My Status | Ticket/ring first; details below; Cancel is last with at least 24 px separation. | Ticket/ring left, stepper/details/cancel right. | Same as tablet with 120 px ticket numerals. |
| Reception | Barbers/Queue tabs; floating Add walk-in bottom-right; Call next at each card bottom. | 40/60 panes; Add walk-in top-right; row actions right-aligned. | Barbers, queue and finished-today/right rail regions. |
| Barber | Current customer top; Start/Done in the lower third; Next, break toggle and count below. | Current customer/action left; Next, break toggle and count right. | Same as tablet in a centered 960 px container. |
| TV | Portrait asks for rotation. | 16:9 scaled layout. | 16:9 scaled layout without controls or scrolling. |
| Owner | Stacked cards with sticky Save/Discard only while changed. | Two-column cards. | Left sticky section menu and 960 px content column. |

---

## 3. Screens

### Screen 1 — Home (`/`)

**Who:** customers, on their phone, usually just after scanning the QR code. **Purpose:** show how busy it is in two seconds and get them to Join.

```
┌──────────────────────────────┐
│ ◈ LateCuts            EN | ગુ│
│ ● Open · Closes 9 PM         │
│ ┌──────────────────────────┐ │
│ │ 6 people waiting         │ │
│ │ about 50 min             │ │
│ │ ● Live                   │ │
│ └──────────────────────────┘ │
│  Ravi ● Busy   Amit ● Free   │
│  Imran ● On break            │
│ ┌──────────────────────────┐ │
│ │      [ Join Queue ]      │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

**Top to bottom**

1. Top bar (logo, salon name, language toggle).
2. **Open badge:** "Open · Closes 9 PM" (green dot) when online joining is open; "Closed" (grey dot) when it is closed.
3. **Active-spot card (only if this device has an active spot):** "You are in the queue as **S-14** · 4th in line" with **[View my status]**. It sits above the live card.
4. **Live card:** large "**6 people waiting**" and "**about 50 min**" (the wait a new customer would get now); a live dot.
5. **Barber chips:** one per barber on duty today, wrapping onto lines; each shows the name and its barber state chip.
6. **[ Join Queue ]** big gold full-width button.

**Buttons**

- **[Join Queue]** → `/join`.
- **[View my status]** → `/status/:id` of the stored spot. If that spot is finished (Done, Cancelled, No-show), the card is removed instead.

**Live card variants**

| Situation | What is shown |
|---|---|
| Normal | "6 people waiting · about 50 min" |
| Nobody waiting, a barber is Free | "No one waiting — walk right in!" |
| Nobody waiting, all barbers Busy | "No one waiting · you'd be next" with the estimate on a second line ("about 20 min") |
| No barber working (all On break) | "Barbers are on a break. Wait time unavailable." |
| No barber on duty today | "No barbers are available today." |

**Join button disabled** (greyed, with the reason in a line directly beneath):

| Reason | Message |
|---|---|
| Owner closed online joining | "Online queue is closed right now. Please walk in or ask at reception." |
| Too close to closing time, or closed for the day | "Online joining has closed for today. Walk-ins are welcome until {time}." |
| No barber on duty today | "No barbers are available today." |

**States**

| State | What is shown |
|---|---|
| Loading | Skeleton of badge, live card, chips and button |
| Error on first load | "Couldn't load the salon status." with **[Try again]** |
| Connection lost later | Connection banner; last data stays |

---

### Screen 2 — Join Queue (`/join`)

**Who:** customers on phones. One scrolling page, a sticky summary bar at the bottom.

```
┌──────────────────────────────┐
│ ←  Join the queue    EN | ગુ │
│ Your details                 │
│ [ Name                     ] │
│ [ Phone (10 digits)        ] │
│ Pick up to 3 services        │
│ ┌────────────┐ ┌───────────┐ │
│ │ Haircut ✓  │ │ Beard trim│ │
│ │ 30 min ₹150│ │ 15 min ₹80│ │
│ └────────────┘ └───────────┘ │
│ Choose your barber           │
│ (●) Any barber (fastest)     │
│ ( ) Ravi    ● Busy           │
│ ( ) Amit    ● Free           │
├──────────────────────────────┤
│ Total 45 min · ₹230          │
│ Expected wait ~ 35 min       │
│ [        Confirm          ]  │
└──────────────────────────────┘
```

**Top to bottom**

1. Back arrow, title "Join the queue", language toggle.
2. **Name:** required, 2–40 characters after trimming. Gujarati or English characters accepted.
3. **Phone:** required, exactly 10 digits. Numeric keypad. Spaces and dashes are ignored as typed. Inline error under the field: "Enter a 10-digit phone number."
4. **Service cards** (multi-select, at least 1, **at most 3**). Each card shows the service name in the current language, the duration, the price, and a gold tick with a gold border when selected. Only services switched **on** by the owner are listed. When 3 are selected the remaining cards are disabled (40% opacity) with the hint "You can pick up to 3 services."
5. **Barber picker** (single choice, radio cards):
   - First and default: **"Any barber (fastest)"**.
   - Then one card per barber on duty today: avatar, name, barber state chip.
   - A barber who is **On break** is still selectable; their card adds "On break — your wait may be longer."
   - Barbers not on duty today are not listed.
6. **Sticky summary bar** (always visible): line one "**Total 45 min · ₹230**", line two "**Expected wait about 35 min**". With no service selected: "Pick at least one service." The summary updates instantly on every selection.
7. **[ Confirm ]** gold, full-width, inside the sticky bar.

**Prefill:** if this device has joined before, name and phone are prefilled (the customer can edit them).

**What [Confirm] does**

| Situation | Result |
|---|---|
| Form invalid | Inline errors under the fields; page scrolls to the first error; nothing is sent |
| Valid | Button shows a spinner and disables itself (a double tap never makes two spots), then opens **My Status** for the new token |
| This phone already has an active spot | No new spot. Opens that spot's My Status with a note "You already have a spot: **S-14**." |
| Online joining just closed | Stays on the page with "Online joining just closed. Please ask at reception." Entered data is kept |
| Server or network error | "Couldn't join. Please try again." Entered data is kept |

**Opening `/join` while joining is disabled:** the form is replaced by the same message as on Home with a **[Back to home]** button.

**No services available** (owner switched all off): "No services are available right now. Please ask at reception."

**[P1 · U1 Barber skills]** (the same behaviour applies to the walk-in form on Reception)
- Selecting services narrows the barber picker. A barber who does **not** offer **all** selected services is shown greyed and disabled with the reason "Doesn't offer {service}".
- The first option's label becomes "**Any barber who offers all your services**". If no barber can do the selected combination, the summary bar shows "No barber offers this combination. Try fewer services." and [Confirm] is disabled.
- If the customer had picked a barber and then adds a service that barber doesn't offer, the picker resets to "Any".

---

### Screen 3 — My Status (`/status/:id`)

**Who:** a customer, keeping this page open while they wait. `:id` is a random, hard-to-guess spot id, not the token number.

```
┌──────────────────────────────┐
│ LateCuts              EN | ગુ│
│ ● Waiting ─ ○ Called ─ ○ In chair ─ ○ Done
│ ┌──────────────────────────┐ │
│ │  Start coming to the     │ │   ← banner (2nd in line)
│ │  salon                   │ │
│ └──────────────────────────┘ │
│            S-14              │
│        4th in line           │
│        ╭────────╮            │
│        │ about  │            │
│        │ 35 min │            │
│        ╰────────╯            │
│ Haircut + Beard trim · Any   │
│ Joined 5:12 PM · ● Live      │
│ Keep this page open to get   │
│ your alert.                  │
│ [      Cancel my spot      ] │
└──────────────────────────────┘
```

**Top to bottom (Waiting state)**

1. Top bar.
2. **Progress stepper:** Waiting → Called → In chair → Done, with the current step in gold. (Cancelled and No-show replace the stepper with their own message, see below.)
3. **Stage banner** (only when applicable, see the table).
4. **Token** very large (72 px), gold.
5. **Position** "**4th in line**".
6. **Estimate ring:** a circular progress ring with "about 35 min" in the middle. It recalculates from the live queue and updates by itself. The ring fills as the estimate shrinks compared with the estimate at joining time. It never shows a negative value, and never shows "0 min" while someone is ahead.
7. **Details card:** services (with total time and price), barber preference ("Any barber" or the name), "Joined 5:12 PM".
8. Live dot and the hint "Keep this page open to get your alert."
9. **[ Cancel my spot ]** secondary (outlined) button.

**Stage banners and full states**

| Spot state | What the customer sees |
|---|---|
| Waiting, 3rd or later | Normal layout |
| Waiting, **2nd** | Gold banner: "**Start coming to the salon**" |
| Waiting, **1st** | Gold banner: "**You're next!**" |
| Waiting and the chosen barber is On break | Grey notice under the position: "**Ravi is on break**" (disappears when he is back). Position unchanged |
| Waiting and no barber is working | The ring is replaced by "Waiting for a barber to be available" |
| **Called** | **Full-screen gold takeover** (see below) |
| In chair | Stepper at "In chair". Large text "Enjoy your service with Ravi". No cancel button |
| Done | "Thank you! See you again." with **[Join again]** |
| Cancelled | "Your spot was cancelled." with **[Join again]** |
| No-show | "You were marked as not arrived. Please ask reception to add you again, or join the queue again." with **[Join again]** |
| Unknown or invalid id | "We couldn't find this spot." with **[Go to home]** |

**The "It's your turn!" takeover (Called state)**

- Covers the entire screen with solid gold. Charcoal text.
- Content, centered: token (very large), "**It's your turn!**" (very large), "**Go to Ravi**" (large, the barber's name), and below it "Please come to the salon now. Your spot is held for {minutes} min." (`{minutes}` comes from the no-show setting).
- A gentle pulse animation on the text; the phone **vibrates** in a short pattern where the browser supports it (iPhones do not, so the visual must stand alone).
- The browser tab title changes to "🔔 It's your turn!" so it is noticed in a background tab.
- It stays until the status changes to In chair. There is no cancel button in this state.
- It must appear within **5 seconds** of reception tapping Call next.

**[ Cancel my spot ]** (Waiting only) opens a confirm dialog: "Cancel your spot S-14?" with "You will lose your place in line." Buttons **[Keep my spot]** (left) and **[Yes, cancel]** (right, danger). After confirming, the Cancelled state is shown.

**Behaviour notes**

- Closing the tab and reopening the link shows the same spot; nothing depends on in-memory state.
- The alert works only while the page is open (there is no push or SMS); the hint line says so.
- The position, estimate and banners update on their own.

**[P1 · U3 "I'm on my way"]**
- When the customer reaches the "Start coming to the salon" banner (2nd in line) or the "You're next!" banner (1st), a card appears under the ring: "**Let reception know you're coming**" with three choice chips **[10 min] [20 min] [30 min]**.
- After a choice, the card shows "✓ On my way — about 20 min" with a small **[Change]** link and a **[Not coming]** link that clears it. It does **not** change the customer's position and says "This doesn't change your place in line."
- The card disappears when the status becomes Called.

---

### Screen 4 — Reception Dashboard (`/reception`) — tablet, landscape

**Who:** the receptionist or owner at the desk. **Purpose:** run the whole queue from one screen without scrolling the page. Behind the staff PIN.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◈ LateCuts · Sat 5:12 PM          [ + Add walk-in ]     EN | ગુ     [Lock]   │
├──────────────────────────────────────────────────────────────────────────────┤
│  Waiting 6   │  Longest wait 42 min  │  Barbers working 2 of 3  │ Online: Open │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ BARBERS                       │ QUEUE                [🔍 Name or phone]      │
│ ┌───────────────────────────┐ │ Called                                       │
│ │ ◉ Ravi          ● Busy    │ │ S-12 Meera  Haircut   Ravi  Called 3:20      │
│ │ S-10 Dev · Haircut        │ │                [No-show in 6:40]             │
│ │ ▓▓▓▓▓▓░░░░ 12 min left    │ │ Waiting                                      │
│ │ Next: S-15 Kunal          │ │ S-13 Priya  Hair spa  Any   18 min [Cancel]  │
│ │ [ Call next ]  (disabled) │ │ S-14 Kunal  Haircut   Amit  ⚠ 64 min [Cancel]│
│ └───────────────────────────┘ │ …                                            │
│ ┌ Amit ● Free ──────────────┐ │                                              │
│ │ No customer               │ │ ▸ Finished today (14)                        │
│ │ Next: S-13 Priya          │ │                                              │
│ │ [ Call next ]             │ │                                              │
│ └───────────────────────────┘ │                                              │
└───────────────────────────────┴──────────────────────────────────────────────┘
```

**Top bar:** salon name, today's day and a live clock, **[ + Add walk-in ]** (gold, prominent), language toggle, **[Lock]**.

**Summary strip** (four compact tiles): Waiting (count), Longest wait (the longest current waiting time), Barbers working ("2 of 3"), Online joining (Open or Closed).

**Left pane (about 40%): one card per barber on duty, stacked, scrolls inside the pane if there are more than three.**

Each card contains:

- Avatar, name, barber state chip.
- **Current customer line:**
  - Nobody: "No customer".
  - **Called:** "S-12 Meera · Haircut — called 3:20 ago, waiting to arrive".
  - **In chair:** "S-10 Dev · Haircut + Beard trim" and a **progress bar** with "12 min left". If the planned time has passed, the bar is full and reads "Over by 4 min".
- **"Next: S-15 Kunal"** — the customer the **Call next** button would call for this barber, or "No customer waiting for Ravi".
- **[ Call next ]** gold. It is enabled only when the rules say this barber can take a customer. Otherwise it is disabled with one short reason under it: "Busy", "On break" or "No customer for Ravi".

**Right pane (about 60%): the queue**

- A search box filters by name or phone as you type.
- Two groups with small headings: **Called** (pinned to the top, at most one per barber) and **Waiting** (in queue order).
- Row columns: **Token · Name (phone below, smaller) · Services · Preferred barber · Waiting time · Actions**.
- Waiting time is the time since the customer joined, e.g. "42 min".
- **Waiting over 60 minutes:** the row has an amber tint, a ⚠ icon and the minutes in bold.
- Called rows show a gold "Called → Ravi" chip with a running timer.
- **Actions per row:**
  - **[Cancel]** — Waiting rows only. Opens a confirm dialog: "Cancel S-14 Kunal?" / "They will leave the queue." **[No]** / **[Yes, cancel]**.
  - **[No-show]** — Called rows only. Until it becomes allowed it is disabled and shows a countdown "No-show in 6:40". Then it becomes active. Opens a confirm dialog: "Mark S-12 as no-show?" / "Their spot will close and Ravi becomes free." **[No]** / **[Yes]**.
- **Empty queue:** "No one waiting — walk right in!"
- Under the list: a collapsed section **"Finished today (14)"**. Opened, it lists today's Done, Cancelled and No-show spots (token, name, final status, time), read-only, newest first. It exists so staff can check what happened, for example to see who was marked no-show before re-adding them.

**[ + Add walk-in ]** opens a modal:

1. Name, Phone (same rules as Join).
2. Service cards (max 3, same cards as Join, compact).
3. Barber preference (default "Any barber").
4. Live summary line: "Total 45 min · ₹230 · Expected wait about 35 min".
5. **[Add to queue]** and **[Cancel]**.

Outcomes:

- Success: modal closes; toast "Added as **S-16**"; the new row appears at the end with a highlight.
- Phone already has an active spot: stays open, red message "This phone already has an active spot: S-14 (Kunal)."
- Walk-ins work **even when online joining is closed**. The only exception: with no barber on duty today the form shows "No barbers on duty today." and [Add to queue] is disabled.

**Live behaviour**

- Customers who join from their phones appear in the queue within 5 seconds with the gold highlight, no refresh.
- If two staff devices act on the same customer at once, the second sees a toast such as "S-14 was already called. List refreshed." and the data updates.
- **There is no undo for Call next.** A mistaken call is resolved by the no-show path. (The Call next button therefore responds on a single tap, but its result is clearly confirmed: card changes, toast "Called S-14 → Amit".)

**States**

| State | What is shown |
|---|---|
| Loading | Skeleton barber cards and list rows |
| Connection lost | Connection banner; buttons that need the server are disabled and show the visible line "Waiting for connection" (no hover needed) |
| No barbers on duty | Left pane: "No barbers on duty today. Switch one on in Owner settings." |
| Barber On break | Card greyed, chip "On break", Call next disabled with "On break" |

**[P1 · U3]** Each Waiting row whose customer sent "I'm on my way" shows a small chip "On the way · 18 min" next to the token. The minutes count **down** from the time the customer chose (rounded up to a whole minute). At 0 it changes to "Should be here" in gold. It never reorders the list.

---

### Screen 5 — Barber View (`/barber/:name`) — phone

**Who:** one barber on their own phone (for example `/barber/ravi`). Behind the staff PIN. Designed for wet or gloved hands: large buttons, minimal text.

```
┌──────────────────────────────┐
│ Ravi   ● Busy      EN|ગુ 🔒  │
│ ┌──────────────────────────┐ │
│ │ S-10  Dev                │ │
│ │ Haircut + Beard trim     │ │
│ │ In chair       12:40     │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │          DONE            │ │  ← 72 px tall
│ └──────────────────────────┘ │
│ Next for you:                │
│ S-15 Kunal · Haircut · 30 min│
│ ( ) On break                 │
│ You've served 7 today        │
└──────────────────────────────┘
```

**Top to bottom**

1. Barber name, barber state chip, language toggle, [Lock].
2. **Current customer card:**
   - **Called, not started:** token, name, services, "Called 2:10 ago — waiting for them to arrive".
   - **In chair:** token, name, services, and a timer since start (`mm:ss`).
   - **None:** "No customer right now."
3. **One large action button** at a time:
   - **[ Start ]** when a customer is Called. Starts the service (no confirmation).
   - **[ Done ]** when a customer is In chair. Opens a confirm dialog "Mark S-10 as done?" **[No]** / **[Yes, done]** (a wrong Done can't be undone).
   - When neither applies, a disabled **[ Start ]** with the line "Waiting for reception to call someone."
4. **"Next for you":** token, name, services and total time of the customer reception would call next for this barber, or "No customers waiting for you."
5. **On break toggle** (large). Turning it on is blocked while a customer is Called or In chair: the toggle is disabled with "Finish your current customer first." While on break a grey banner reads "You are on break."
6. **"You've served 7 today"** (small, muted).

**Keep awake:** while this screen is open the phone should not go to sleep where the browser allows it.

**Errors**

| Situation | Message |
|---|---|
| Barber name not found | "We couldn't find this barber." with **[Back]** |
| Barber not on duty today | "You are not on duty today." |
| Connection lost | Connection banner; Start and Done are disabled until it returns, with the line "Waiting for connection" |

Start and Done must be visible on Reception, the TV and the customer's phone within 5 seconds.

---

### Screen 6 — Waiting Area TV (`/display`) — 1920 × 1080

**Who:** the audience in the waiting room. Read-only. No PIN, no toggle, no navigation. Kiosk style.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ LateCuts              ● Open · Closes 9 PM                        5:12 PM       │
│ ┌ gold banner slides in here when a token is called: "S-14 → Amit" ───────────┐ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│ NOW SERVING · હાલમાં સેવામાં              │ UP NEXT · હવે પછી                    │
│  ◉ Ravi      Now: S-10                    │  S-13     ~10 min                    │
│  ◉ Amit      Now: S-14  Please come       │  S-15     for Ravi · ~20 min         │
│  ◉ Imran     On break                     │  S-16     ~25 min                    │
│                                           │  S-17     ~30 min                    │
│                                           │  S-18     ~35 min                    │
│                                           │  +3 more waiting                     │
│ ┌─────────┐                                                                      │
│ │  QR     │  Scan to join the queue · જોડાવા માટે સ્કેન કરો                       │
│ └─────────┘                                                                      │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Layout**

1. **Header strip:** salon name, open badge (as on Home), live clock.
2. **Call banner area** (below the header, reserved so nothing jumps): empty most of the time.
3. **Left half "Now serving · હાલમાં સેવામાં":** one row per barber on duty. Each row: avatar, name, and one of
   - "**Now: S-10**" (a customer is In chair),
   - "**Now: S-14**" with a small "Please come" tag (a customer is Called),
   - "**Free**",
   - "**On break**" (greyed).
4. **Right half "Up next · હવે પછી":** the next **5** Waiting tokens in order. Each row: the token, its estimate ("~10 min"), and — **only if that customer chose a specific barber** — the tag "for Ravi". The tag makes the order visibly fair (it explains why S-15 isn't being called for Amit). Below the five rows: "+3 more waiting" when there are more.
5. **Footer:** a **QR code** (at least 240 px, white tile with a quiet border so it scans from a distance) that opens `/join`, with "Scan to join the queue · જોડાવા માટે સ્કેન કરો". If online joining is closed the QR is replaced by "Walk in — we'll add you".

**The call flash**

- When a customer is called, a **gold banner** slides into the call banner area reading "**S-14 → Amit**" (token at least 120 px) for **10 seconds**, the Amit row pulses gold, and a **chime** plays.
- If several customers are called close together, banners show **one after another**, never overlapping, each for 10 seconds (queued in call order).
- With "reduce motion" on: no slide or pulse, just the static gold banner.

**Sound**

- Browsers block sound until the page has been tapped once. On first load a small overlay says "**Tap to turn on sound** · અવાજ ચાલુ કરવા ટેપ કરો". After the tap it disappears and the chime works. Until then the flash still works silently.

**Privacy**

- **Tokens only.** Never customer names or phone numbers.

**Kiosk behaviour**

- The mouse cursor hides after 3 seconds of no movement.
- The screen never scrolls. Content that does not fit (long barber lists) shrinks within the safe area; the layout supports up to 5 barbers.
- Auto-recovers: after a lost connection it keeps showing the last data with a small "Reconnecting…" indicator in the header and refreshes itself when the connection returns. It never shows an error page.

**States**

| State | What is shown |
|---|---|
| Loading | Skeleton rows, no empty screen |
| Nobody waiting | "Up next" shows "No one waiting — walk right in! · કોઈ રાહ જોતું નથી — સીધા અંદર આવો!" |
| No barber on duty | "Now serving" shows "No barbers on duty today" |

---

### Screen 7 — Owner Settings (`/admin`) — phone or tablet

**Who:** the owner. Behind the staff PIN. On a phone the sections stack; on a tablet they sit in two columns. Changes save immediately (with a toast "Saved") unless a section has a form with **[Save]**.

**Sections, top to bottom**

1. **Today's stats** (three cards, "as of 5:12 PM"):
   - **Customers served** (finished today),
   - **Average wait** (minutes from joining to start of service, for customers finished today),
   - **No-shows** (today).
   - With no data: "0", "–", "0".

2. **Queue control:**
   - Big toggle "**Online joining: Open / Closed**" (affects online joining only; walk-ins are always allowed).
   - **Closing time** (time picker, default 9:00 PM). Helper text: "Online joining stops 30 minutes before this."
   - Helper text under the toggle: "Resets to Closed each new day. Open it when the salon opens."

3. **Salon details:** salon name in English and Gujarati, with **[Save]**. (No logo upload: a placeholder logo is used.)

4. **Services list:** one card per service: names (EN and GU), minutes, price, on/off switch, **[Edit]**. **[ + Add service ]** at the bottom.
   - **Edit / Add form:** English name, Gujarati name, minutes (whole number, 5–180, in steps of 5), price (whole rupees, 0 or more). **[Save]** / **[Cancel]**. Errors appear inline ("Enter minutes from 5 to 180").
   - Switching a service off hides it from Join and the walk-in form only; people already queued keep it.
   - Editing minutes or price affects only people who join afterwards (their totals are fixed when they join).
   - The last service that is on cannot be switched off: "At least one service must stay on."
   - Services are never deleted, only switched off.

5. **Barbers on duty today:** one row per barber (avatar, name, toggle). All start each day switched on. A barber who still has customers cannot be switched off: the toggle is disabled with "{barber} still has customers. Finish or cancel them first."
   - Barber profiles (names, photos) are fixed demo data. **Editing barber profiles is out of scope.**

**[P1 · U1 Barber skills]** Under each barber row: "**Services {barber} offers**" as multi-select chips, one per service. At least one must stay selected ("Each barber must offer at least one service"). A service that no barber on duty offers shows a warning "No barber offers {service}" next to it.

**[P1 · U2 Learned wait time]** In each service card, a line "Planned 30 min · Actual today 27 min (8 customers)". With fewer than 3 finished customers: "Actual today: not enough data yet."

**[P1 · U4 Owner insights]** A card "**Busy hours**" with a bar chart of customers per hour and a second chart of average wait per hour, with a switch **[Today] [Last 7 days]**. Bars are gold, labelled, with a text summary underneath for accessibility ("Busiest hour: 5–6 PM, 11 customers"). Zero state: "Not enough data yet."

**States**

| State | What is shown |
|---|---|
| Loading | Skeleton cards |
| Save failed | Toast "Couldn't save. Try again." and the control returns to its previous value |
| Connection lost | Connection banner; controls disabled with the line "Waiting for connection" |

---

## 4. Starter language file (English / Gujarati)

Keys are dotted names; `{…}` are placeholders filled in by the app. **A Gujarati speaker must review every Gujarati string before submission.** Add new strings to this file, never directly in components.

| Key | English | ગુજરાતી |
|---|---|---|
| `app.langToggle` | EN \| ગુ | EN \| ગુ |
| `home.open` | Open · Closes {time} | ખુલ્લું · {time} એ બંધ થશે |
| `home.closed` | Closed | બંધ |
| `home.waiting` | {count} people waiting | {count} લોકો રાહ જોઈ રહ્યા છે |
| `home.walkIn` | No one waiting — walk right in! | કોઈ રાહ જોતું નથી — સીધા અંદર આવો! |
| `home.join` | Join Queue | કતારમાં જોડાઓ |
| `home.queueClosed` | Online queue is closed right now. Please walk in or ask at reception. | ઓનલાઇન કતાર હાલમાં બંધ છે. કૃપા કરીને સીધા આવો અથવા રિસેપ્શન પર પૂછો. |
| `home.noBarbers` | No barbers are available today. | આજે કોઈ બાર્બર ઉપલબ્ધ નથી. |
| `estimate.about` | about {time} | લગભગ {time} |
| `estimate.none` | No wait | રાહ જોવાની જરૂર નથી |
| `estimate.noBarber` | Waiting for a barber to be available | બાર્બર ઉપલબ્ધ થવાની રાહ જોઈ રહ્યા છીએ |
| `join.title` | Join the queue | કતારમાં જોડાઓ |
| `join.name` | Name | નામ |
| `join.phone` | Phone | ફોન નંબર |
| `join.nameError` | Enter your name | તમારું નામ દાખલ કરો |
| `join.phoneError` | Enter a 10-digit phone number. | 10 અંકનો ફોન નંબર દાખલ કરો. |
| `join.services` | Pick up to 3 services | વધુમાં વધુ 3 સેવાઓ પસંદ કરો |
| `join.maxServices` | You can pick up to 3 services. | તમે વધુમાં વધુ 3 સેવાઓ પસંદ કરી શકો છો. |
| `join.pickOne` | Pick at least one service. | ઓછામાં ઓછી એક સેવા પસંદ કરો. |
| `join.anyBarber` | Any barber (fastest) | કોઈપણ બાર્બર (સૌથી ઝડપી) |
| `join.total` | Total {minutes} · {price} | કુલ {minutes} · {price} |
| `join.expectedWait` | Expected wait {time} | અંદાજિત રાહ {time} |
| `join.confirm` | Confirm | પુષ્ટિ કરો |
| `join.existing` | You already have a spot: {token} | તમારી પાસે પહેલેથી જગ્યા છે: {token} |
| `status.waiting` | Waiting | રાહ જોઈ રહ્યા છીએ |
| `status.called` | Called | બોલાવ્યા |
| `status.inChair` | In chair | ખુરશી પર |
| `status.done` | Done | પૂર્ણ |
| `status.position` | Your position: {n} | તમારો ક્રમ: {n} |
| `status.startComing` | Start coming to the salon | સલૂન તરફ આવવાનું શરૂ કરો |
| `status.next` | You're next! | હવે પછી તમારો વારો છે! |
| `status.yourTurn` | It's your turn! | તમારો વારો આવી ગયો છે! |
| `status.goTo` | Go to {barber} | {barber} પાસે જાઓ |
| `status.comeNow` | Please come to the salon now. Your spot is held for {minutes} min. | કૃપા કરીને હમણાં સલૂન આવો. તમારી જગ્યા {minutes} મિનિટ સુધી રાખવામાં આવશે. |
| `status.keepOpen` | Keep this page open to get your alert. | એલર્ટ મેળવવા આ પેજ ખુલ્લું રાખો. |
| `status.onBreak` | {barber} is on break | {barber} વિરામ પર છે |
| `status.thanks` | Thank you! See you again. | આભાર! ફરી મળીશું. |
| `status.cancelled` | Your spot was cancelled. | તમારી જગ્યા રદ કરવામાં આવી છે. |
| `status.joinAgain` | Join again | ફરી જોડાઓ |
| `status.cancel` | Cancel my spot | મારી જગ્યા રદ કરો |
| `status.keepSpot` | Keep my spot | મારી જગ્યા રાખો |
| `status.yesCancel` | Yes, cancel | હા, રદ કરો |
| `status.onMyWay` | I'm on my way | હું રસ્તામાં છું |
| `reception.addWalkIn` | Add walk-in | વોક-ઇન ઉમેરો |
| `reception.callNext` | Call next | આગળનાને બોલાવો |
| `reception.noShow` | No-show | હાજર ન થયા |
| `reception.cancel` | Cancel | રદ કરો |
| `barber.start` | Start | શરૂ કરો |
| `barber.done` | Done | પૂર્ણ |
| `barber.onBreak` | On break | વિરામ પર |
| `barber.finishFirst` | Finish your current customer first. | પહેલા હાલના ગ્રાહકને પૂર્ણ કરો. |
| `barber.state.free` | Free | ઉપલબ્ધ |
| `barber.state.busy` | Busy | વ્યસ્ત |
| `tv.nowServing` | Now serving | હાલમાં સેવામાં |
| `tv.upNext` | Up next | હવે પછી |
| `tv.scan` | Scan to join the queue | જોડાવા માટે સ્કેન કરો |
| `tv.sound` | Tap to turn on sound | અવાજ ચાલુ કરવા ટેપ કરો |
| `staff.pin` | Enter PIN | PIN દાખલ કરો |
| `staff.unlock` | Unlock | અનલૉક કરો |
| `staff.lock` | Lock | લૉક કરો |
| `staff.wrongPin` | Wrong PIN. Try again. | ખોટો PIN. ફરી પ્રયાસ કરો. |
| `net.lost` | Connection lost — retrying… | કનેક્શન તૂટી ગયું — ફરી પ્રયાસ કરી રહ્યા છીએ… |
| `common.open` | Open | ખુલ્લું |
| `common.closed` | Closed | બંધ |
| `common.save` | Save | સાચવો |

---

## 5. Screen acceptance checks

Quick visual checks per screen. The full behavioural test checklist (rules, sync, edge cases) is in `03-flows-rules.md`.

**Global**
- [ ] Every screen works at its device size with no horizontal scrolling and no clipped text.
- [ ] Language toggle changes every visible string on every screen (TV shows both languages at once).
- [ ] No white or blank screen while loading; skeletons appear instead.
- [ ] Connection banner appears when the network is cut and clears when it returns.
- [ ] All phone tap targets are at least 44 px; barber action buttons are 72 px tall.
- [ ] With "reduce motion" on, no pulse, slide or flash animations play.

**Home / Join / Status**
- [ ] Home shows all five live-card variants and all three disabled-join messages.
- [ ] Join summary changes instantly with every selection; the 4th service cannot be chosen.
- [ ] Status shows the Start-coming banner at 2nd, "You're next!" at 1st, and the full-screen gold takeover when Called, with no cancel button.
- [ ] Reopening the status link, or the Home "View my status" card, shows the same spot.

**Reception**
- [ ] Both panes fit on a 1280 × 800 landscape tablet without page scrolling.
- [ ] Call next shows the right reason when disabled; No-show shows a countdown before it activates.
- [ ] Rows waiting over 60 minutes show amber, the ⚠ icon and bold minutes (and are still understandable without colour).
- [ ] The "Finished today" section lists Done, Cancelled and No-show spots.

**Barber / TV / Admin**
- [ ] Barber screen shows exactly one large action at a time; Done asks for confirmation.
- [ ] TV text is readable from 5 metres; shows tokens only; QR scans from a phone at that distance.
- [ ] TV call banners queue one after another; "Tap to turn on sound" appears until tapped.
- [ ] Admin cannot switch off the last service or a barber who still has customers; changes show on other screens within 5 seconds.

**P1 (only if built)**
- [ ] U1: barbers who can't do the selected services are disabled with the reason; the "Any" label changes.
- [ ] U2: each service card shows planned vs actual minutes.
- [ ] U3: the "I'm on my way" card appears only at 1st or 2nd and never changes position; Reception shows the chip.
- [ ] U4: charts match recorded data and have a text summary.

### 5.1 Visual system acceptance checks

- [ ] No horizontal scrolling from 320 px to 1920 px.
- [ ] Gujarati wraps and grows vertically without clipping or overlap.
- [ ] Every public screen has loading, empty, error and connection-lost presentations.
- [ ] Exactly one gold-filled primary action is visible in each view.
- [ ] Destructive actions are visually separated from primary actions.
- [ ] The language toggle stays in the same top-right location.
- [ ] Status, Reception row tokens and TV numerals use the largest appropriate numeral scale.
- [ ] Reduced-motion mode disables pulse, slide, split-flap and drift animations.
- [ ] Every control has a visible 3 px gold focus ring and usable keyboard behavior on desktop.
- [ ] The app is usable at 200% text zoom.
- [ ] The production build does not include `/_styleguide`.
