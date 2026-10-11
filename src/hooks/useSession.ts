import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { api } from '@/lib/api';

interface SessionState {
  session: Session | null;
  loading: boolean;
}

/** Tracks the Supabase auth session and keeps it in sync. */
export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.getSession().then((s) => {
      if (active) {
        setSession(s);
        setLoading(false);
      }
    });
    const unsubscribe = api.onAuthChange((s) => setSession(s));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { session, loading };
}
