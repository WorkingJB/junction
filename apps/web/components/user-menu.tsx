'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function UserMenu() {
  const [displayName, setDisplayName] = useState<string>('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Fetch user profile to get first and last name
        const { data: profile } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single<{ first_name: string | null; last_name: string | null }>();

        if (profile?.first_name && profile?.last_name) {
          setDisplayName(`${profile.first_name} ${profile.last_name}`);
        } else if (profile?.first_name) {
          setDisplayName(profile.first_name);
        } else {
          setDisplayName(user.email || '');
        }
      }
    }
    getUser();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">{displayName}</span>
      <button
        onClick={handleSignOut}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Sign out
      </button>
    </div>
  );
}
