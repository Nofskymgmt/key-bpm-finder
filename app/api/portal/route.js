import { stripe, supabaseAdmin, userFromRequest, json } from '../../lib/server';

// Opens the Stripe customer portal (cancel, update card, see invoices) and returns its URL.
export async function POST(request) {
  try {
    const user = await userFromRequest(request);
    if (!user) return json({ error: 'Please log in first.' }, 401);

    const { data: profile } = await supabaseAdmin()
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile?.stripe_customer_id) return json({ error: 'No subscription found for this account.' }, 400);

    const session = await stripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${new URL(request.url).origin}/analyze`,
    });
    return json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err);
    return json({ error: err.message }, 500);
  }
}
