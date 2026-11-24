create extension if not exists pgcrypto;

create table if not exists public.salon_settings (
  id smallint primary key default 1,
  salon_name_en text not null,
  salon_name_gu text not null,
  closing_time time not null default '21:00:00',
  online_joining_open boolean not null default false,
  demo_mode boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint salon_settings_singleton check (id = 1)
);

insert into public.salon_settings (id, salon_name_en, salon_name_gu)
values (1, 'LateCuts', 'લેટકટ્સ')
on conflict (id) do nothing;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_gu text not null,
  duration_minutes integer not null,
  price_rupees integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_duration_bounds
    check (duration_minutes between 5 and 180 and mod(duration_minutes, 5) = 0),
  constraint services_price_nonnegative check (price_rupees >= 0)
);

create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  on_duty_today boolean not null default true,
  on_break boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.barber_services (
  barber_id uuid not null references public.barbers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (barber_id, service_id)
);

create table if not exists public.day_counters (
  day date primary key,
  next_token integer not null default 1,
  constraint day_counters_positive_token check (next_token >= 1)
);

create table if not exists public.queue_locks (
  day date primary key references public.day_counters(day) on delete restrict,
  locked_at timestamptz not null default now()
);

create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  day date not null references public.day_counters(day) on delete restrict,
  token integer not null,
  token_text text not null,
  name text not null,
  phone text not null,
  phone_hmac bytea not null,
  customer_capability_hash bytea not null,
  preference_barber_id uuid references public.barbers(id) on delete restrict,
  preference text not null default 'Any',
  assigned_barber_id uuid references public.barbers(id) on delete restrict,
  status text not null,
  source text not null,
  joined_at timestamptz not null default now(),
  called_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  total_minutes integer not null,
  total_price integer not null,
  initial_estimate integer,
  end_reason text,
  on_my_way jsonb,
  join_request_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spots_status_values check (
    status in ('Waiting', 'Called', 'In chair', 'Done', 'Cancelled', 'No-show')
  ),
  constraint spots_source_values check (source in ('online', 'walk-in')),
  constraint spots_preference_values check (
    preference = 'Any' or preference_barber_id is not null
  ),
  constraint spots_phone_hmac_length check (octet_length(phone_hmac) = 32),
  constraint spots_capability_hash_length check (octet_length(customer_capability_hash) = 32),
  constraint spots_totals_nonnegative check (total_minutes >= 0 and total_price >= 0),
  constraint spots_initial_estimate_nonnegative check (initial_estimate >= 0),
  constraint spots_token_positive check (token >= 1),
  constraint spots_phone_format check (phone ~ '^[0-9]{10}$'),
  constraint spots_terminal_finished_at check (
    (status in ('Done', 'Cancelled', 'No-show') and finished_at is not null)
    or
    (status not in ('Done', 'Cancelled', 'No-show') and finished_at is null)
  ),
  constraint spots_terminal_end_reason check (
    (status in ('Done', 'Cancelled', 'No-show') and end_reason is not null)
    or
    (status not in ('Done', 'Cancelled', 'No-show') and end_reason is null)
  ),
  constraint spots_called_consistency check (
    (status = 'Called' and called_at is not null and assigned_barber_id is not null)
    or status <> 'Called'
  ),
  constraint spots_in_chair_consistency check (
    (status = 'In chair' and started_at is not null and assigned_barber_id is not null)
    or status <> 'In chair'
  ),
  constraint spots_waiting_consistency check (
    status <> 'Waiting' or (
      called_at is null
      and started_at is null
      and finished_at is null
      and assigned_barber_id is null
      and end_reason is null
    )
  )
);

create unique index if not exists spots_day_token_uidx
  on public.spots(day, token);

create unique index if not exists spots_join_request_uidx
  on public.spots(join_request_id)
  where join_request_id is not null;

create unique index if not exists spots_active_phone_hmac_uidx
  on public.spots(phone_hmac)
  where status in ('Waiting', 'Called', 'In chair');

create index if not exists spots_fcfs_idx
  on public.spots(day, status, joined_at, token);

create index if not exists spots_barber_candidate_idx
  on public.spots(status, preference_barber_id, joined_at, token);

create index if not exists spots_assigned_candidate_idx
  on public.spots(status, assigned_barber_id, joined_at, token);

create index if not exists spots_phone_hmac_day_status_idx
  on public.spots(phone_hmac, day, status);

create index if not exists spots_finished_retention_idx
  on public.spots(finished_at, status)
  where finished_at is not null;

create table if not exists public.spot_services (
  spot_id uuid not null references public.spots(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  name_en text not null,
  name_gu text not null,
  duration_minutes integer not null,
  price_rupees integer not null,
  created_at timestamptz not null default now(),
  primary key (spot_id, service_id)
);

create table if not exists public.move_log (
  id bigint generated always as identity primary key,
  spot_id uuid not null references public.spots(id) on delete restrict,
  from_status text,
  to_status text not null,
  actor_type text not null,
  actor_id text,
  created_at timestamptz not null default now(),
  constraint move_log_status_values check (
    (from_status is null or from_status in ('Waiting', 'Called', 'In chair', 'Done', 'Cancelled', 'No-show'))
    and to_status in ('Waiting', 'Called', 'In chair', 'Done', 'Cancelled', 'No-show')
  ),
  constraint move_log_actor_values check (
    actor_type in ('customer', 'reception', 'barber', 'owner', 'system')
  ),
  constraint move_log_allowed_transition check (
    (from_status is null and to_status = 'Waiting')
    or (from_status = 'Waiting' and to_status in ('Called', 'Cancelled'))
    or (from_status = 'Called' and to_status in ('In chair', 'No-show'))
    or (from_status = 'In chair' and to_status = 'Done')
  )
);

create index if not exists move_log_spot_created_idx
  on public.move_log(spot_id, created_at);

create table if not exists public.staff_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token_hash bytea not null,
  role text not null,
  staff_name text,
  barber_id uuid references public.barbers(id) on delete restrict,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  wrong_attempt_count integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  constraint staff_sessions_role_values check (role in ('reception', 'barber', 'owner')),
  constraint staff_sessions_barber_scope check (
    (role = 'barber' and barber_id is not null)
    or (role <> 'barber')
  ),
  constraint staff_sessions_token_hash_length check (octet_length(session_token_hash) = 32),
  constraint staff_sessions_attempt_count check (wrong_attempt_count >= 0)
  ,
  constraint staff_sessions_max_twelve_hours check (
    expires_at <= created_at + interval '12 hours'
  )
);

create index if not exists staff_sessions_expiry_idx
  on public.staff_sessions(expires_at, revoked_at);

create table if not exists public.recovery_links (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots(id) on delete restrict,
  token_hash bytea not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by_staff_session_id uuid references public.staff_sessions(id) on delete restrict,
  in_person_verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint recovery_token_hash_length check (octet_length(token_hash) = 32)
);

create unique index if not exists recovery_links_active_token_uidx
  on public.recovery_links(token_hash)
  where used_at is null;

create index if not exists recovery_links_expiry_idx
  on public.recovery_links(expires_at, used_at);

create table if not exists public.join_attempts (
  id text primary key,
  first_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  attempt_count integer not null default 1,
  locked_until timestamptz,
  constraint join_attempt_count check (attempt_count >= 0)
);

create table if not exists public.daily_stats (
  day date primary key,
  customers_served integer not null default 0,
  average_wait_minutes integer,
  no_shows integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint daily_stats_nonnegative check (
    customers_served >= 0 and no_shows >= 0 and
    (average_wait_minutes is null or average_wait_minutes >= 0)
  )
);
