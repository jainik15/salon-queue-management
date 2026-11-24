import { readFileSync, readdirSync } from 'node:fs';

const migrations = readdirSync('supabase/migrations')
  .filter((name) => name.endsWith('.sql'))
  .sort();

if (migrations.length !== 7) {
  throw new Error(`Expected 7 Supabase migrations, found ${migrations.length}`);
}

const forbidden = [
  'SKIP LOCKED',
];

for (const migration of migrations) {
  const sql = readFileSync(`supabase/migrations/${migration}`, 'utf8');
  for (const token of forbidden) {
    if (sql.includes(token)) {
      throw new Error(`Forbidden foundation migration token "${token}" in ${migration}`);
    }
  }
}

const foundation = readFileSync('supabase/migrations/20261124120000_latecuts_database_foundation.sql', 'utf8');
const rls = readFileSync('supabase/migrations/20261124121000_latecuts_public_views_rls.sql', 'utf8');
const rpcs = readFileSync('supabase/migrations/20261124122000_latecuts_queue_rpc.sql', 'utf8');
const receptionRpcs = readFileSync('supabase/migrations/20261124124000_latecuts_reception_rpc.sql', 'utf8');
const barberRpcs = readFileSync('supabase/migrations/20261124125000_latecuts_barber_rpc.sql', 'utf8');
const ownerRpcs = readFileSync('supabase/migrations/20261124126000_latecuts_owner_rpc.sql', 'utf8');

const requiredFoundation = [
  'create table if not exists public.spots',
  'spots_active_phone_hmac_uidx',
  'spots_fcfs_idx',
  'spots_finished_retention_idx',
  'create table if not exists public.move_log',
  'create table if not exists public.staff_sessions',
  'create table if not exists public.recovery_links',
];

const requiredRls = [
  'alter table public.spots enable row level security',
  'public.public_queue_state',
  'public.public_spot_state',
  'queue_serialization_lock',
  'Asia/Kolkata',
];

for (const token of requiredFoundation) {
  if (!foundation.includes(token)) throw new Error(`Missing foundation token: ${token}`);
}

for (const token of requiredRls) {
  if (!rls.includes(token)) throw new Error(`Missing RLS/token: ${token}`);
}

const requiredRpcs = [
  'create or replace function public.join_queue',
  'create or replace function public.call_next',
  'create or replace function public.start_service',
  'create or replace function public.done_service',
  'create or replace function public.cancel_waiting',
  'create or replace function public.mark_no_show',
  'create or replace function public.set_break',
  'create or replace function public.staff_login',
  'create or replace function public.reception_queue',
  'create or replace function public.add_walk_in',
];

const allRpcSql = `${rpcs}\n${receptionRpcs}\n${barberRpcs}\n${ownerRpcs}`;

for (const token of requiredRpcs) {
  if (!allRpcSql.includes(token)) throw new Error(`Missing RPC: ${token}`);
}

console.log('Supabase foundation static checks passed.');
