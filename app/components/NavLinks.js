'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, useUser, formatDay } from '../lib/supabase';
import { useUsage, openBillingPortal } from '../lib/billing';
import UpgradeButton from './UpgradeButton';

function AccountMenu({ user }) {
  const router = useRouter();
  const { usage, isPro } = useUsage(user);
  const [open, setOpen] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalError, setPortalError] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  async function manage() {
    setPortalBusy(true);
    setPortalError('');
    try {
      await openBillingPortal(); // navigates away on success
    } catch (err) {
      console.error('Portal error:', err);
      setPortalError(`Couldn’t open subscription settings: ${err.message}`);
      setPortalBusy(false);
    }
  }

  async function logOut() {
    await supabase.auth.signOut();
    setOpen(false);
    router.push('/');
  }

  let planLine = 'Loading plan…';
  if (usage && isPro)
    planLine = usage.cancel_at_period_end && usage.current_period_end
      ? `Pro · ends ${formatDay(usage.current_period_end)}`
      : 'Pro · unlimited analyses';
  else if (usage) planLine = `Free · ${usage.used} of ${usage.monthly_limit} used this month`;

  return (
    <div className="account" ref={ref}>
      <button
        type="button"
        className="nav-link nav-button account-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Account
        {isPro && <span className="pro-badge">Pro</span>}
      </button>
      {open && (
        <div className="account-menu glass" role="menu">
          <p className="account-email">{user.email}</p>
          <p className="account-plan">{planLine}</p>
          <div className="account-actions">
            {isPro ? (
              <button type="button" className="menu-item" role="menuitem" onClick={manage} disabled={portalBusy}>
                {portalBusy ? 'Opening…' : 'Manage subscription'}
              </button>
            ) : (
              usage && <UpgradeButton className="button button-teal button-block button-small" />
            )}
            {portalError && <p className="error">{portalError}</p>}
            <button type="button" className="menu-item" role="menuitem" onClick={logOut}>
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NavLinks() {
  const { user, loading } = useUser();

  return (
    <>
      <Link href="/analyze" className="nav-link">
        Analyze
      </Link>
      {user && (
        <Link href="/history" className="nav-link">
          History
        </Link>
      )}
      {!loading &&
        (user ? (
          <AccountMenu user={user} />
        ) : (
          <Link href="/login" className="nav-link">
            Log in
          </Link>
        ))}
    </>
  );
}
