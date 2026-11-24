begin;

create temp table latecuts_rpc_test_results (
  name text primary key,
  passed boolean not null
);

insert into latecuts_rpc_test_results
select 'join_queue_rpc_exists',
       exists (
         select 1 from pg_proc
         where proname = 'join_queue'
           and pronamespace = 'public'::regnamespace
       );

insert into latecuts_rpc_test_results
select 'call_next_rpc_exists',
       exists (
         select 1 from pg_proc
         where proname = 'call_next'
           and pronamespace = 'public'::regnamespace
       );

insert into latecuts_rpc_test_results
select 'start_done_cancel_noshow_break_rpcs_exist',
       (
         select count(distinct proname)
         from pg_proc
         where pronamespace = 'public'::regnamespace
           and proname in (
             'start_service',
             'done_service',
             'cancel_waiting',
             'mark_no_show',
             'set_break'
           )
       ) = 5;

insert into latecuts_rpc_test_results
select 'call_next_strict_joined_token_order',
       exists (
         select 1
         from pg_indexes
         where schemaname = 'public'
           and tablename = 'spots'
           and indexname = 'spots_fcfs_idx'
           and indexdef ilike '%joined_at%'
           and indexdef ilike '%token%'
       );

insert into latecuts_rpc_test_results
select 'active_phone_partial_unique_index',
       exists (
         select 1
         from pg_indexes
         where schemaname = 'public'
           and tablename = 'spots'
           and indexname = 'spots_active_phone_hmac_uidx'
       );

insert into latecuts_rpc_test_results
select 'move_log_transition_constraint',
       exists (
         select 1
         from pg_constraint
         where conname = 'move_log_allowed_transition'
           and conrelid = 'public.move_log'::regclass
       );

insert into latecuts_rpc_test_results
select 'terminal_finished_at_constraint',
       exists (
         select 1
         from pg_constraint
         where conname = 'spots_terminal_finished_at'
           and conrelid = 'public.spots'::regclass
       );

insert into latecuts_rpc_test_results
select 'staff_session_barber_scope',
       exists (
         select 1
         from pg_constraint
         where conname = 'staff_sessions_barber_scope'
           and conrelid = 'public.staff_sessions'::regclass
       );

insert into latecuts_rpc_test_results
select 'staff_session_maximum_twelve_hours',
           exists (
             select 1
             from pg_constraint
             where conname = 'staff_sessions_max_twelve_hours'
               and conrelid = 'public.staff_sessions'::regclass
           );

insert into latecuts_rpc_test_results
select 'public_views_do_not_expose_phone_or_capability',
           not exists (
             select 1
             from pg_views
             where schemaname = 'public'
               and viewname in ('public_queue_state', 'public_spot_state')
               and (
                 definition ilike '%phone%'
                 or definition ilike '%customer_capability%'
               )
           );

insert into latecuts_rpc_test_results
select 'no_skip_locked_in_rpc_source',
           not exists (
             select 1
             from pg_proc
             where pronamespace = 'public'::regnamespace
               and proname in (
                 'join_queue',
                 'call_next',
                 'start_service',
                 'done_service',
                 'cancel_waiting',
                 'mark_no_show',
                 'set_break'
               )
               and pg_get_functiondef(oid) ilike '%SKIP LOCKED%'
           );

insert into latecuts_rpc_test_results
select 'join_request_unique_idempotency',
       exists (
         select 1
         from pg_indexes
         where schemaname = 'public'
           and tablename = 'spots'
           and indexname = 'spots_join_request_uidx'
       );

insert into latecuts_rpc_test_results
select 'customer_capability_hash_constraint',
       exists (
         select 1
         from pg_constraint
         where conname = 'spots_capability_hash_length'
           and conrelid = 'public.spots'::regclass
       );

insert into latecuts_rpc_test_results
select 'no_show_uses_ten_minute_default',
           pg_get_functiondef('public.mark_no_show(uuid)'::regprocedure)
             ilike '%make_interval(mins => v_minutes)%'
           and pg_get_functiondef('public.mark_no_show(uuid)'::regprocedure)
             ilike '%10)';

insert into latecuts_rpc_test_results
select 'call_next_has_queue_advisory_lock',
           pg_get_functiondef('public.call_next(uuid)'::regprocedure)
             ilike '%queue_serialization_lock%'
           and pg_get_functiondef('public.call_next(uuid)'::regprocedure)
             not ilike '%SKIP LOCKED%';

insert into latecuts_rpc_test_results
select 'cancel_waiting_accepts_customer_or_staff',
           pg_get_functiondef('public.cancel_waiting(uuid,text)'::regprocedure)
             ilike '%customer_capability%'
           and pg_get_functiondef('public.cancel_waiting(uuid,text)'::regprocedure)
             ilike '%validate_staff_jwt%';

insert into latecuts_rpc_test_results
select 'join_signature_accepts_no_client_capability',
           exists (
             select 1
             from pg_proc
             where proname = 'join_queue'
               and pg_get_function_identity_arguments(oid) =
                 'p_name text, p_phone text, p_service_ids uuid[], p_preference_barber_id uuid, p_join_request_id uuid, p_attempt_key text'
           );

insert into latecuts_rpc_test_results
select 'staff_validator_has_no_client_role_claim',
           pg_get_functiondef('public.validate_staff_jwt(text,uuid)'::regprocedure)
             not ilike '%staff_role%>%staff_role%'
           and pg_get_functiondef('public.validate_staff_jwt(text,uuid)'::regprocedure)
             ilike '%staff_sessions%';

insert into latecuts_rpc_test_results
select 'public_views_have_no_private_columns',
           not exists (
             select 1
             from pg_views
             where schemaname = 'public'
               and viewname in ('public_queue_state', 'public_spot_state')
               and definition ilike '%phone%'
           );

do $$
declare
  failed text;
begin
  select name into failed
  from latecuts_rpc_test_results
  where passed = false
  limit 1;

  if failed is not null then
    raise exception 'LateCuts RPC test failed: %', failed;
  end if;
end;
$$;

rollback;
