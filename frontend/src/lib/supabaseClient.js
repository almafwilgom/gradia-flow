import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn('Supabase environment variables are missing. Check .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'sb-auth-token'
  }
});

// Listen for auth changes in other tabs and sync
if (typeof window !== 'undefined') {
  // Handle storage events from other tabs
  window.addEventListener('storage', (event) => {
    if (event.key === 'sb-auth-token' && event.newValue !== event.oldValue) {
      console.log('[AUTH] Session changed in another tab, reloading auth state...');
      supabase.auth.onAuthStateChange((_event, session) => {
        console.log('[AUTH] Auth state updated from storage event');
      });
    }
  });
}
