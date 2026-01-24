import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Graceful fallback or error logging if needed, though usually we want to know if config is missing
  console.warn('Supabase credentials missing. Check .env');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
