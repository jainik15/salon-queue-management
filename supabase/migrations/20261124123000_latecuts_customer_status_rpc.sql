create or replace function public.get_private_status(
  p_spot_id uuid,
  p_customer_capability text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_spot public.spots%rowtype;
  v_capability_hash bytea;
begin
  if coalesce(p_customer_capability, '') = '' then
    raise exception 'CUSTOMER_CAPABILITY_REQUIRED';
  end if;

  v_capability_hash := digest(p_customer_capability, 'sha256');

  select *
  into v_spot
  from public.spots
  where id = p_spot_id
    and customer_capability_hash = v_capability_hash;

  if not found then
    raise exception 'CUSTOMER_STATUS_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'spot_id', v_spot.id,
    'token', v_spot.token_text,
    'status', v_spot.status,
    'preference', v_spot.preference,
    'assigned_barber_id', v_spot.assigned_barber_id,
    'position', null,
    'estimate', v_spot.initial_estimate,
    'joined_at', v_spot.joined_at,
    'called_at', v_spot.called_at,
    'started_at', v_spot.started_at,
    'finished_at', v_spot.finished_at,
    'total_minutes', v_spot.total_minutes,
    'total_price', v_spot.total_price
  );
end;
$$;

revoke all on function public.get_private_status(uuid, text) from public, anon, authenticated;
grant execute on function public.get_private_status(uuid, text) to anon, authenticated;
