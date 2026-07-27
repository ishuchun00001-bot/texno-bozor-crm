import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://yzkfpxzenvwobyzxosqf.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6a2ZweHplbnZ3b2J5enhvc3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0Mzg4NjgsImV4cCI6MjEwMDAxNDg2OH0.1aVEaPjY6Upq67wTNC_fqtWkpqW-RpRqLRBi6tUTFSY';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('products').select('id').limit(1);
    if (error) {
      console.error('Supabase Connection Error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true, data };
  } catch (err) {
    console.error('Supabase Network Error:', err);
    return { ok: false, error: err.message };
  }
};
