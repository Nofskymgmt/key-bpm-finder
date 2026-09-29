'use client';

import Link from 'next/link';
import { useUser } from '../lib/supabase';
import { useUsage } from '../lib/billing';
import UpgradeButton from './UpgradeButton';

// The button on a landing-page pricing card. Logged out: "Sign Up". Logged in: depends on plan.
export default function PlanButton({ plan, className }) {
  const { user } = useUser();
  const { usage, isPro } = useUsage(user);
  const cls = `button ${className} button-block`;

  if (!user || !usage)
    return (
      <Link href="/signup" className={cls}>
        Sign Up
      </Link>
    );

  if (plan === 'pro' && !isPro) return <UpgradeButton className={cls}>Upgrade to Pro</UpgradeButton>;

  const current = (plan === 'pro') === isPro;
  return (
    <Link href="/analyze" className={cls}>
      {current ? 'Your plan · Analyze a song' : 'Analyze a song'}
    </Link>
  );
}
