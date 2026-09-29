import { stripe, supabaseAdmin, userFromRequest, json } from '../../lib/server';

// Starts a Stripe Checkout for the Pro subscription and returns its URL.
export async function POST(request) {
  try {
    const user = await userFromRequest(request);
    if (!user) return json({ error: 'Please log in first.' }, 401);
    if (!process.env.STRIPE_PRO_PRICE_ID) throw new Error('Missing STRIPE_PRO_PRICE_ID.');

    const db = supabaseAdmin();
    const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (profile?.plan === 'pro') return json({ error: 'You’re already on Pro.' }, 400);

    // Reuse the user's Stripe customer so their subscription and card stay in one place.
    // A customer saved in test mode doesn't exist in live mode (or vice versa): make a new one.
    let customerId = profile?.stripe_customer_id;
    if (customerId) {
      const existing = await stripe().customers.retrieve(customerId).catch((err) => {
        if (err.code === 'resource_missing') return null;
        throw err;
      });
      if (!existing || existing.deleted) customerId = null;
    }
    if (!customerId) {
      const customer = await stripe().customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      const { error } = await db.from('profiles').upsert({ id: user.id, stripe_customer_id: customerId });
      if (error) throw new Error(`Couldn't save Stripe customer: ${error.message}`);
    }

    const origin = new URL(request.url).origin;
    const session = await stripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
      subscription_data: { metadata: { supabase_user_id: user.id } },
      success_url: `${origin}/analyze?checkout=success`,
      cancel_url: `${origin}/analyze?checkout=cancelled`,
    });
    return json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return json({ error: err.message }, 500);
  }
}
