import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// createClient throws when the URL is missing (e.g. env vars not set on the host),
// which would blank the whole app. Without credentials the portal runs on local demo data.
export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

if (!supabase) console.warn('Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are not set — using local demo data only.');
