create or replace function public.validate_staff_jwt(
  p_required_role text default null,
  p_required_barber_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claims jsonb;
  v_session_id text;
  v_session_token text;
  v_session_hash bytea;
  v_jwt_exp bigint;
  v_session public.staff_sessions%rowtype;
begin
  v_claims := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
  v_session_id := v_claims->>'staff_session_id';
  v_session_token := v_claims->>'staff_session_token';
  v_jwt_exp := nullif(v_claims->>'exp', '')::bigint;
  if v_jwt_exp is null or v_jwt_exp <= extract(epoch from now())::bigint then
    raise exception 'STAFF_JWT_EXPIRED';
  end if;
  -- Authorization uses the DB staff_sessions role, never a client JWT role claim.

  if coalesce(v_session_id, '') = '' then
    raise exception 'STAFF_SESSION_REQUIRED';
  end if;
  if coalesce(v_session_token, '') = '' then
    raise exception 'STAFF_SESSION_TOKEN_REQUIRED';
  end if;

  v_session_hash := digest(v_session_token, 'sha256');

  select *
  into v_session
  from public.staff_sessions
  where id::text = v_session_id
  for update;

  if not found then
    raise exception 'STAFF_SESSION_INVALID';
  end if;
  if v_session.revoked_at is not null then
    raise exception 'STAFF_SESSION_REVOKED';
  end if;
  if v_session.session_token_hash is distinct from v_session_hash then
    raise exception 'STAFF_SESSION_TOKEN_INVALID';
  end if;
  if v_session.expires_at <= now() then
    raise exception 'STAFF_SESSION_EXPIRED';
  end if;
  if v_session.locked_until is not null and v_session.locked_until > now() then
    raise exception 'STAFF_SESSION_LOCKED';
  end if;
  if p_required_role is not null and v_session.role <> p_required_role then
    raise exception 'STAFF_ROLE_REQUIRED';
  end if;
  if p_required_barber_id is not null
     and (v_session.role <> 'barber' or v_session.barber_id is distinct from p_required_barber_id) then
    raise exception 'BARBER_SCOPE_MISMATCH';
  end if;

  update public.staff_sessions
  set last_used_at = now()
  where id = v_session.id;

  return v_session.id;
end;
$$;

revoke all on function public.validate_staff_jwt(text, uuid) from public, anon, authenticated;

create or replace function public.join_queue(
  p_name text,
  p_phone text,
  p_service_ids uuid[],
  p_preference_barber_id uuid default null,
  p_join_request_id uuid default null,
  p_attempt_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_day date;
  v_name text;
  v_phone text;
  v_secret text;
  v_phone_hmac bytea;
  v_capability text;
  v_capability_hash bytea;
  v_existing public.spots%rowtype;
  v_spot public.spots%rowtype;
  v_counter integer;
  v_settings public.salon_settings%rowtype;
  v_service_count integer;
  v_distinct_count integer;
  v_total_minutes integer;
  v_total_price integer;
  v_work_ahead integer;
  v_working_barbers integer;
  v_initial_estimate integer;
  v_preference text;
  v_service record;
  v_attempt public.join_attempts%rowtype;
begin
  v_name := btrim(p_name);
  if length(v_name) < 2 or length(v_name) > 40 then
    raise exception 'VALIDATION_NAME';
  end if;

  v_phone := regexp_replace(coalesce(p_phone, ''), '[ -]', '', 'g');
  if v_phone !~ '^[0-9]{10}$' then
    raise exception 'VALIDATION_PHONE';
  end if;

  if p_service_ids is null
     or cardinality(p_service_ids) < 1
     or cardinality(p_service_ids) > 3 then
    raise exception 'VALIDATION_SERVICES';
  end if;

  select count(*), count(distinct u.service_id)
  into v_service_count, v_distinct_count
  from unnest(p_service_ids) u(service_id);

  if v_service_count <> v_distinct_count then
    raise exception 'VALIDATION_SERVICES';
  end if;

  select coalesce(sum(s.duration_minutes), 0),
         coalesce(sum(s.price_rupees), 0)
  into v_total_minutes, v_total_price
  from unnest(p_service_ids) u(service_id)
  join public.services s on s.id = u.service_id
  where s.enabled;

  if v_total_minutes <= 0
     or (select count(*) from unnest(p_service_ids) u(service_id)
         join public.services s on s.id = u.service_id and s.enabled) <> cardinality(p_service_ids) then
    raise exception 'VALIDATION_SERVICES';
  end if;

  select * into v_settings
  from public.salon_settings
  where id = 1;

  if not found then
    raise exception 'SALON_NOT_CONFIGURED';
  end if;

  if not exists (select 1 from public.barbers where on_duty_today) then
    raise exception 'NO_BARBERS_AVAILABLE';
  end if;
  if not v_settings.online_joining_open and not v_settings.demo_mode then
    raise exception 'ONLINE_QUEUE_CLOSED';
  end if;
  if not v_settings.demo_mode
     and (timezone('Asia/Kolkata', v_now))::time
         >= v_settings.closing_time - interval '30 minutes' then
    raise exception 'JOINING_CLOSED_FOR_TODAY';
  end if;

  v_preference := 'Any';
  if p_preference_barber_id is not null then
    if not exists (
      select 1
      from public.barbers
      where id = p_preference_barber_id
        and on_duty_today
    ) then
      raise exception 'VALIDATION_PREFERENCE';
    end if;
    select name into v_preference
    from public.barbers
    where id = p_preference_barber_id;
  end if;

  v_secret := nullif(current_setting('app.phone_hmac_secret', true), '');
  if v_secret is null then
    raise exception 'PHONE_HMAC_SECRET_NOT_CONFIGURED';
  end if;
  v_phone_hmac := hmac(v_phone, v_secret, 'sha256');
  v_day := timezone('Asia/Kolkata', v_now)::date;

  perform public.queue_serialization_lock(v_day);

  if coalesce(p_attempt_key, '') <> '' then
    insert into public.join_attempts(id, first_attempt_at, last_attempt_at, attempt_count)
    values (p_attempt_key, v_now, v_now, 1)
    on conflict(id) do update
    set attempt_count =
      case
        when public.join_attempts.last_attempt_at <= v_now - interval '1 minute'
          then 1
        else public.join_attempts.attempt_count + 1
      end,
      first_attempt_at =
        case
          when public.join_attempts.last_attempt_at <= v_now - interval '1 minute'
            then v_now
          else public.join_attempts.first_attempt_at
        end,
      last_attempt_at = v_now;

    select *
    into v_attempt
    from public.join_attempts
    where id = p_attempt_key;

    if v_attempt.attempt_count > 5
       and v_attempt.last_attempt_at > v_now - interval '1 minute' then
      raise exception 'TOO_MANY_JOIN_ATTEMPTS';
    end if;
  end if;

  if p_join_request_id is not null then
    select *
    into v_existing
    from public.spots
    where join_request_id = p_join_request_id;

    if found then
      return jsonb_build_object(
        'spot_id', v_existing.id,
        'token', v_existing.token_text,
        'already_active', true,
        'idempotent', true,
        'customer_capability', ''
      );
    end if;
  end if;

  select *
  into v_existing
  from public.spots
  where day = v_day
    and phone_hmac = v_phone_hmac
    and status in ('Waiting', 'Called', 'In chair');

  if found then
    return jsonb_build_object(
      'spot_id', v_existing.id,
      'token', v_existing.token_text,
      'already_active', true,
      'idempotent', true,
      'customer_capability', ''
    );
  end if;

  insert into public.day_counters(day, next_token)
  values (v_day, 1)
  on conflict(day) do nothing;

  select next_token
  into v_counter
  from public.day_counters
  where day = v_day
  for update;

  update public.day_counters
  set next_token = v_counter + 1
  where day = v_day;

  v_capability := encode(gen_random_bytes(32), 'hex');
  v_capability_hash := digest(v_capability, 'sha256');

  select coalesce(sum(
    case
      when s.status = 'Waiting' then s.total_minutes
      when s.status = 'Called' then s.total_minutes
      when s.status = 'In chair'
        then greatest(s.total_minutes - greatest(0, extract(epoch from (v_now - s.started_at)) / 60)::integer, 0)
      else 0
    end
  ), 0)
  into v_work_ahead
  from public.spots s
  where s.day = v_day
    and s.status in ('Waiting', 'Called', 'In chair');

  select count(*)
  into v_working_barbers
  from public.barbers
  where on_duty_today and not on_break;

  if v_working_barbers = 0 or v_work_ahead = 0 then
    v_initial_estimate := 0;
  else
    v_initial_estimate := (ceil(v_work_ahead::numeric / v_working_barbers / 5) * 5)::integer;
  end if;

  insert into public.spots (
    day, token, token_text, name, phone, phone_hmac, customer_capability_hash,
    preference_barber_id, preference, status, source, joined_at,
    total_minutes, total_price, initial_estimate, join_request_id
  )
  values (
    v_day, v_counter, 'S-' || v_counter, v_name, v_phone, v_phone_hmac, v_capability_hash,
    p_preference_barber_id, v_preference, 'Waiting', 'online', v_now,
    v_total_minutes, v_total_price, v_initial_estimate, p_join_request_id
  )
  returning * into v_spot;

  for v_service in
    select s.*
    from unnest(p_service_ids) u(service_id)
    join public.services s on s.id = u.service_id
  loop
    insert into public.spot_services(
      spot_id, service_id, name_en, name_gu, duration_minutes, price_rupees
    )
    values (
      v_spot.id, v_service.id, v_service.name_en, v_service.name_gu,
      v_service.duration_minutes, v_service.price_rupees
    );
  end loop;

  insert into public.move_log(
    spot_id, from_status, to_status, actor_type, actor_id, created_at
  )
  values (v_spot.id, null, 'Waiting', 'customer', v_spot.id::text, v_now);

  return jsonb_build_object(
    'spot_id', v_spot.id,
    'token', v_spot.token_text,
    'already_active', false,
    'idempotent', false,
    'customer_capability', v_capability
  );
exception
  when unique_violation then
    select *
    into v_existing
    from public.spots
    where (join_request_id = p_join_request_id)
       or (p_join_request_id is null and day = v_day and phone_hmac = v_phone_hmac)
    order by joined_at, token
    limit 1;

    if found then
      return jsonb_build_object(
        'spot_id', v_existing.id,
        'token', v_existing.token_text,
        'already_active', true,
        'idempotent', true,
        'customer_capability', ''
      );
    end if;
    raise;
end;
$$;

revoke all on function public.join_queue(text, text, uuid[], uuid, uuid) from public, anon, authenticated;
grant execute on function public.join_queue(text, text, uuid[], uuid, uuid) to anon, authenticated;

create or replace function public.call_next(p_barber_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_day date := timezone('Asia/Kolkata', now())::date;
  v_now timestamptz := now();
  v_staff_id uuid;
  v_barber public.barbers%rowtype;
  v_spot public.spots%rowtype;
begin
  v_staff_id := public.validate_staff_jwt('reception');
  perform public.queue_serialization_lock(v_day);

  select *
  into v_barber
  from public.barbers
  where id = p_barber_id
  for update;

  if not found then
    raise exception 'BARBER_NOT_FOUND';
  end if;
  if not v_barber.on_duty_today then
    raise exception 'BARBER_NOT_ON_DUTY';
  end if;
  if v_barber.on_break then
    raise exception 'BARBER_ON_BREAK';
  end if;
  if exists (
    select 1
    from public.spots
    where assigned_barber_id = p_barber_id
      and status in ('Called', 'In chair')
  ) then
    raise exception 'BARBER_BUSY';
  end if;

  select *
  into v_spot
  from public.spots
  where day = v_day
    and status = 'Waiting'
    and (preference = 'Any' or preference_barber_id = p_barber_id)
  order by joined_at asc, token asc
  limit 1
  for update;

  if not found then
    raise exception 'NO_CUSTOMER_FOR_BARBER';
  end if;

  update public.spots
  set status = 'Called',
      assigned_barber_id = p_barber_id,
      called_at = v_now,
      updated_at = v_now
  where id = v_spot.id;

  insert into public.move_log(
    spot_id, from_status, to_status, actor_type, actor_id, created_at
  )
  values (v_spot.id, 'Waiting', 'Called', 'reception', v_staff_id::text, v_now);

  return jsonb_build_object(
    'spot_id', v_spot.id,
    'token', v_spot.token_text,
    'barber_id', p_barber_id
  );
end;
$$;

revoke all on function public.call_next(uuid) from public, anon, authenticated;
grant execute on function public.call_next(uuid) to authenticated;

create or replace function public.start_service(p_spot_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_spot public.spots%rowtype;
  v_staff_id uuid;
begin
  select *
  into v_spot
  from public.spots
  where id = p_spot_id
  for update;

  if not found then
    raise exception 'SPOT_NOT_FOUND';
  end if;
  if v_spot.status <> 'Called' then
    raise exception 'MOVE_NOT_ALLOWED';
  end if;

  v_staff_id := public.validate_staff_jwt('barber', v_spot.assigned_barber_id);
  perform public.queue_serialization_lock(v_spot.day);

  update public.spots
  set status = 'In chair',
      started_at = v_now,
      updated_at = v_now
  where id = p_spot_id;

  insert into public.move_log(
    spot_id, from_status, to_status, actor_type, actor_id, created_at
  )
  values (p_spot_id, 'Called', 'In chair', 'barber', v_staff_id::text, v_now);

  return jsonb_build_object('spot_id', p_spot_id, 'status', 'In chair');
end;
$$;

revoke all on function public.start_service(uuid) from public, anon, authenticated;
grant execute on function public.start_service(uuid) to authenticated;

create or replace function public.done_service(p_spot_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_spot public.spots%rowtype;
  v_staff_id uuid;
  v_wait_minutes integer;
begin
  select *
  into v_spot
  from public.spots
  where id = p_spot_id
  for update;

  if not found then
    raise exception 'SPOT_NOT_FOUND';
  end if;
  if v_spot.status <> 'In chair' then
    raise exception 'MOVE_NOT_ALLOWED';
  end if;

  v_staff_id := public.validate_staff_jwt('barber', v_spot.assigned_barber_id);
  perform public.queue_serialization_lock(v_spot.day);

  v_wait_minutes := greatest(
    0,
    round(extract(epoch from (v_spot.started_at - v_spot.joined_at)) / 60.0)::integer
  );

  update public.spots
  set status = 'Done',
      finished_at = v_now,
      end_reason = 'done',
      updated_at = v_now
  where id = p_spot_id;

  insert into public.move_log(
    spot_id, from_status, to_status, actor_type, actor_id, created_at
  )
  values (p_spot_id, 'In chair', 'Done', 'barber', v_staff_id::text, v_now);

  insert into public.daily_stats(day, customers_served, average_wait_minutes, no_shows)
  values (v_spot.day, 1, v_wait_minutes, 0)
  on conflict(day) do update
  set customers_served = public.daily_stats.customers_served + 1,
      average_wait_minutes = round(
        (
          coalesce(public.daily_stats.average_wait_minutes * public.daily_stats.customers_served, 0)
          + v_wait_minutes
        )::numeric
        / (public.daily_stats.customers_served + 1)
      )::integer,
      updated_at = v_now;

  return jsonb_build_object('spot_id', p_spot_id, 'status', 'Done');
end;
$$;

revoke all on function public.done_service(uuid) from public, anon, authenticated;
grant execute on function public.done_service(uuid) to authenticated;

create or replace function public.cancel_waiting(
  p_spot_id uuid,
  p_customer_capability text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_spot public.spots%rowtype;
  v_staff_id uuid;
  v_capability_hash bytea;
  v_is_staff boolean := false;
begin
  select *
  into v_spot
  from public.spots
  where id = p_spot_id
  for update;

  if not found then
    raise exception 'SPOT_NOT_FOUND';
  end if;
  if v_spot.status <> 'Waiting' then
    raise exception 'MOVE_NOT_ALLOWED';
  end if;

  if coalesce(p_customer_capability, '') <> '' then
    v_capability_hash := digest(p_customer_capability, 'sha256');
    if v_spot.customer_capability_hash is distinct from v_capability_hash then
      raise exception 'CUSTOMER_CAPABILITY_INVALID';
    end if;
  else
    begin
      v_staff_id := public.validate_staff_jwt('reception');
      v_is_staff := true;
    exception
      when others then
        begin
          v_staff_id := public.validate_staff_jwt('owner');
          v_is_staff := true;
        exception
          when others then
            raise exception 'CUSTOMER_CAPABILITY_REQUIRED';
        end;
    end;
  end if;

  perform public.queue_serialization_lock(v_spot.day);

  update public.spots
  set status = 'Cancelled',
      finished_at = v_now,
      end_reason = case
        when v_is_staff then 'cancelled-by-reception'
        else 'cancelled-by-customer'
      end,
      updated_at = v_now
  where id = p_spot_id;

  insert into public.move_log(
    spot_id, from_status, to_status, actor_type, actor_id, created_at
  )
  values (
    p_spot_id,
    'Waiting',
    'Cancelled',
    case when v_is_staff then 'reception' else 'customer' end,
    coalesce(v_staff_id::text, p_spot_id::text),
    v_now
  );

  return jsonb_build_object('spot_id', p_spot_id, 'status', 'Cancelled');
end;
$$;

revoke all on function public.cancel_waiting(uuid, text) from public, anon, authenticated;
grant execute on function public.cancel_waiting(uuid, text) to anon, authenticated;

create or replace function public.mark_no_show(p_spot_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_spot public.spots%rowtype;
  v_staff_id uuid;
  v_minutes integer;
begin
  v_staff_id := public.validate_staff_jwt('reception');

  select *
  into v_spot
  from public.spots
  where id = p_spot_id
  for update;

  if not found then
    raise exception 'SPOT_NOT_FOUND';
  end if;
  if v_spot.status <> 'Called' then
    raise exception 'MOVE_NOT_ALLOWED';
  end if;

  perform public.queue_serialization_lock(v_spot.day);

  v_minutes := coalesce(
    nullif(current_setting('app.no_show_after_minutes', true), '')::integer,
    10
  );

  if v_spot.called_at is null
     or v_spot.called_at > v_now - make_interval(mins => v_minutes) then
    raise exception 'NO_SHOW_TOO_EARLY';
  end if;

  update public.spots
  set status = 'No-show',
      finished_at = v_now,
      end_reason = 'no-show',
      updated_at = v_now
  where id = p_spot_id;

  insert into public.move_log(
    spot_id, from_status, to_status, actor_type, actor_id, created_at
  )
  values (p_spot_id, 'Called', 'No-show', 'reception', v_staff_id::text, v_now);

  insert into public.daily_stats(day, customers_served, average_wait_minutes, no_shows)
  values (v_spot.day, 0, null, 1)
  on conflict(day) do update
  set no_shows = public.daily_stats.no_shows + 1,
      updated_at = v_now;

  return jsonb_build_object('spot_id', p_spot_id, 'status', 'No-show');
end;
$$;

revoke all on function public.mark_no_show(uuid) from public, anon, authenticated;
grant execute on function public.mark_no_show(uuid) to authenticated;

create or replace function public.set_break(p_barber_id uuid, p_on_break boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_barber public.barbers%rowtype;
begin
  begin
    perform public.validate_staff_jwt('barber', p_barber_id);
  exception
    when others then
      begin
        perform public.validate_staff_jwt('reception');
      exception
        when others then
          perform public.validate_staff_jwt('owner');
      end;
  end;

  select *
  into v_barber
  from public.barbers
  where id = p_barber_id
  for update;

  if not found then
    raise exception 'BARBER_NOT_FOUND';
  end if;

  if p_on_break
     and exists (
       select 1
       from public.spots
       where assigned_barber_id = p_barber_id
         and status in ('Called', 'In chair')
     ) then
    raise exception 'BARBER_HAS_CURRENT_CUSTOMER';
  end if;

  update public.barbers
  set on_break = p_on_break,
      updated_at = v_now
  where id = p_barber_id;

  return jsonb_build_object(
    'barber_id', p_barber_id,
    'on_break', p_on_break
  );
end;
$$;

revoke all on function public.set_break(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_break(uuid, boolean) to authenticated;
