create or replace view public.public_queue_state
as
select
  s.day,
  s.status,
  s.token_text,
  s.assigned_barber_id,
  b.name as assigned_barber_name,
  s.initial_estimate,
  s.joined_at
from public.spots s
left join public.barbers b on b.id = s.assigned_barber_id
where s.status in ('Waiting', 'Called', 'In chair');

create or replace view public.public_spot_state
as
select
  s.id,
  s.token_text,
  s.status,
  s.assigned_barber_id,
  b.name as assigned_barber_name,
  s.initial_estimate,
  s.joined_at,
  s.called_at,
  s.started_at,
  s.finished_at
from public.spots s
left join public.barbers b on b.id = s.assigned_barber_id;

alter table public.salon_settings enable row level security;
alter table public.services enable row level security;
alter table public.barbers enable row level security;
alter table public.barber_services enable row level security;
alter table public.day_counters enable row level security;
alter table public.queue_locks enable row level security;
alter table public.spots enable row level security;
alter table public.spot_services enable row level security;
alter table public.move_log enable row level security;
alter table public.staff_sessions enable row level security;
alter table public.recovery_links enable row level security;
alter table public.join_attempts enable row level security;
alter table public.daily_stats enable row level security;

create policy "public reads public queue state"
  on public.salon_settings
  for select
  to anon, authenticated
  using (true);

create policy "public reads enabled services"
  on public.services
  for select
  to anon, authenticated
  using (enabled);

create policy "public reads on duty barbers"
  on public.barbers
  for select
  to anon, authenticated
  using (on_duty_today);

revoke all on public.spots from anon, authenticated;
revoke all on public.move_log from anon, authenticated;
revoke all on public.staff_sessions from anon, authenticated;
revoke all on public.recovery_links from anon, authenticated;
revoke all on public.join_attempts from anon, authenticated;

grant select on public.public_queue_state to anon, authenticated;
grant select on public.public_spot_state to anon, authenticated;
grant select on public.salon_settings to anon, authenticated;
grant select on public.services to anon, authenticated;
grant select on public.barbers to anon, authenticated;


create or replace function public.queue_serialization_lock(p_day date)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  lock_key bigint;
begin
  lock_key := abs(hashtextextended(p_day::text, 0));
  perform pg_advisory_xact_lock(lock_key);
end;
$$;

revoke all on function public.queue_serialization_lock(date) from public, anon, authenticated;

create or replace function public.india_today()
returns date
language sql
stable
as $$
  select timezone('Asia/Kolkata', now())::date;
$$;
