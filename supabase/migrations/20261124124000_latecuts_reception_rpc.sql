create or replace function public.staff_login(
  p_pin text,
  p_attempt_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pin text;
  v_expected text;
  v_session_id uuid := gen_random_uuid();
  v_session_token text := encode(gen_random_bytes(32), 'hex');
  v_session_hash bytea := digest(v_session_token, 'sha256');
  v_expires_at timestamptz := now() + interval '12 hours';
  v_lock record;
begin
  v_pin := regexp_replace(coalesce(p_pin, ''), '[^0-9]', '', 'g');
  v_expected := nullif(current_setting('app.staff_pin', true), '');

  if v_expected is null then
    raise exception 'STAFF_PIN_NOT_CONFIGURED';
  end if;

  if coalesce(p_attempt_key, '') <> '' then
    select * into v_lock
    from public.join_attempts
    where id = 'staff:' || p_attempt_key;

    if found and v_lock.locked_until is not null and v_lock.locked_until > now() then
      raise exception 'STAFF_LOCKED';
    end if;
  end if;

  if v_pin <> v_expected then
    if coalesce(p_attempt_key, '') <> '' then
      insert into public.join_attempts(id, first_attempt_at, last_attempt_at, attempt_count)
      values ('staff:' || p_attempt_key, now(), now(), 1)
      on conflict(id) do update
      set attempt_count =
        case
          when public.join_attempts.last_attempt_at <= now() - interval '1 minute' then 1
          else public.join_attempts.attempt_count + 1
        end,
      last_attempt_at = now(),
      locked_until =
        case
          when public.join_attempts.attempt_count >= 5
            then now() + interval '30 seconds'
          else null
        end if;
    end if;
    raise exception 'STAFF_WRONG_PIN';
  end if;

  insert into public.staff_sessions(
    id, session_token_hash, role, expires_at, created_at
  )
  values (
    v_session_id, v_session_hash, 'reception', v_expires_at, now()
  );

  return jsonb_build_object(
    'session_id', v_session_id,
    'session_token', v_session_token,
    'role', 'reception',
    'expires_at', v_expires_at
  );
end;
$$;

revoke all on function public.staff_login(text, text) from public, anon, authenticated;
grant execute on function public.staff_login(text, text) to anon, authenticated;

create or replace function public.reception_queue()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_staff_id uuid;
  v_day date := timezone('Asia/Kolkata', now())::date;
begin
  v_staff_id := public.validate_staff_jwt('reception');

  return jsonb_build_object(
    'day', v_day,
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
      where b.on_duty_today
    ),
    'waiting', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'token', s.token_text,
          'name', s.name,
          'phone', s.phone,
          'status', s.status,
          'preference', s.preference,
          'assigned_barber_id', s.assigned_barber_id,
          'total_minutes', s.total_minutes,
          'total_price', s.total_price,
          'joined_at', s.joined_at
        )
        order by s.joined_at, s.token
      ), '[]'::jsonb)
      from public.spots s
      where s.day = v_day
        and s.status = 'Waiting'
    ),
    'called', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'token', s.token_text,
          'name', s.name,
          'phone', s.phone,
          'status', s.status,
          'assigned_barber_id', s.assigned_barber_id,
          'called_at', s.called_at,
          'total_minutes', s.total_minutes
        )
        order by s.called_at
      ), '[]'::jsonb)
      from public.spots s
      where s.day = v_day
        and s.status = 'Called'
    )
  );
end;
$$;

revoke all on function public.reception_queue() from public, anon, authenticated;
grant execute on function public.reception_queue() to authenticated;

create or replace function public.add_walk_in(
  p_name text,
  p_phone text,
  p_service_ids uuid[],
  p_preference_barber_id uuid default null,
  p_join_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return public.join_queue(
    p_name,
    p_phone,
    p_service_ids,
    p_preference_barber_id,
    p_join_request_id
  );
end;
$$;

revoke all on function public.add_walk_in(text, text, uuid[], uuid, uuid) from public, anon, authenticated;
grant execute on function public.add_walk_in(text, text, uuid[], uuid, uuid) to authenticated;
