# Supabase Architecture — Salon Queue Management

**Status:** Proposed architecture for approval

This document describes the implementation target for Supabase. It does not change queue rules in `src/rules/`; PostgreSQL RPC implementations must match those rules.

## 1. Platform and trust boundaries

- Frontend: React + Vite on Vercel.
- Database: Supabase PostgreSQL.
- Realtime: Supabase Realtime.
- Queue mutations: PostgreSQL functions/RPC.
- Staff authentication: server-issued custom staff JWT plus a server-side staff-session record.
- Recovery: staff-assisted QR/recovery RPC.
- Express: not required unless a later implementation review proves one is necessary.

Postgres is the only authority for joins, moves and shared token generation. The browser never directly writes active queue tables.

## 2. PostgreSQL tables

### `salon_settings`

One salon-settings row:

- `id`
- `salon_name_en`
- `salon_name_gu`
- `closing_time`
- `online_joining_open`
- `demo_mode`
- `updated_at`

### `services`

- `id`
- `name_en`
- `name_gu`
- `duration_minutes`
- `price_rupees`
- `enabled`
- `created_at`
- `updated_at`

Constraints:

- `duration_minutes` from 5–180 in steps of 5.
- `price_rupees >= 0`.
- Both localized names are required.
- Services are disabled, never deleted.

### `barbers`

- `id`
- `name`
- `on_duty_today`
- `on_break`
- `updated_at`

### `barber_services`

P1/U1 only:

- `barber_id`
- `service_id`

Unique `(barber_id, service_id)`, with foreign keys and no deletion of an in-use skill without server validation.

### `spots`

- `id` UUID random
- `day` India calendar date
- `token`
- `token_text`
- `name`
- `phone`
- `phone_hmac`
- `customer_capability_hash`
- `services_snapshot` JSONB or normalized `spot_services`
- `total_minutes`
- `total_price`
- `preference_barber_id` or `Any`
- `assigned_barber_id`
- `status`
- `source`
- `joined_at`
- `called_at`
- `started_at`
- `finished_at`
- `initial_estimate`
- `end_reason`
- `on_my_way` JSONB P1/U3 only
- `join_request_id`

Constraints:

- Status only `Waiting`, `Called`, `In chair`, `Done`, `Cancelled`, `No-show`.
- Unique `(day, token)`.
- Unique `join_request_id`.
- Active duplicate protection is enforced by a partial unique index on `phone_hmac` where status is Waiting, Called or In chair.
- `finished_at` is required for terminal statuses.
- Active status must have no terminal `finished_at`.

### `spot_services`

Optional normalized snapshot:

- `spot_id`
- `service_id`
- `name_en`
- `name_gu`
- `duration_minutes`
- `price_rupees`

Unique `(spot_id, service_id)`. The snapshot remains unchanged after owner edits.

### `move_log`

Append-only:

- `id`
- `spot_id`
- `from_status`
- `to_status`
- `actor_type`
- `actor_id`
- `created_at`

No update/delete RPC is allowed.

### `day_counters`

- `day` primary key
- `next_token`

The row is locked or incremented atomically when joining.

### `staff_sessions`

- `id`
- `session_token_hash`
- `role`
- `staff_name`
- `expires_at`
- `revoked_at`
- `wrong_attempt_count`
- `locked_until`
- `created_at`
- `last_used_at`

### `recovery_links`

- `id`
- `spot_id`
- `token_hash`
- `expires_at`
- `used_at`
- `created_by_staff_session_id`
- `in_person_verified_at`

### `join_attempts`

- Device/IP/RPC key
- First/last attempt time
- Attempt count
- Lock/reset time

### `public_queue_state`

Public-safe projection:

- `day`
- `online_joining_open`
- Waiting count
- Working/available barber states
- Estimated wait
- Token and barber public fields

No customer name or phone.

### `public_spot_state`

Public-safe projection:

- Random spot ID
- Token
- Status
- Assigned barber
- Position
- Estimate
- No name or phone

The customer capability is stored separately and never included in public projections or URLs.

## 3. Required indexes

- Partial unique phone HMAC index for active spots.
- Unique `(day, token)`.
- Unique `join_request_id`.
- `(day, status, joined_at, token)` for FCFS and position queries.
- `(status, assigned_barber_id, joined_at, token)` for Call Next candidates.
- `(barber_id, on_duty_today, on_break)`.
- `(finished_at, status)` for 30-day cleanup.
- `(phone_hmac, day, status)` for duplicate and recovery lookup support.
- `(spot_id, created_at)` on move log.
- `(expires_at, used_at)` on recovery links.

## 4. India timezone and server time

- Store all database timestamps as `TIMESTAMPTZ`.
- Derive India date with `(timezone('Asia/Kolkata', now()))::date`.
- Format Asia/Kolkata clock output in a server helper or SQL view.
- Daily reset and retention boundaries use India calendar dates, not UTC dates.
- The frontend does not provide server time or status timestamps.

## 5. Duplicate phone HMAC

The server computes:

`phone_hmac = HMAC-SHA256(PHONE_HMAC_SECRET, normalized_phone)`

Normalization:

- Remove spaces and dashes.
- Reject letters.
- Require exactly 10 digits.

Rules:

- Store the HMAC in a fixed-size or hex/text indexed column.
- The raw phone may exist only in private staff-readable fields.
- The HMAC secret is stored in Supabase/Vault/server secret storage.
- The secret is never in `VITE_*`, SQL migration source, frontend code or logs.
- Rotate the secret requires a documented migration/re-computation plan.
- A server-secret mismatch must fail closed.

## 6. Atomic join

`join_queue(...)` should run as one PostgreSQL transaction:

1. Validate name, phone, one-to-three services and preference.
2. Normalize phone and reject invalid input.
3. Compute the keyed HMAC.
4. Check online joining conditions.
5. Lock or create the India-date counter row.
6. Use the partial active-phone unique index as the final duplicate guard.
7. Return the existing active spot for the same HMAC if found.
8. Otherwise assign the next shared daily token.
9. Insert spot, spot-service snapshots and move log.
10. Generate and store only the capability digest.
11. Return the random spot ID, token and capability to the initiating customer request.

The join request ID is unique and repeated requests return the same spot.

## 7. Strict FCFS Call Next

Call Next must preserve strict global FCFS under concurrency.

### Required locking strategy

- Acquire one queue-wide PostgreSQL advisory transaction lock, keyed to the India-date queue.
- Lock the requested barber row.
- Re-read and validate barber duty, break and busy state.
- Select the earliest eligible Waiting spot under that queue-wide lock.
- Update the selected spot to Called.
- Assign the barber.
- Insert the move log.
- Commit.

The queue-wide lock serializes all Call Next candidate decisions for the day. It prevents:

- Two staff requests choosing different later customers while an earlier eligible customer remains.
- A later customer bypassing an earlier specific-barber or `Any` candidate.
- Barber-specific and global queue state from diverging.

Do not use `FOR UPDATE SKIP LOCKED` for the Call Next candidate query. It can select a later row while an earlier row is locked or changing, violating global FCFS.

If both staff devices call concurrently:

- The first lock holder commits the call.
- The second waits.
- The second re-reads the barber and gets `Busy` or refreshes the queue.
- It cannot call the same customer twice.

## 8. Atomic state moves

Use one RPC and one transaction per operation:

- `start_service`
- `done_service`
- `cancel_waiting`
- `mark_no_show`
- `set_barber_break`
- `add_walk_in`

Every RPC:

1. Validates staff/customer authorization.
2. Locks the spot/barber as needed.
3. Verifies the exact documented status move.
4. Writes final timestamps and end reason.
5. Inserts move log.
6. Updates public projections.
7. Commits atomically.

No backward or final-state moves are allowed.

## 9. Customer capability

Each spot receives a random 256-bit or larger capability at creation.

- The database stores only a SHA-256 or equivalent digest.
- The capability is returned once to the joining customer.
- The frontend stores the capability in private browser storage.
- The capability is never in a URL, query parameter, Realtime payload, logs or error message.
- Public Status access takes a random spot ID and returns only public-safe fields.
- Private read/cancel RPCs require both spot ID and capability digest.
- Cancellation verifies capability, spot ownership, Waiting status and atomic move rules.
- Possession of only a spot ID does not authorize cancellation or private details.

The capability is a bearer capability. Recovery links and staff-assisted recovery create or rotate it as designed.

## 10. Staff authentication

### Staff login

Use a server-only Edge Function or Supabase RPC specifically designed for authentication:

1. Accept 4-digit PIN, device key and login context.
2. Check server-side lock and attempt counters.
3. Verify a server-stored PIN hash using Argon2id or bcrypt.
4. On success, generate a cryptographically random staff session ID.
5. Store only `sha256(session_id)` and role in `staff_sessions`.
6. Set expiry to exactly no more than 12 hours.
7. Issue a Supabase-compatible JWT with:
   - Staff role
   - Staff session ID
   - Barber/owner scope when applicable
   - Issued-at
   - Expiry <= 12 hours
   - A unique JWT ID

The 4-digit PIN, PIN hash, service-role key and JWT signing secret stay server-only.

### Every staff RPC

Before mutation:

1. Validate JWT signature, issuer, audience and role.
2. Verify the JWT session ID.
3. Look up `staff_sessions`.
4. Verify `revoked_at IS NULL`.
5. Verify `expires_at > now()`.
6. Verify `wrong_attempt_count`/lock state as needed.
7. Verify the required staff role/barber scope.
8. Perform the RPC mutation.

Revocation must immediately prevent RPC and RLS access. Expired sessions are never renewed silently.

### 12-hour limit

- Session expiry is a database and JWT limit.
- The frontend tab session never extends expiry.
- Re-entering the PIN creates a new session.
- The UI asks staff to unlock again after expiry.
- Background staff JWT refresh is prohibited from extending beyond the original 12-hour maximum.

## 11. RLS

Direct public access:

- No direct insert/update/delete on spots, moves or staff tables.
- Public only reads public-safe views.
- Public RPC allows Join and public spot reads.
- Public customer private/cancel RPC requires the capability.

Staff access:

- RLS permits private staff reads only for staff JWT roles.
- Staff mutations are granted only through RPC.
- Each RPC revalidates staff session and role.
- Barber RPC additionally verifies assigned/barber scope.

Owner access:

- Owner role can read settings/stats and call owner settings RPC.
- Owner mutations cannot bypass RPC validation.

Realtime:

- Public-safe Realtime tables/projections only.
- Private customer updates require capability-scoped data or private RPC polling.
- No direct Realtime publication of `spots`, `move_log`, names or phones.

## 12. Realtime

Use public projections:

- Queue state for Home/TV.
- Public spot state for customer status.
- Public settings state for opening/closing and barber states.

Realtime messages contain:

- Spot ID
- Token
- Status
- Assigned barber
- Position
- Estimate
- Public-only state fields

Never include:

- Customer name
- Phone/HMAC
- Staff session
- Customer capability
- Recovery token

Client fallback polls every 2–3 seconds if Realtime disconnects. Realtime target remains under five seconds.

## 13. Recovery QR

1. Staff verifies customer identity in person.
2. Staff calls `create_recovery_link(spot_id)`.
3. Server creates a 256-bit random token.
4. Store SHA-256(token), expiry and verification metadata.
5. Return a QR link `/recover/<token>` or `/recover#<token>`; the token is never in customer status URLs.
6. Redemption RPC verifies expiry and unused state.
7. It atomically marks the link used.
8. It creates/rotates the random customer capability.
9. It returns the spot ID and capability only to the verified browser.
10. Used/expired links are not reusable.

The QR itself expires after 10 minutes. The spot is not canceled or changed by recovery.

## 14. Daily reset

The first RPC/request for a new India-date triggers reset:

- Close old Waiting, Called and In-chair spots as Cancelled with `day-ended`.
- Create/restart the daily token counter.
- Set all barbers on duty and clear breaks.
- Reset online joining to Closed unless demo mode.
- Clear P1 on-my-way state.
- Start today stats from zero.

In demo mode, reset preserves the owner-set joining switch.

## 15. 30-day retention

Terminal spots become eligible for cleanup 30 days after `finished_at` or the terminal timestamp:

- Done
- Cancelled
- No-show
- Day-ended Cancelled

Rules:

- Active Waiting, Called and In-chair spots are never deleted.
- Preserve aggregate daily stats.
- Delete PII and terminal-detail rows only after threshold.
- Retain move-log data only as required for aggregate stats or the retention period.
- Use a scheduled RPC/pg_cron/Edge job, all using Asia/Kolkata timestamps.
- The job must be idempotent and run in batches.

## 16. Free-tier review

Before implementation, verify current Supabase plan limits for:

- Database pause/inactivity
- Database storage and egress
- Realtime concurrent connections and messages
- Edge Function invocations/runtime
- Auth rate limits
- pg_cron and scheduled job availability
- Backup/PITR
- Connection pooler limits

The app should use public projections, no large blobs and batched cleanup to stay suitable for a free tier.
