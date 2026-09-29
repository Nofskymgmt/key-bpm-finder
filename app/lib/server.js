// Server-only helpers for the API routes. Never import this from a 'use client' file:
// it uses secret keys that must not reach the browser.
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Add it to your environment variables (see .env.local).`);
  return value;
}

export function stripe() {
  return new Stripe(required('STRIPE_SECRET_KEY'));
}

// Supabase with the secret key: bypasses row-level security, so only use it for trusted writes.
export function supabaseAdmin() {
  return createClient(required('NEXT_PUBLIC_SUPABASE_URL'), required('SUPABASE_SECRET_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// The logged-in user, from the "Authorization: Bearer <access token>" header the app sends.
export async function userFromRequest(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!token) return null;
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  return error ? null : data.user;
}

export function json(body, status = 200) {
  return Response.json(body, { status });
}

// For unexpected failures: log the details (visible in Vercel's logs), show the user something generic.
export function serverError(label, err) {
  console.error(label, err);
  return json({ error: 'Something went wrong on our side. Please try again in a moment.' }, 500);
}

export const PRO_STATUSES = ['active', 'trialing'];

// The customer's subscription that currently grants Pro, if any.
export async function activeSubscription(customerId) {
  const subs = await stripe().subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
  return subs.data.find((s) => PRO_STATUSES.includes(s.status)) || null;
}

// Copy the customer's current subscription state onto the user's profile. Always re-fetches from
// Stripe, so webhook events arriving out of order can't leave stale data. Looks at ALL of the
// customer's subscriptions, so cancelling a duplicate can't downgrade someone still paying.
export async function syncSubscription(subscriptionId, fallbackUserId) {
  const changed = await stripe().subscriptions.retrieve(subscriptionId);
  const customerId = typeof changed.customer === 'string' ? changed.customer : changed.customer.id;
  const sub = (await activeSubscription(customerId)) || changed;
  const db = supabaseAdmin();

  let userId = sub.metadata?.supabase_user_id || changed.metadata?.supabase_user_id || fallbackUserId;
  if (!userId) {
    const { data } = await db.from('profiles').select('id').eq('stripe_customer_id', customerId).maybeSingle();
    userId = data?.id;
  }
  if (!userId) throw new Error(`No user found for Stripe customer ${customerId}`);

  const periodEnd = sub.items?.data?.[0]?.current_period_end;
  const { error } = await db.from('profiles').upsert({
    id: userId,
    plan: PRO_STATUSES.includes(sub.status) ? 'pro' : 'free',
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end || sub.cancel_at),
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Couldn't update profile: ${error.message}`);
  return { userId, status: sub.status };
}
