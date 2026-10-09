import type { Policy } from '@/data/types';
import { rateAuto, rateHome } from '@/lib/rating';
import { daysBetween } from '@/lib/billing';

function reRate(policy: Policy, state: string, multiPolicy: boolean) {
  if (policy.type === 'Auto' && policy.autoCoverages) return rateAuto(state, policy.drivers, policy.vehicles, policy.autoCoverages, { multiPolicy, payPlan: policy.payPlan, autoPay: policy.autoPay }).total;
  if (policy.type === 'Home' && policy.property && policy.homeCoverages) return rateHome(state, policy.property, policy.homeCoverages, { multiPolicy, earlyQuote: false, payPlan: policy.payPlan }).total;
  return policy.premium;
}

/** True when the customer holds both an ERIE auto and home policy (multi-policy discount). */
export const hasMultiPolicy = (policy: Policy, all: Policy[]) => all.filter((p) => p.customerId === policy.customerId && (p.type === 'Auto' || p.type === 'Home') && p.status !== 'Cancelled').length > 1;

/**
 * New annual premium after a change. The re-rated change is scaled against a re-rate of the
 * unchanged policy, so account-level credits baked into the issued premium are preserved and an
 * edit that doesn't affect price produces no charge.
 */
export function endorsedPremium(original: Policy, changed: Policy, state: string, multiPolicy: boolean) {
  const base = reRate(original, state, multiPolicy);
  const rated = reRate(changed, state, multiPolicy);
  return base > 0 ? Math.round((rated * original.premium) / base) : rated;
}

/** Pro-rata premium for the rest of the term: positive is additional premium, negative is a return. */
export function proRataChange(original: Policy, newPremium: number, effective: string) {
  const termDays = Math.max(1, daysBetween(original.effective, original.expiration));
  const remaining = Math.max(0, daysBetween(effective, original.expiration));
  return Math.round(((newPremium - original.premium) * remaining) / termDays * 100) / 100;
}

export const clampToTerm = (date: string, p: Policy) => (date < p.effective ? p.effective : date > p.expiration ? p.expiration : date);
export const dateInTerm = (date: string, p: Policy) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= p.effective && date <= p.expiration;
