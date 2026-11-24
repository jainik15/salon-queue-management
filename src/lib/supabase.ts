import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured =
  Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export type JoinRpcArgs = {
  p_name: string;
  p_phone: string;
  p_service_ids: string[];
  p_preference_barber_id: string | null;
  p_join_request_id: string;
};

export type PrivateStatusRpcArgs = {
  p_spot_id: string;
  p_customer_capability: string;
};

export type CancelRpcArgs = {
  p_spot_id: string;
  p_customer_capability: string;
};
