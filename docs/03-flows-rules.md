# Salon Queue — Flows & Rules

**Status:** Draft 2 · implements `01-brief.md` · every message and disabled state in `02-screens.md` is decided here

> **Authority.** This file is the single source of truth for queue behaviour. If it disagrees with `02-screens.md` about a *rule*, this file wins; if it disagrees about *layout or wording*, `02-screens.md` wins.
>
> **Tags.** Unmarked = **P0**. Blocks tagged **[P1 · U1]** (barber skills), **[P1 · U2]** (learned wait time), **[P1 · U3]** (I'm on my way), **[P1 · U4]** (owner insights) apply **only when that upgrade is built**. With no tag active, the P0 rules apply exactly as written.
>
> **How the rules are meant to be coded.** All rules live in **one rules module** of plain functions (no screen, no database inside), used by the server and by every screen. Every number in section 2 is a named constant there. The worked examples (sections 8 and 17) and the checklist (section 19) become its automated tests.

---

## 1. Words used in this file

| Term | Meaning |
|---|---|
| **Spot** | One customer's place in the queue for one visit |
| **Token** | The label `S-1`, `S-2`, … of a spot |
| **Active spot** | A spot whose status is **Waiting**, **Called** or **In chair** |
| **Final spot** | A spot that is **Done**, **Cancelled** or **No-show** (it never changes again) |
| **Preference** | The barber the customer chose, or **Any** |
| **On duty** | Switched on in Owner Settings for today |
| **Working barber** | On duty **and** not On break |
| **Barber state** | Derived, never typed in: **On break** (break toggle is on) → otherwise **Busy** (has a Called or In chair customer) → otherwise **Free** |
| **Server time** | The clock of the server in India Standard Time (Asia/Kolkata). Every timestamp and duration uses it, never a device clock |
| **Today** | The current India calendar date |

## 2. Rule constants (change only here)

| Constant | Value | Used for |
|---|---|---|
| `NO_SHOW_AFTER_MINUTES` | 10 | Minutes after Called before No-show is allowed. Set to 0 or 1 in development to test quickly |
| `ONLINE_CLOSE_BEFORE_MINUTES` | 30 | Online joining stops this long before closing time |
| `MAX_SERVICES` | 3 | Most services per spot |
| `AMBER_AFTER_MINUTES` | 60 | Waiting longer than this is highlighted on Reception |
| `WAIT_ROUND_TO_MINUTES` | 5 | Estimates are rounded **up** to this step |
| `START_COMING_POSITION` | 2 | At this position or better the customer sees "Start coming" |
| `UP_NEXT_COUNT` | 5 | Tokens listed on the TV |
| `SYNC_MAX_SECONDS` | 5 | Longest delay before other screens show a change |
| `CALL_FLASH_SECONDS` | 10 | How long each call banner shows on the TV |
| `PIN_MAX_TRIES` | 5 | Wrong PINs in a row before a lock |
| `PIN_LOCK_SECONDS` | 30 | Length of that lock |
| `SERVICE_MIN_MINUTES` / `MAX` / `STEP` | 5 / 180 / 5 | Allowed service durations |
| `JOIN_ATTEMPTS_PER_MINUTE` | 5 | Join requests allowed per device per minute (abuse guard) |
| **[P1 · U2]** `LEARN_MIN_SAMPLES` | 3 | Finished customers needed before learned times are used |
| **[P1 · U2]** `LEARN_WINDOW` | 10 | Most recent finished customers per service that are averaged |
| **[P1 · U2]** `LEARN_OUTLIER_LOW` / `HIGH` | 0.25 / 3.0 | A finished spot is ignored for learning if it took less than 0.25× or more than 3× its planned time |
| **[P1 · U3]** `ON_MY_WAY_CHOICES` | 10, 20, 30 | Minutes offered to the customer |

## 3. What every spot records

| Field | Notes |
|---|---|
| `id` | Random, hard to guess; used in the customer's link. Never the token |
| `token` | `S-n`, assigned at joining |
| `name`, `phone` | As entered (phone as 10 digits) |
| `services` | A **snapshot** of each chosen service at joining time: names (EN and GU), minutes, price |
| `totalMinutes`, `totalPrice` | Sums of the snapshot |
| `preference` | A barber, or Any |
| `assignedBarber` | Set when Called; never changes after |
| `status` | Waiting · Called · In chair · Done · Cancelled · No-show |
| `source` | `online` or `walk-in` |
| `joinedAt`, `calledAt`, `startedAt`, `finishedAt` | Server time. `finishedAt` is also the time a spot became Cancelled or No-show |
| `initialEstimate` | The estimate shown at joining (for the progress ring) |
| `endReason` | For final spots: `done`, `cancelled-by-customer`, `cancelled-by-reception`, `no-show`, `day-ended` |
| **[P1 · U3]** `onMyWay` | `{minutes, setAt}` or empty |

**Move log:** every status change is also stored as one line: spot, from, to, who did it (customer, receptionist, barber, or system) and the time. It powers "Finished today" and settles any "who came first?" dispute.

## 4. Statuses and allowed moves

```
              (join)
                │
                ▼
          ┌─────────┐   Call next    ┌────────┐   Start    ┌──────────┐   Done   ┌──────┐
          │ Waiting │ ─────────────► │ Called │ ─────────► │ In chair │ ───────► │ Done │
          └─────────┘                └────────┘            └──────────┘          └──────┘
              │                          │
              │ Cancel                   │ No-show (after the time limit)
              ▼                          ▼
        ┌───────────┐              ┌─────────┐
        │ Cancelled │              │ No-show │
        └───────────┘              └─────────┘
```

| From | To | Who | Condition |
|---|---|---|---|
| (none) | Waiting | Customer (online) or receptionist (walk-in) | Joining rules, section 5 |
| Waiting | Called | Receptionist, **Call next** | Call-next rules, section 7 |
| Waiting | Cancelled | Customer or receptionist | Only while Waiting |
| Called | In chair | The assigned barber, **Start** | — |
| Called | No-show | Receptionist, **No-show** | At least `NO_SHOW_AFTER_MINUTES` since `calledAt` |
| In chair | Done | The assigned barber, **Done** | — |
| Waiting / Called / In chair | Cancelled (`day-ended`) | The system | A new day started (section 12) |

**Hard rules**
- **Never backwards.** Any move not in the table is refused by the server, even if a screen allowed the tap. That includes Called → Waiting, Called → Cancelled, In chair → Cancelled, Waiting → No-show, and anything from a final spot.
- Final spots never change. A customer who returns gets a **new spot** with a **new token**.
- The server checks **who** is asking: a barber can only Start or Done their own customer; a customer can only cancel their own Waiting spot; Call next, No-show and reception Cancel need a staff session.

## 5. Joining (online and walk-in)

### 5.1 Validation (the server re-checks everything the screen checks)

| Field | Rule |
|---|---|
| Name | Required, 2–40 characters after trimming spaces. Any language |
| Phone | Required, exactly 10 digits after removing spaces and dashes |
| Services | 1 to `MAX_SERVICES`, no duplicates, every one currently switched **on** |
| Preference | "Any", or a barber who is **on duty** today. A barber On break is allowed |

**Totals.** `totalMinutes` = sum of chosen services' minutes; `totalPrice` = sum of prices. Example: Haircut (30 min, ₹150) + Beard trim (15 min, ₹80) = **45 min, ₹230**.

### 5.2 One active spot per phone number

- If the phone already has an **active** spot, **no new spot is created**.
  - Online: the customer is shown that spot ("You already have a spot: S-14").
  - Walk-in: reception sees "This phone already has an active spot: S-14 (Kunal)".
- A phone whose last spot is final (Done, Cancelled, No-show) may join again.
- The check and the creation happen as **one atomic step** on the server, so two taps or two devices at the same instant cannot create two spots.
- **Double-tap protection:** each Confirm carries a one-time request id; repeating the same request id returns the same spot, never a second one.
- Duplicate detection uses `HMAC-SHA256(PHONE_HMAC_SECRET, normalized_phone)`.
- `PHONE_HMAC_SECRET` is generated and stored only in the server/Supabase secret manager.
- The raw normalized phone may be retained for the private staff workflow, but the HMAC is the indexed lookup key.
- The HMAC secret is never exposed to `VITE_*`, logs, RLS policies visible to clients or browser code.

### 5.3 When online joining is allowed

Checked on the Join screen **and again on the server**. The first failing condition below decides the message, in this order:

| # | Condition for online joining | If it fails, show |
|---|---|---|
| 1 | At least one barber is on duty today | "No barbers are available today." |
| 2 | The owner's switch is **Open** | "Online queue is closed right now. Please walk in or ask at reception." |
| 3 | Server time is earlier than **closing time − `ONLINE_CLOSE_BEFORE_MINUTES`** | "Online joining has closed for today. Walk-ins are welcome until {closing time}." |

- Customers already in the queue are never affected by closing. They are still served.
- **Walk-ins** added by reception ignore conditions 2 and 3. They still need condition 1 (nobody can be served with no barber on duty), so with none on duty the walk-in form shows "No barbers on duty today."
- Joins are limited to `JOIN_ATTEMPTS_PER_MINUTE` per device; beyond that the customer sees "Too many tries. Please wait a minute."

### 5.4 Tokens

- `S-1`, `S-2`, … counting up. Online customers and walk-ins share **one counter**.
- The counter restarts at S-1 on each new day and a token is **never reused** on the same day, even after a cancel or no-show.
- A returning customer (after cancel, no-show or done) always gets a new token.

## 6. Order and position

- **First come, first served.** Order is by `joinedAt`, earliest first. If two have the same time, the lower token number is first. Online customers and walk-ins are in one queue.
- **Position** = rank among **Waiting** spots (1st, 2nd, …). Called and In chair spots are not counted.
- Position is global, even for customers who chose a barber. A customer 4th in line who chose Ravi may be called before the 2nd customer who chose Amit if Ravi frees up first. This is correct.
- Position improves only when someone ahead is called, cancelled, or the day ends. It never gets worse for an existing spot.
- **Banners on My Status** (Waiting only): position 1 → "You're next!"; position `START_COMING_POSITION` (2) → "Start coming to the salon". Position 1 takes priority over 2 when both apply to one customer over time; there is never more than one banner.

## 7. Choosing who is next (Call next)

Reception taps **Call next on a barber's card**. The system, not the receptionist, picks the customer.

### 7.1 Who is eligible for barber X?

A spot that is **Waiting** and whose preference is **X** or **Any**.

**[P1 · U1]** For preference **Any**, the spot is eligible for X only if X **offers all of the spot's services**. A spot whose preference is X was already checked at joining.

### 7.2 The "next candidate"

The **eligible spot with the earliest `joinedAt`** (ties: lower token). It is the same function everywhere:
- Reception card line "Next: S-15 Kunal"
- Barber View "Next for you"
- What Call next would actually call

It is calculated **ignoring** the barber's own state (so a Busy barber still shows who is next for them). If none exists: "No customer waiting for {barber}".

### 7.3 When can Call next be pressed?

All must be true; otherwise the button is disabled. Show the first failing reason, in this order:

| # | Condition | Reason shown under the button |
|---|---|---|
| 1 | The barber is on duty today | (the card isn't shown at all if off duty) |
| 2 | The barber is **not** On break | "On break" |
| 3 | The barber has **no** customer Called or In chair (**one at a time**) | "Busy" |
| 4 | There is a next candidate | "No customer for {barber}" |

### 7.4 What Call next does

1. The next candidate becomes **Called**, `assignedBarber` = X, `calledAt` = now.
2. All other screens update within `SYNC_MAX_SECONDS`: the customer's phone shows the full-screen takeover, the TV shows the call banner, the barber sees the Called customer, the reception card changes.
3. The server does this as **one atomic step**. If two staff devices call at the same instant, one wins and the other receives "already called" (shown as the toast "S-14 was already called. List refreshed.").

**Consequences that must always hold**
- A customer who chose Ravi is **never** given to another barber.
- A customer who chose Any is given to whichever (capable) barber is called first.
- A customer skipped because they chose another barber **keeps their place**, and is still ahead of later customers for their own barber.
- There is **no undo** for Call next. A mistaken call is resolved with the no-show path.

## 8. Waiting-time estimate

### 8.1 The rule

```
workAhead = ( total minutes of every Waiting spot ahead of this customer )
          + ( for each Called spot:   its full total minutes )
          + ( for each In chair spot: max(0, total minutes − minutes since Start) )

wait = workAhead ÷ (number of working barbers),  rounded UP to the next 5 minutes
```

- The customer's **own** services are **not** included. The estimate is the time until their turn starts.
- "Ahead of this customer" means Waiting spots with an earlier place in the order. For a hypothetical new joiner (Home, Join summary) that means **every** Waiting spot.
- A Busy barber's customer is counted once, in the Called or In chair lines.
- Barbers who are On break or off duty are not counted. A barber On break cannot have a Called or In chair customer, so nothing is double counted.
- The estimate is an **approximation** and always shown with "about".
- It is recalculated every time data refreshes, so it falls as people finish.

### 8.2 Special cases

| Situation | Result |
|---|---|
| Nobody Waiting ahead **and** at least one working barber is **Free** | **"No wait"** (never "0 min") |
| Nobody Waiting ahead, all working barbers Busy | The formula gives the number (this is "you'd be next" on Home) |
| No working barber (all On break), at least one on duty | No number: "Waiting for a barber to be available" |
| Nobody on duty | Home: "No barbers are available today." |
| Someone is ahead and `workAhead` is more than 0 | The estimate is **never** shown as 0; the smallest value shown is 5 min |

**[P1 · U1]** "Working barbers" for the **"No wait"** test and the "Waiting for a barber" test means working barbers **who could serve this customer** (offer all their services; or the barber they chose). If there are none, show "Waiting for a barber to be available". The divisor in the formula stays the number of **all** working barbers (kept simple on purpose; the display is "about").

### 8.3 Where the estimate is used

| Place | For whom |
|---|---|
| Home live card | A hypothetical new joiner (nobody's own services counted) |
| Join summary "Expected wait" | A new joiner if they joined right now |
| My Status ring and text | That customer |
| TV "Up next" | Each of the next 5 tokens separately (only the Waiting spots ahead of each, plus Called and In chair work) |
| Add walk-in summary | A new joiner |

### 8.4 Display formats

- Rounded up to `WAIT_ROUND_TO_MINUTES`: 43.3 → 45; 48.3 → 50.
- Under 60 min: "about 45 min". 60 min or more: "about 1 h 15 min".
- **Ring fill** on My Status = `1 − (current estimate ÷ initialEstimate)`, kept between 0 and 1. If `initialEstimate` was 0, show the ring full.
- Progress bar on a barber card (In chair) = minutes since Start ÷ total minutes of that spot, capped at 100%. Past 100%: "Over by N min".

### 8.5 Worked examples (these are tests)

All durations are the planned minutes of each spot.

| # | Situation | workAhead | Barbers | Result |
|---|---|---|---|---|
| E1 | Ravi In chair (30 min, 20 elapsed → **10** left). Amit Called (**45**). Imran In chair (15 min, 5 elapsed → **10** left). Waiting: S-12 (30), S-13 (45), S-14 (15) = **90**. New joiner | 90 + 45 + 10 + 10 = **155** | 3 | 51.7 → **about 55 min** |
| E2 | Imran On break (no customer). Ravi 10 left, Amit Called 45, Waiting 90. New joiner | 90 + 45 + 10 = **145** | 2 | 72.5 → **about 1 h 15 min** |
| E3 | All three barbers In chair and over time (0 left). Three Waiting of 15 min each | **45** | 3 | **about 15 min** |
| E4 | All three In chair and over time. One Waiting of 15 min | **15** | 3 | 5 → **about 5 min** (never 0) |
| E5 | Nobody Waiting, Amit is Free | 0 | 3 | **No wait** |
| E6 | Nobody Waiting. Ravi 10 left, Amit 20 left, Imran 30 left (all Busy) | **60** | 3 | **about 20 min** with "No one waiting · you'd be next" |
| E7 | Everyone On break, 2 people Waiting | — | 0 | "Waiting for a barber to be available" |
| E8 | workAhead 130 minutes | 130 | 3 | 43.3 → **about 45 min** |
| E9 | Position check: Waiting queue S-12, S-13, S-14, S-15 | — | — | S-12 is 1st, S-14 is 3rd. Called and In chair spots never count |

### 8.6 [P1 · U2] Learned wait time

Planned minutes are guesses. Once real times exist, the **estimate** (and only the estimate) uses them.

1. **Actual time of a finished spot** = `finishedAt − startedAt`, for spots that finished **Done today**.
2. **Outlier filter:** ignore a spot whose actual time is below `LEARN_OUTLIER_LOW` × its planned total or above `LEARN_OUTLIER_HIGH` × its planned total (for example a barber who forgot to tap Done).
3. **Per-service actual:** a spot's actual time is shared out across its services **in proportion to their planned minutes**. Example: Haircut 30 + Beard trim 15, actual 36 min → Haircut 24, Beard trim 12.
4. For each service, the **learned minutes** = the average of its per-service actual times over the most recent `LEARN_WINDOW` qualifying spots **today**, **if there are at least `LEARN_MIN_SAMPLES`**; otherwise its **planned** minutes.
5. In the formula of 8.1, each Waiting and Called spot's minutes are the sum of the **learned minutes** of its services. In chair spots use learned total minus time since Start (not below 0).
6. **Unchanged by U2:** the totals shown on Join ("Total 45 min · ₹230"), the quote stored in the spot, the barber's progress bar (planned), and prices. Only the *waiting estimate* changes.
7. Owner Settings shows "Planned 30 min · Actual today 27 min (8 customers)" per service, or "not enough data yet". Learned values start fresh each day.

## 9. Cancel and no-show

**Cancel**
- Only while **Waiting**; by the customer (with a confirm dialog) or by reception (with a confirm dialog).
- The spot becomes Cancelled and leaves Reception's queue, the TV, and the barbers' "Next". Everyone behind moves up one position.
- It appears under "Finished today". The customer can join again with a new token at the end.
- A **Called** customer cannot be cancelled by anyone. If they tell reception they are not coming, reception waits for the no-show time and marks No-show.

**No-show**
- Applies to **Called** spots only.
- The **No-show** button is disabled until `NO_SHOW_AFTER_MINUTES` have passed since `calledAt`, and meanwhile shows the countdown "No-show in 6:40".
- Marking No-show makes the barber **Free** immediately and closes the spot as No-show.
- If the customer arrives later, reception adds them with **Add walk-in** (same phone is allowed because the old spot is final): they get a **new token at the end** of the queue, not their old place. The customer may also rejoin online if joining is open.
- The customer's page then shows the No-show message with "Join again".

## 10. Barber breaks, duty and skills

**On break**
- A barber can go On break only with **no Called or In chair customer** (toggle disabled with "Finish your current customer first.").
- While On break: Call next is disabled ("On break"); they are not counted as a working barber; customers who chose them stay in place and see "{barber} is on break"; the TV shows "On break".
- When the barber turns Available, the notice disappears and Call next works again.
- A customer may still **join** choosing a barber who is On break (the Join card says "On break — your wait may be longer.").

**On duty today** (Owner Settings)
- A barber can be switched **off** only if **both**: no **Waiting** spot has chosen them as preference, and they have no **Called or In chair** customer. Otherwise the toggle is disabled with "{barber} still has customers. Finish or cancel them first."
- **[P1 · U1]** Also refused if switching them off would leave any Waiting spot with **no on-duty barber able to serve it** (message: "Some waiting customers need {barber}.").
- All barbers are on duty again at the start of each day (section 12).

**[P1 · U1] Skills**
- The owner marks which services each barber offers. Each barber must offer at least one service.
- A skill can be removed from a barber only if no active spot assigned to or waiting for that barber would be left unservable (same check as above).
- A new service starts with **no** barber offering it until the owner ticks one. Until then the Join screen shows a warning on the owner's page and customers can't complete a join for that service (the "no barber offers this combination" message).
- The Join and Add-walk-in screens disable barbers who don't offer all selected services and change the "Any" label (see `02-screens.md`).

## 11. [P1 · U3] "I'm on my way"

- Offered only while a spot is **Waiting** and its position is 1 or 2.
- The customer picks 10, 20 or 30 minutes. This records `onMyWay = {minutes, setAt}`.
- **It never changes** the customer's position, the order, or any rule above. It is information for reception only.
- Reception shows the chip "On the way · N min" where N counts **down** from the chosen minutes (rounded up to a whole minute). At 0 it changes to "Should be here".
- The customer can **Change** it (choose another time) or **Not coming** (clears it, and reception's chip disappears). Clearing is never treated as a cancel.
- It is cleared automatically when the spot leaves Waiting.
- It does not shorten or lengthen the no-show time.

## 12. Days, closing and resets

- A "day" is an India calendar date. Nothing needs to run at midnight: the first request of a new day triggers the reset (a lazy reset).
- **At the start of a new day:**
  - Any spot still Waiting, Called or In chair from an earlier day is closed as Cancelled (`day-ended`).
  - The token counter restarts at 1.
  - All barbers are switched **on duty** and all breaks are cleared.
  - The owner's **Online joining switch resets to Closed**. The owner opens it each morning. (A safe default: forgetting means no online joins, never joins in the middle of the night.)
  - Stats start from zero.
  - **Kept:** services, prices, closing time, salon name, and **[P1 · U1]** barber skills.
  - **[P1 · U3]** Any `onMyWay` is cleared.
- **Closing time** is a time on the current day (default 9:00 PM). If the owner sets it earlier than the current time, online joining is immediately closed by condition 3 in section 5.3.
- Stats count only **today's** records.

> **Testing note.** The online-closing rules mean a demo at night (after the closing time minus 30 minutes) will show Join as closed. Before testing or recording a demo, open `/admin`, switch **Online joining** to **Open** and set the **closing time** to a later hour.

**Demo mode (deployed demo only).** A marker may open the live link on any day and at any hour, and the app must still be usable with no setup. So the deployment can run with the environment flag `DEMO_MODE=true`. When it is on, **only these two things change**:
1. Condition 3 in section 5.3 (the closing-time cutoff) is **not applied**. Conditions 1 and 2 still are.
2. The day reset **does not** switch Online joining to Closed; the switch keeps whatever the owner last set.

Everything else (all statuses, Call next, estimates, validation, PIN, sync) behaves exactly as written. The Owner screen shows a small "Demo" tag when it is on, and the README says so. Demo mode is off in normal use and never changes any rule's logic, only whether those two time-based closings are enforced.

**Historical retention and recovery**
- Final spots remain stored for 30 days from `finishedAt`, or from the timestamp set when the day system closes a spot.
- Active spots are never deleted by retention.
- Recovery links expire 10 minutes after creation, are single-use and require staff-assisted in-person verification.
- A recovery link contains only a random high-entropy token. The database stores only its digest, expiry and one-time-used timestamp.
- The recovery token is not placed in customer status URLs.
- Expired or used recovery links are refused and never reveal another customer's spot.

## 13. Owner settings rules

**Services**
- Names in English and Gujarati are both required.
- Minutes: whole number from `SERVICE_MIN_MINUTES` to `SERVICE_MAX_MINUTES` (5–180) in steps of 5. Price: whole rupees, 0 or more.
- Switching a service off hides it from Join and Add walk-in only. Existing spots keep it.
- Editing minutes or price affects only customers who join **after** the change.
- At least one service must stay on ("At least one service must stay on.").
- Services are never deleted, only switched off.

**Stats (today, from server data)**
- **Customers served:** spots that became Done today.
- **Average wait:** the average of `startedAt − joinedAt` over spots that became Done today, in whole minutes (nearest minute). No Done spots → "–".
- **No-shows:** spots that became No-show today.
- Cancelled spots are not counted in these three cards.

**[P1 · U4] Owner insights**
- **Customers per hour:** the number of spots that **joined** in each hour (any final or active status except `day-ended`).
- **Average wait per hour:** the average `startedAt − joinedAt` for spots that joined in that hour and have started.
- Windows: **Today**, **Last 7 days** (hourly averages across those days). Hours with no data are shown empty, not as zero wait.

## 14. Staff access and who sees what

**Supabase architecture**
- PostgreSQL RPC functions are the only supported mutations for joins and queue moves.
- Public reads use public-safe views/projections. Direct public writes to queue tables are prohibited.
- Supabase Realtime only publishes public-safe projections or private customer events scoped to the matching capability.
- The service-role key is server-only and is never sent to the frontend or placed in `VITE_*` environment variables.

**PIN and sessions**
- The PIN is checked **on the server**. A correct PIN gives a staff session for the browser tab. No staff screen loads staff data without it.
- After `PIN_MAX_TRIES` wrong tries in a row from one device, that device is locked for `PIN_LOCK_SECONDS`, with a visible countdown.
- Staff actions (Call next, No-show, reception Cancel, Add walk-in, Start, Done, Break, all Owner Settings) are refused without a valid session.
- Staff sessions expire after at most 12 hours, are individually revocable, and every staff RPC validates the session, role and expiry before mutation.
- Staff JWT issuance is server-only. Supabase JWT claims identify role/session; RLS and RPC verify the corresponding server-side staff-session record.

**Visibility**

| Information | Customer's own status page | TV and Home | Staff screens |
|---|---|---|---|
| Customer name | Own only | **Never** | Yes |
| Customer phone | Own only | **Never** | Yes (Reception) |
| Token numbers | Own only | Yes (tokens only) | Yes |
| Barber names and states | Yes | Yes | Yes |
| Other customers' details | **Never** | **Never** | Yes |

- The customer's link works from the random spot id only. Nothing about other customers can be reached from it.
- Personal details are never put in URLs, TV content, or error messages.
- Customer private access uses a random spot ID plus a separate random capability. The capability is stored privately on the customer's device and is never put in a URL.
- A customer can read/cancel only the matching capability-owned spot. Possession of the spot ID alone is insufficient.

## 15. Keeping screens in sync

**Strict FCFS implementation requirement**
- Call Next serializes selection for the whole queue, so two concurrent Reception requests cannot allow a later eligible customer to bypass an earlier eligible customer.
- PostgreSQL uses one transaction and a queue-wide serialization/advisory lock for the candidate decision, not only a barber-row lock.
- `SKIP LOCKED` is prohibited for Call Next candidate selection because it may skip an earlier eligible Waiting spot that is locked or temporarily changing.
- A second Call Next request for the same barber waits or gets the barber-busy result after the first transaction commits.

- Any change (join, call, start, done, cancel, no-show, break, settings, **[P1 · U3]** on my way) must be visible on every other screen within `SYNC_MAX_SECONDS`, without refreshing.
- Any approach that meets this is fine (for example polling every 2–3 seconds, or a hosted realtime database). **Before using it, the agent must explain the choice in 3 lines and wait for approval.**
- The **server** is the only judge of moves. A screen never decides alone, and always shows what the server last said.
- **Two devices acting at once:** the server accepts the first action and answers the second with the current state. The second screen refreshes and shows a short toast.
- **Connection lost:** screens keep their last data and show the connection banner; staff action buttons disable (with the line "Waiting for connection") instead of silently failing.

**Rule errors and what the customer or staff sees**

| Server answer | Shown as |
|---|---|
| Queue closed (any of the three conditions) | The matching message in section 5.3 |
| Phone already has an active spot | "You already have a spot: {token}" (online) / "This phone already has an active spot: {token} ({name})" (walk-in) |
| Customer already called | Toast "{token} was already called. List refreshed." |
| Barber busy, on break, or nobody eligible | The reason under Call next (section 7.3) |
| Move not allowed | Toast "That can't be done right now." and a refresh |
| No-show too early | The disabled button with its countdown |
| Wrong PIN / locked | "Wrong PIN. Try again." / the lock countdown |
| Too many joins | "Too many tries. Please wait a minute." |

## 16. Flows

### Flow A — Remote customer
1. Scans the QR code. Home shows "6 people waiting · about 50 min". Taps **Join Queue**, picks Haircut and "Any barber". Summary: "45 min · ₹230 · about 35 min wait". Confirm → token **S-14**, "4th in line".
2. Watches **My Status**. At position 2: "Start coming to the salon". **[P1 · U3]** She taps **On my way · 20 min**. At position 1: "You're next!".
3. Reception taps **Call next** on Amit's card → S-14 is **Called**, assigned to Amit.
4. Within 5 seconds: her phone shows the gold "It's your turn! Go to Amit", the TV shows "S-14 → Amit" with a chime.
5. She arrives. Amit taps **Start** (In chair), then **Done** (after a confirm) → Done. The stats update.

### Flow B — Walk-in
Reception taps **+ Add walk-in**, enters name, phone, services and barber preference (default Any). The customer gets the next token and joins the **end** of the same queue. From there it is Flow A steps 3–5 (told in person, and the TV shows the token).

### Flow C — No-show and re-add
1. S-14 is Called for Amit and doesn't arrive.
2. After 10 minutes the **No-show** button activates. Reception confirms → S-14 is No-show, Amit is Free.
3. Later the customer appears. Reception adds them with **Add walk-in** (same phone is allowed) → new token (for example S-31) at the end.

### Flow D — Customer cancels
**Cancel my spot** on My Status, confirm → Cancelled. Everyone behind moves up. The customer can join again later.

### Flow E — Barber break
The barber finishes the customer (Done), switches **On break**. Customers who chose them see "{barber} is on break". Reception can't call for them. The barber switches back to Available and normal service resumes.

### Flow F — Opening and closing the day
1. Morning: owner opens `/admin`, switches **Online joining** to Open, checks barbers on duty and the closing time.
2. At closing time − 30 min: online joining closes automatically; Home shows the closing message. Reception can still add walk-ins.
3. The next day the day reset applies (section 12).

## 17. Edge cases

| Situation | Expected behaviour |
|---|---|
| Customer double-taps Confirm | One spot only |
| Same phone joins on a second device | The existing spot is shown, no duplicate |
| Customer closes the page and returns via the link | The same status |
| Called customer's phone is offline | Nothing special; reception can mark No-show after the time limit |
| Reception taps Call next but the barber is Busy | Button disabled; the server also refuses |
| Only customers who chose Ravi are waiting and Ravi is On break | Other barbers' Call next shows "No customer for {barber}" |
| All barbers On break while people wait | Positions kept; estimates show "Waiting for a barber…" |
| Owner switches a service off while it is in someone's spot | The spot is unchanged |
| Owner changes a price while customers wait | Only new joiners pay the new price |
| Two tablets tap Call next together | One succeeds, the other sees "already called" and refreshes |
| Online queue closes while a customer fills the Join form | Confirm refused with the message; data kept |
| Barber taps Done on the wrong customer | No undo; a confirm dialog guards it. Owner can see the move log |
| Barber forgets to tap Done | The spot stays In chair (showing "Over by N min") until Done is tapped. **[P1 · U2]** the outlier filter keeps it out of learned times |
| Barber taps Start but the customer hasn't arrived | Not prevented (no rule can know). Their phone shows In chair |
| Network drops briefly | Banner shown, old data kept, recovers by itself |
| Customer cancels at the exact moment reception calls them | The server accepts whichever arrives first; the other is refused and refreshed |
| Server restarts | Spots, tokens and statuses are still there (they are stored, not held only in memory) |
| Phone number has letters, spaces, dashes | Spaces and dashes removed; letters rejected |
| Name in Gujarati | Accepted and shown as typed |

## 18. Hand-test scenarios

Each starts with Ravi, Amit and Imran on duty, Free, and an empty queue. Use dummy customers. Set `NO_SHOW_AFTER_MINUTES` to 0 or 1 for the no-show scenarios.

**Scenario 1 — Preference is respected**
Add in order: S-1 Kunal (chose **Ravi**), S-2 Meera (**Any**), S-3 Dev (chose **Amit**).
1. Call next on **Amit** → must call **S-2** (S-1 is Ravi's; S-2 is the earliest eligible).
2. Call next on **Imran** → disabled "No customer for Imran".
3. Call next on **Ravi** → must call **S-1**.
4. Amit taps Start then Done on S-2; Call next on Amit → must call **S-3**.

**Scenario 2 — Barber on break**
Add S-1 (chose Ravi), S-2 (Any). Ravi switches On break.
1. Call next on **Amit** → must call **S-2**, not S-1. S-1's page shows "Ravi is on break".
2. Ravi switches Available. Call next on Ravi → **S-1**.

**Scenario 3 — First come, first served beats being specific**
Add S-1 (Any), S-2 (chose Ravi), S-3 (Any).
1. Call next on **Ravi** → **S-1** (earliest eligible).
2. Call next on **Amit** → **S-3** (S-2 wants Ravi).

**Scenario 4 — No-show and re-add**
Add S-1 (Any). Call next on Amit → S-1 Called. Wait for the (test) no-show time. Mark No-show → Amit Free. Add walk-in with S-1's phone → new token **S-2** at the end. "Finished today" lists S-1 as No-show.

**Scenario 5 — Closing**
Switch Online joining to Closed. Home and `/join` show the closed message; a direct join is refused by the server. Add a walk-in at reception → it works.

**Scenario 6 — Wait estimate**
Recreate example E1 and E2 from section 8.5 and confirm the estimates "about 55 min" and "about 1 h 15 min".

**[P1 · U1] Scenario 7 — Skills**
Ravi and Amit offer Haircut and Beard trim. Only Imran also offers Hair spa. Add S-1 (Hair spa, **Any**).
1. Call next on **Ravi** → disabled "No customer for Ravi".
2. Call next on **Imran** → calls **S-1**.
3. Imran On break, add S-2 (Hair spa, Any) → S-2's page shows "Waiting for a barber to be available".

**[P1 · U3] Scenario 8 — On my way**
S-3 is 2nd in line, taps "On my way · 10 min". Reception shows "On the way · 10 min" counting down, then "Should be here". Order is unchanged. Tapping "Not coming" removes the chip.

## 19. Test checklist

Tick each item and write how you checked it. **All P0 items must pass.** P1 items only for upgrades that were built.

**Joining**
- [ ] J1. Haircut + Beard trim → **45 min, ₹230**.
- [ ] J2. The 4th service can't be chosen.
- [ ] J3. Phone with fewer or more than 10 digits, or letters → inline error, nothing saved. Spaces and dashes are accepted and removed.
- [ ] J4. Same phone joins twice (online, then again; and as a walk-in) → the existing spot is shown, no duplicate.
- [ ] J5. "Any barber" is default; a chosen barber is saved and visible on Reception.
- [ ] J6. Owner switch Closed → Join disabled with the message on Home and `/join`; the server refuses a join anyway.
- [ ] J7. Within 30 minutes of closing → Join disabled with the time message; reception can still add a walk-in.
- [ ] J8. A service switched off disappears from Join; a customer already holding it keeps it.
- [ ] J9. Double-tapping Confirm creates one spot only.
- [ ] J10. Message order in 5.3 is respected (no barbers → switch → time).
- [ ] J11. With no barber on duty, the walk-in form shows "No barbers on duty today."
- [ ] J12. Tokens count up, are shared by online and walk-ins, and are never reused in a day.

**Order and Call next**
- [ ] C1. Scenarios 1, 2 and 3 give the stated results exactly.
- [ ] C2. Call next is disabled with the right reason in the right order: On break, then Busy, then No customer.
- [ ] C3. "Next:" on the reception card and "Next for you" on the barber's phone agree.
- [ ] C4. Two reception windows tapping Call next together never call the same customer twice.
- [ ] C5. A customer who chose Ravi is never assigned to anyone else (try every combination in scenarios).
- [ ] C6. A walk-in joins at the end of the queue.

**My Status**
- [ ] S1. Token and position are right; positions improve when someone ahead leaves.
- [ ] S2. Position 2 → "Start coming to the salon"; position 1 → "You're next!"; only one banner at a time.
- [ ] S3. Call next → the full-screen takeover shows within **5 seconds** with the right barber and no cancel button.
- [ ] S4. Cancel asks for confirmation; after it, the spot leaves Reception and TV and others move up.
- [ ] S5. Reloading or reopening the link shows the same spot.
- [ ] S6. A chosen barber On break → "{barber} is on break" appears and disappears when they return.
- [ ] S7. The estimate drops as customers finish, and is never "0 min" while someone is ahead.
- [ ] S8. Invalid spot id → "We couldn't find this spot."
- [ ] S9. Done, Cancelled and No-show each show their message and **Join again**.
- [ ] S10. The ring fills as the estimate shrinks (never negative, never above full).

**Estimate**
- [ ] W1. Examples E1–E9 in section 8.5 all give the stated results.
- [ ] W2. Home shows all five live-card variants correctly (normal, walk right in, you'd be next, all on break, none on duty).
- [ ] W3. TV "Up next" estimates differ per token and match the rule for each.

**No-show and cancel**
- [ ] N1. No-show is disabled before the time limit with a countdown, then works; the barber becomes Free.
- [ ] N2. Scenario 4: re-added customer is at the **end** with a **new token**.
- [ ] N3. A Called customer cannot be cancelled by anyone.
- [ ] N4. Waiting over 60 minutes → amber, ⚠ and bold minutes on Reception.

**Barber**
- [ ] B1. Start and Done update Reception, TV and the customer's phone within 5 seconds.
- [ ] B2. Start works only for a Called customer, Done only for an In chair customer; Done asks for confirmation.
- [ ] B3. On break is blocked while a customer is Called or In chair; once on break, Reception, Home and TV show it.
- [ ] B4. A barber cannot Start or Done another barber's customer.
- [ ] B5. Unknown barber name and off-duty barber show their messages.

**TV**
- [ ] T1. One row per on-duty barber and the next 5 tokens with estimates; "+N more waiting" appears when needed.
- [ ] T2. "for {barber}" appears only for customers who chose a barber.
- [ ] T3. The call banner flashes with a chime; multiple calls show one after another.
- [ ] T4. "Tap to turn on sound" appears until tapped.
- [ ] T5. **No names or phone numbers** anywhere on the TV.
- [ ] T6. The QR code opens the join page from a phone; when online joining is closed, it is replaced.

**Owner**
- [ ] A1. Editing price or minutes affects only new joiners.
- [ ] A2. The last service can't be switched off; a barber with customers can't be switched off.
- [ ] A3. Stats: finish two customers (waits 10 and 20 min) and mark one no-show → "served 2, average wait 15 min, no-shows 1".
- [ ] A4. Service form validation: minutes 5–180 in steps of 5; both names required.
- [ ] A5. After a day change: counter restarts, barbers all on duty, online joining Closed, leftover spots closed.

**Whole system**
- [ ] X1. Phone, tablet and TV windows stay in sync (changes visible within 5 seconds).
- [ ] X2. Wrong PIN is refused; after 5 wrong tries a 30-second lock shows a countdown; staff data is not visible before unlocking; staff actions are refused without a session.
- [ ] X3. Disconnecting the network shows the banner, keeps old data, disables staff buttons, and recovers by itself.
- [ ] X4. Language toggle changes every label on every screen; nothing overflows in Gujarati; the choice survives reload.
- [ ] X5. Every phone tap target is at least 44 px.
- [ ] X6. Opening any URL directly (refresh, shared link) works on the deployed site.
- [ ] X7. The live link opens the working app on a phone with no setup, **at any hour and on any day** (demo mode on), and the README shows the test PIN. With demo mode off, the closing-time cutoff and the nightly Closed reset apply as in sections 5.3 and 12.
- [ ] X8. Customers cannot see other customers' details through any URL or screen.

**[P1 · U1]**
- [ ] U1a. Scenario 7 passes.
- [ ] U1b. Join and walk-in forms disable barbers who can't do all selected services, and the "Any" label changes.
- [ ] U1c. A skill removal or off-duty switch that would strand a waiting customer is refused with the message.

**[P1 · U2]**
- [ ] U2a. With fewer than 3 finished samples, the planned minutes are used; with 3 or more, estimates use averages.
- [ ] U2b. A spot that took more than 3× planned is ignored for learning.
- [ ] U2c. Join totals and prices still show planned values.

**[P1 · U3]**
- [ ] U3a. The card appears only at positions 1 and 2; Scenario 8 passes.
- [ ] U3b. "On my way" never changes position or order.

**[P1 · U4]**
- [ ] U4a. Hourly charts match the recorded data; empty hours show as empty.
