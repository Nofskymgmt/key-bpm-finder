'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// null until the keys are added to .env.local; the analyzer still works without it.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const NOT_CONFIGURED =
  'Accounts aren’t set up yet: add your Supabase URL and anon key to .env.local, then restart the dev server.';

// The signed-in user (or null), kept in sync with Supabase's session.
export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { user, loading };
}

export function formatKey(key, scale) {
  return `${key} ${scale}`;
}

export function formatDay(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
