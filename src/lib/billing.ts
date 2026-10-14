import type { BillingAccount, PaymentMethod, Policy } from '@/data/types';
import { payPlanInstallments } from '@/lib/rating';

// Billing rules for the demo portal. The 30-day grace period and $10 late fee follow published
// descriptions of ERIE billing; the reinstatement fee is illustrative.
export const GRACE_DAYS = 30;
export const LATE_FEE = 10;
export const REINSTATEMENT_FEE = 25;

export type InstallmentStatus = 'Paid' | 'Partially paid' | 'Due' | 'Overdue' | 'Upcoming';
export type Installment = { n: number; due: string; amount: number; paid: number; status: InstallmentStatus };

const round2 = (n: number) => Math.round(n * 100) / 100;
const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayLocal = () => localDate(new Date());

function addMonths(date: string, months: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return localDate(d);
}

export const daysBetween = (from: string, to: string) => Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000);

type BillingTerm = Pick<Policy, 'effective' | 'expiration' | 'payPlan'>;

/** Start of the current billing year: the effective date, or the latest anniversary for multi-year terms (life). */
function billingYearStart(policy: BillingTerm, today = todayLocal()) {
  if (daysBetween(policy.effective, policy.expiration) <= 400) return policy.effective;
  let start = policy.effective;
  while (addMonths(start, 12) <= today) start = addMonths(start, 12);
  return start;
}

// The 9-pay plan bills 9 consecutive months; the others spread evenly over the year.
export const monthStep = (count: number) => (count === 9 ? 1 : 12 / count);

/** Installment due dates for the current billing year. */
export function dueDates(policy: BillingTerm) {
  const count = payPlanInstallments[policy.payPlan];
  const start = billingYearStart(policy);
  return Array.from({ length: count }, (_, i) => addMonths(start, Math.round(monthStep(count) * i)));
}

/**
 * Next bill after the balance changes. The remaining balance is spread evenly over the
 * installments still to come — additional premium from a policy change is never billed back
 * onto installments that were already paid.
 */
export function rebill(policy: BillingTerm, balance: number, nextDueDate: string) {
  if (balance <= 0.005) return { nextDueDate, minimumDue: 0 };
  const remaining = dueDates(policy).filter((d) => d >= nextDueDate).length || 1;
  return { nextDueDate, minimumDue: round2(Math.min(balance, balance / remaining)) };
}

/** After a payment of `amount`: advance to the next installment once the current one is satisfied. */
export function afterPayment(policy: BillingTerm, account: Pick<BillingAccount, 'balance' | 'minimumDue' | 'nextDueDate'>, amount: number) {
  const balance = round2(Math.max(0, account.balance - amount));
  if (amount + 0.005 < account.minimumDue) return { balance, nextDueDate: account.nextDueDate, minimumDue: round2(account.minimumDue - amount) };
  // Overpayment beyond the current installment reduces what remains; the next date comes from the plan.
  const next = dueDates(policy).find((d) => d > account.nextDueDate) ?? account.nextDueDate;
  return { balance, ...rebill(policy, balance, next) };
}

/**
 * Installment schedule anchored to the account's next due date: earlier installments are paid,
 * the current one is the minimum due (overdue once its date passes), later ones share the rest.
 */
export function installmentSchedule(policy: Policy, account: BillingAccount, today = todayLocal()): Installment[] {
  const dates = dueDates(policy);
  const premiumPaid = round2(account.payments.filter((p) => !p.kind || p.kind === 'Installment' || p.kind === 'Down payment').reduce((t, p) => t + p.amount, 0));
  const settled = account.balance <= 0.005;
  const paidRows = settled ? dates.length : dates.filter((d) => d < account.nextDueDate).length;
  const paidEach = paidRows ? round2(premiumPaid / paidRows) : 0;
  const open = dates.length - paidRows;
  const current = settled ? 0 : Math.min(account.minimumDue || account.balance, account.balance);
  const restEach = open > 1 ? round2((account.balance - current) / (open - 1)) : 0;
  return dates.map((due, i) => {
    if (i < paidRows) {
      const amount = i === paidRows - 1 ? round2(premiumPaid - paidEach * (paidRows - 1)) : paidEach;
      return { n: i + 1, due, amount, paid: amount, status: 'Paid' as const };
    }
    const k = i - paidRows;
    const amount = k === 0 ? round2(current) : k === open - 1 ? round2(account.balance - current - restEach * (open - 2)) : restEach;
    const status: InstallmentStatus = due < today ? 'Overdue' : k === 0 ? 'Due' : 'Upcoming';
    return { n: i + 1, due, amount, paid: 0, status };
  });
}

export function pastDue(policy: Policy, account: BillingAccount, today = todayLocal()) {
  return round2(installmentSchedule(policy, account, today).filter((i) => i.status === 'Overdue').reduce((t, i) => t + i.amount - i.paid, 0));
}

/** Amount required to reinstate a policy cancelled or pending cancellation for non-payment. */
export function reinstatementQuote(policy: Policy, account: BillingAccount, cancelDate: string | undefined, today = todayLocal()) {
  const overdue = pastDue(policy, account, today) || account.minimumDue;
  const lapsed = policy.status === 'Cancelled';
  const daysSinceCancel = lapsed && cancelDate ? Math.max(0, daysBetween(cancelDate, today)) : 0;
  // Within the grace window the policy is reinstated with no lapse; after it, coverage resumes with a gap.
  const noLapse = !lapsed || daysSinceCancel <= GRACE_DAYS;
  const fees = [{ label: 'Late fee', amount: LATE_FEE }, ...(lapsed ? [{ label: 'Reinstatement fee', amount: REINSTATEMENT_FEE }] : [])];
  return { pastDue: round2(overdue), fees, total: round2(overdue + fees.reduce((t, f) => t + f.amount, 0)), noLapse, daysSinceCancel, lapsed };
}

// ---- Card and bank validation --------------------------------------------------------------

export function cardBrand(number: string): PaymentMethod['brand'] | null {
  const n = number.replace(/\D/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^6(011|5)/.test(n)) return 'Discover';
  return null;
}

/** Luhn checksum used by every card network. */
export function luhnValid(number: string) {
  const digits = number.replace(/\D/g, '');
  if (digits.length < 13) return false;
  let total = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    total += d;
  }
  return total % 10 === 0;
}

export function validCard(number: string) {
  const n = number.replace(/\D/g, '');
  const brand = cardBrand(n);
  if (!brand) return 'Card must be Visa, Mastercard, American Express or Discover.';
  if (brand === 'Amex' ? n.length !== 15 : n.length !== 16) return `${brand} card numbers are ${brand === 'Amex' ? 15 : 16} digits.`;
  if (!luhnValid(n)) return 'Card number is not valid — check the digits.';
  return '';
}

/** ABA routing numbers are 9 digits with a weighted checksum. */
export function validRouting(routing: string) {
  if (!/^\d{9}$/.test(routing)) return false;
  const d = routing.split('').map(Number);
  return (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8])) % 10 === 0;
}

export const methodLabel = (m: PaymentMethod) => (m.kind === 'card' ? `${m.brand} ••${m.last4}` : `${m.bankName ? `${m.bankName} ` : ''}${m.brand} ••${m.last4}`);
