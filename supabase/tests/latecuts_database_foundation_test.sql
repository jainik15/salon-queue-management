begin;

create temp table latecuts_test_results (
  name text primary key,
  passed boolean not null
);

insert into latecuts_test_results
select 'services_duration_constraint_exists',
       exists (
         select 1
         from pg_constraint
         where conname = 'services_duration_bounds'
           and conrelid = 'public.services'::regclass
       );

insert into latecuts_test_results
select 'spots_status_constraint_exists',
       exists (
         select 1
         from pg_constraint
         where conname = 'spots_status_values'
           and conrelid = 'public.spots'::regclass
       );

insert into latecuts_test_results
select 'spots_phone_hmac_partial_unique_exists',
       exists (
         select 1
         from pg_indexes
         where schemaname = 'public'
           and tablename = 'spots'
           and indexname = 'spots_active_phone_hmac_uidx'
           and indexdef ilike '%where status in%'
       );

insert into latecuts_test_results
select 'fcfs_index_exists',
       exists (
         select 1
         from pg_indexes
         where schemaname = 'public'
           and tablename = 'spots'
           and indexname = 'spots_fcfs_idx'
           and indexdef ilike '%day%'
           and indexdef ilike '%status%'
           and indexdef ilike '%joined_at%'
           and indexdef ilike '%token%'
       );

insert into latecuts_test_results
select 'retention_index_exists',
       exists (
         select 1
         from pg_indexes
         where schemaname = 'public'
           and tablename = 'spots'
           and indexname = 'spots_finished_retention_idx'
       );

insert into latecuts_test_results
select 'india_today_uses_asia_kolkata',
       pg_get_functiondef('public.india_today()'::regprocedure) ilike '%Asia/Kolkata%';

insert into latecuts_test_results
select 'queue_serialization_lock_exists',
       exists (
         select 1
         from pg_proc
         where proname = 'queue_serialization_lock'
           and pg_get_function_identity_arguments(oid) = 'p_day date'
       );

insert into latecuts_test_results
select 'public_projection_excludes_private_fields',
       not exists (
         select 1
         from pg_views
         where schemaname = 'public'
           and viewname in ('public_queue_state', 'public_spot_state')
           and (viewname = 'public_queue_state' and definition ilike '%phone%')
       );

do $$
declare
  failed text;
begin
  select name into failed
  from latecuts_test_results
  where passed = false
  limit 1;

  if failed is not null then
    raise exception 'LateCuts database foundation test failed: %', failed;
  end if;
end;
$$;

rollback;
