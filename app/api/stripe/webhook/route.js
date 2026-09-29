import { stripe, syncSubscription, json, serverError } from '../../../lib/server';

// Stripe calls this after checkout and whenever a subscription changes or is canceled.
// This (not the checkout redirect) is what marks a user Pro, so it works even if they close the tab.
export async function POST(request) {
  const body = await request.text(); // raw body is required to verify Stripe's signature
  let event;
  try {
    event = stripe().webhooks.constructEvent(
      body,
      request.headers.get('stripe-signature'),
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature check failed:', err.message);
    return json({ error: 'Invalid signature.' }, 400);
  }

  try {
    const obj = event.data.object;
    switch (event.type) {
      case 'checkout.session.completed':
        if (obj.mode === 'subscription' && obj.subscription) {
          await syncSubscription(obj.subscription, obj.client_reference_id);
        }
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(obj.id);
        break;
      default:
        break; // other events aren't needed
    }
    return json({ received: true });
  } catch (err) {
    // A 500 makes Stripe retry the event later.
    return serverError(`Webhook ${event.type} failed:`, err);
  }
}
