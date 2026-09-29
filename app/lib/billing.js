'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export const FREE_LIMIT = 5;
const USAGE_CHANGED = 'usage-changed';

// Tell every useUsage() on the page to refetch (e.g. after an analysis is saved).
export function notifyUsageChanged() {
  window.dispatchEvent(new Event(USAGE_CHANGED));
}

// The signed-in user's plan and this month's usage, straight from the database.
export function useUsage(user) {
  const [usage, setUsage] = useState(null); // { plan, used, monthly_limit, cancel_at_period_end, current_period_end }
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      setUsage(null);
      return null;
    }
    const { data, error } = await supabase.rpc('my_usage');
    if (error) {
      console.error('Usage error:', error);
      setError(error.message);
      return null;
    }
    setError('');
    const row = data?.[0] ?? null;
    setUsage(row);
    return row;
  }, [user]);

  useEffect(() => {
    refresh();
    window.addEventListener(USAGE_CHANGED, refresh);
    return () => window.removeEventListener(USAGE_CHANGED, refresh);
  }, [refresh]);

  const isPro = usage?.plan === 'pro';
  const remaining = usage ? Math.max(0, usage.monthly_limit - usage.used) : null;
  return { usage, isPro, remaining, atLimit: Boolean(usage && !isPro && remaining === 0), refresh, error };
}

// POST to one of our API routes as the logged-in user, then go to the Stripe URL it returns.
async function goToStripe(path) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.url) throw new Error(body.error || `Request failed (${res.status})`);
  window.location.href = body.url;
}

export const startCheckout = () => goToStripe('/api/checkout');
export const openBillingPortal = () => goToStripe('/api/portal');

// e.g. "Oct 1" — when the free monthly count resets (start of next month, UTC).
export function nextResetLabel() {
  const now = new Date();
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return reset.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
