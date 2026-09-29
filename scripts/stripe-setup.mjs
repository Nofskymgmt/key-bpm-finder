// One-time Stripe setup. Safe to re-run: it reuses what already exists.
//   node scripts/stripe-setup.mjs                          -> product/price + customer portal (test key)
//   node scripts/stripe-setup.mjs https://your.site        -> also creates the webhook for that site
//   node scripts/stripe-setup.mjs https://your.site --live -> same, with a LIVE key (real payments)
// Reads STRIPE_SECRET_KEY from .env.local, or STRIPE_LIVE_SECRET_KEY with --live.
import { readFileSync } from 'fs';
import Stripe from 'stripe';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()])
);

const live = process.argv.includes('--live');
const keyName = live ? 'STRIPE_LIVE_SECRET_KEY' : 'STRIPE_SECRET_KEY';
const key = env[keyName];
if (!key) throw new Error(`${keyName} is empty in .env.local`);
if (live && !/^(sk|rk)_live_/.test(key)) throw new Error(`Refusing to run: --live needs a LIVE key (sk_live_...) in ${keyName}.`);
if (!live && !/^(sk|rk)_test_/.test(key)) throw new Error(`Refusing to run: ${keyName} is not a TEST key (sk_test_...). Use --live for live mode.`);
console.log(live ? 'LIVE MODE: real payments.' : 'Test mode.');
const stripe = new Stripe(key);

// 1. Pro product + $9/month price (found again later by its lookup key)
let [price] = (await stripe.prices.list({ lookup_keys: ['pro_monthly'], expand: ['data.product'] })).data;
if (!price) {
  const product = await stripe.products.create({ name: 'Key & BPM Finder Pro', description: 'Unlimited song analyses' });
  price = await stripe.prices.create({
    product: product.id,
    unit_amount: 900,
    currency: 'usd',
    recurring: { interval: 'month' },
    lookup_key: 'pro_monthly',
  });
  console.log('Created Pro product and $9/month price.');
} else {
  console.log('Pro price already exists.');
}

// 2. Customer portal: let people cancel and update their card
const portalFeatures = {
  subscription_cancel: { enabled: true, mode: 'at_period_end' },
  payment_method_update: { enabled: true },
  invoice_history: { enabled: true },
};
const [existingPortal] = (await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 })).data;
if (existingPortal) {
  await stripe.billingPortal.configurations.update(existingPortal.id, { features: portalFeatures });
  console.log('Updated customer portal settings.');
} else {
  await stripe.billingPortal.configurations.create({
    business_profile: { headline: 'Key & BPM Finder: manage your Pro subscription' },
    features: portalFeatures,
  });
  console.log('Created customer portal settings.');
}

// 3. Webhook for the deployed site
const site = process.argv.slice(2).find((a) => a.startsWith('http'))?.replace(/\/$/, '');
let webhookSecret = null;
if (site) {
  const url = `${site}/api/stripe/webhook`;
  const events = [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ];
  const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data.find((w) => w.url === url);
  if (existing) {
    await stripe.webhookEndpoints.update(existing.id, { enabled_events: events });
    console.log(`Webhook for ${url} already exists (its signing secret is only shown once, in the Stripe dashboard).`);
  } else {
    const hook = await stripe.webhookEndpoints.create({ url, enabled_events: events });
    webhookSecret = hook.secret;
    console.log(`Created webhook: ${url}`);
  }
}

console.log('\nSTRIPE_PRO_PRICE_ID=' + price.id);
if (webhookSecret) console.log('STRIPE_WEBHOOK_SECRET=' + webhookSecret);
