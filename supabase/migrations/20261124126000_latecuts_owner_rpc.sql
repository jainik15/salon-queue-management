create or replace function public.owner_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_staff_id uuid;
  v_day date := timezone('Asia/Kolkata', now())::date;
begin
  v_staff_id := public.validate_staff_jwt('owner');

  return jsonb_build_object(
    'settings', (
      select jsonb_build_object(
        'salon_name_en', s.salon_name_en,
        'salon_name_gu', s.salon_name_gu,
        'closing_time', s.closing_time,
        'online_joining_open', s.online_joining_open,
        'demo_mode', s.demo_mode
      )
      from public.salon_settings s
      where s.id = 1
    ),
    'services', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', sv.id,
          'name_en', sv.name_en,
          'name_gu', sv.name_gu,
          'duration_minutes', sv.duration_minutes,
          'price_rupees', sv.price_rupees,
          'enabled', sv.enabled
        )
        order by sv.name_en
      ), '[]'::jsonb)
      from public.services sv
    ),
    'barbers', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'name', b.name,
          'on_duty_today', b.on_duty_today,
          'on_break', b.on_break
        )
        order by b.name
      ), '[]'::jsonb)
      from public.barbers b
    ),
    'summary', (
      select jsonb_build_object(
        'waiting', (select count(*) from public.spots where day = v_day and status = 'Waiting'),
        'called', (select count(*) from public.spots where day = v_day and status = 'Called'),
        'in_chair', (select count(*) from public.spots where day = v_day and status = 'In chair'),
        'done', (select count(*) from public.spots where day = v_day and status = 'Done'),
        'no_shows', (select count(*) from public.spots where day = v_day and status = 'No-show')
      )
    )
  );
end;
$$;

revoke all on function public.owner_dashboard() from public, anon, authenticated;
grant execute on function public.owner_dashboard() to authenticated;

create or replace function public.update_owner_settings(
  p_online_joining_open boolean,
  p_closing_time time,
  p_salon_name_en text default null,
  p_salon_name_gu text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_staff_id uuid;
begin
  v_staff_id := public.validate_staff_jwt('owner');

  update public.salon_settings
  set online_joining_open = p_online_joining_open,
      closing_time = p_closing_time,
      salon_name_en = coalesce(p_salon_name_en, salon_name_en),
      salon_name_gu = coalesce(p_salon_name_gu, salon_name_gu),
      updated_at = now()
  where id = 1;

  return jsonb_build_object(
    'online_joining_open', p_online_joining_open,
    'closing_time', p_closing_time
  );
end;
$$;

revoke all on function public.update_owner_settings(boolean, time, text, text) from public, anon, authenticated;
grant execute on function public.update_owner_settings(boolean, time, text, text) to authenticated;

create or replace function public.update_owner_service(
  p_service_id uuid,
  p_enabled boolean,
  p_duration_minutes integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_staff_id uuid;
begin
  v_staff_id := public.validate_staff_jwt('owner');

  if p_duration_minutes is not null
     and (p_duration_minutes < 5 or p_duration_minutes > 180 or mod(p_duration_minutes, 5) <> 0) then
    raise exception 'INVALID_SERVICE_DURATION';
  end if;

  update public.services
  set enabled = p_enabled,
      duration_minutes = coalesce(p_duration_minutes, duration_minutes),
      updated_at = now()
  where id = p_service_id;

  if not found then
    raise exception 'SERVICE_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'service_id', p_service_id,
    'enabled', p_enabled
  );
end;
$$;

revoke all on function public.update_owner_service(uuid, boolean, integer) from public, anon, authenticated;
grant execute on function public.update_owner_service(uuid, boolean, integer) to authenticated;

create or replace function public.update_owner_barber(
  p_barber_id uuid,
  p_on_duty_today boolean,
  p_on_break boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_staff_id uuid;
begin
  v_staff_id := public.validate_staff_jwt('owner');

  if p_on_duty_today = false
     and exists (
       select 1
       from public.spots
       where assigned_barber_id = p_barber_id
         and status in ('Called', 'In chair')
     ) then
    raise exception 'BARBER_HAS_CURRENT_CUSTOMER';
  end if;

  update public.barbers
  set on_duty_today = p_on_duty_today,
      on_break = coalesce(p_on_break, on_break),
      updated_at = now()
  where id = p_barber_id;

  if not found then
    raise exception 'BARBER_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'barber_id', p_barber_id,
    'on_duty_today', p_on_duty_today
  );
end;
$$;

revoke all on function public.update_owner_barber(uuid, boolean, boolean) from public, anon, authenticated;
grant execute on function public.update_owner_barber(uuid, boolean, boolean) to authenticated;
