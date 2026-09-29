'use client';

import { useState } from 'react';
import { startCheckout } from '../lib/billing';

// Sends the user to Stripe Checkout for Pro. Shows the real error if that fails.
export default function UpgradeButton({ className = 'button button-teal', children = 'Upgrade to Pro' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upgrade() {
    setBusy(true);
    setError('');
    try {
      await startCheckout(); // navigates away on success
    } catch (err) {
      console.error('Upgrade error:', err);
      setError(`Couldn’t start checkout: ${err.message}`);
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={upgrade} disabled={busy}>
        {busy ? <span className="spinner spinner-light" /> : children}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
