import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Graceful fallback or error logging if needed, though usually we want to know if config is missing
  console.warn('Supabase credentials missing. Check .env');
}

// Fallback to user-provided keys if env vars are missing (Critical for deployment stability)
const FALLBACK_URL = 'https://birypkfferkwukogyhnb.supabase.co';
const FALLBACK_KEY = 'sb_publishable_hDYAa8ljlY83Xmnf7xlc3Q_mA4cL7A0'; // User provided 2026-01-26

export const supabase = createClient(
  supabaseUrl || FALLBACK_URL,
  supabaseAnonKey || FALLBACK_KEY
);
