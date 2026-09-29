import UpgradeButton from './UpgradeButton';
import { FREE_LIMIT, nextResetLabel } from '../lib/billing';

export default function Paywall() {
  return (
    <div className="paywall" role="alert">
      <p className="paywall-title">You’ve used all {FREE_LIMIT} free analyses this month.</p>
      <p className="paywall-text">
        Upgrade to Pro for unlimited analyses, $9/month, cancel anytime. Or wait until {nextResetLabel()} for your
        free analyses to reset.
      </p>
      <UpgradeButton className="button button-teal button-block">Upgrade to Pro · $9/month</UpgradeButton>
    </div>
  );
}
