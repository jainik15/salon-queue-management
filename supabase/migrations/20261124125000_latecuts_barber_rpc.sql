create or replace function public.barber_queue(p_barber_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_staff_id uuid;
  v_day date := timezone('Asia/Kolkata', now())::date;
  v_barber public.barbers%rowtype;
begin
  v_staff_id := public.validate_staff_jwt('barber', p_barber_id);

  select *
  into v_barber
  from public.barbers
  where id = p_barber_id;

  if not found then
    raise exception 'BARBER_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'barber', jsonb_build_object(
      'id', v_barber.id,
      'name', v_barber.name,
      'on_duty_today', v_barber.on_duty_today,
      'on_break', v_barber.on_break
    ),
    'current', (
      select jsonb_build_object(
        'id', s.id,
        'token', s.token_text,
        'name', s.name,
        'status', s.status,
        'called_at', s.called_at,
        'started_at', s.started_at,
        'total_minutes', s.total_minutes,
        'services', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'name_en', ss.name_en,
              'name_gu', ss.name_gu,
              'duration_minutes', ss.duration_minutes,
              'price_rupees', ss.price_rupees
            )
            order by ss.created_at
          )
          from public.spot_services ss
          where ss.spot_id = s.id
        ), '[]'::jsonb)
      )
      from public.spots s
      where s.assigned_barber_id = p_barber_id
        and s.status in ('Called', 'In chair')
      order by s.called_at
      limit 1
    ),
    'next', (
      select jsonb_build_object(
        'id', s.id,
        'token', s.token_text,
        'name', s.name,
        'status', s.status,
        'total_minutes', s.total_minutes,
        'services', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'name_en', ss.name_en,
              'name_gu', ss.name_gu,
              'duration_minutes', ss.duration_minutes,
              'price_rupees', ss.price_rupees
            )
            order by ss.created_at
          )
          from public.spot_services ss
          where ss.spot_id = s.id
        ), '[]'::jsonb)
      )
      from public.spots s
      where s.day = v_day
        and s.status = 'Waiting'
        and (s.preference = 'Any' or s.preference_barber_id = p_barber_id)
      order by s.joined_at, s.token
      limit 1
    )
  );
end;
$$;

revoke all on function public.barber_queue(uuid) from public, anon, authenticated;
grant execute on function public.barber_queue(uuid) to authenticated;
