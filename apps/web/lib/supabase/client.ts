import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@orqestr/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Use memory storage instead of localStorage to avoid LockManager
        storage: {
          getItem: (key: string) => {
            if (typeof window === 'undefined') return null;
            return sessionStorage.getItem(key);
          },
          setItem: (key: string, value: string) => {
            if (typeof window === 'undefined') return;
            sessionStorage.setItem(key, value);
          },
          removeItem: (key: string) => {
            if (typeof window === 'undefined') return;
            sessionStorage.removeItem(key);
          },
        },
        // Disable features that use LockManager
        storageKey: 'sb-auth-token',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );
}
