import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, fullName, today, usePortal } from '@/data/store';

export type WorkKind = 'Underwriting' | 'Billing' | 'eSignature' | 'Leads' | 'Claims' | 'Renewals' | 'Quotes';
export type WorkItem = { id: string; kind: WorkKind; priority: 'high' | 'normal'; title: string; detail: string; to: string; action: string; date: string };

const DISMISS_KEY = 'erie-agentexchange-dismissed-work';
const SYNC_EVENT = 'erie-work-dismissed';
const loadDismissed = (): string[] => { try { return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]'); } catch { return []; } };

// Derives the agency's to-do list from current portal data, the way a carrier activity center does.
export function useWorkItems() {
  const { quotes, policies, billing, envelopes, leads, claims, customers } = usePortal();
  const [dismissed, setDismissed] = useState<string[]>(loadDismissed);
  const nameOf = useCallback((id: string) => { const c = customers.find((x) => x.id === id); return c ? fullName(c) : ''; }, [customers]);

  const all = useMemo(() => {
    const items: WorkItem[] = [];
    const now = today();
    quotes.filter((q) => q.status === 'Referred').forEach((q) => items.push({ id: `uw-${q.id}`, kind: 'Underwriting', priority: 'high', title: `Referral pending — ${fullName(q.applicant)}`, detail: `Quote ${q.id} needs underwriter approval before binding.`, to: `/quotes/${q.id}/${q.lastStep}`, action: 'Open quote', date: q.updatedAt.slice(0, 10) }));
    quotes.filter((q) => q.status === 'Quote').forEach((q) => {
      const ageDays = Math.floor((Date.now() - new Date(q.createdAt).getTime()) / 86400000);
      if (ageDays >= 2) items.push({ id: `qf-${q.id}`, kind: 'Quotes', priority: ageDays >= 25 ? 'high' : 'normal', title: `Follow up — ${fullName(q.applicant)}`, detail: `Quote ${q.id} is ${ageDays} days old${ageDays >= 25 ? ' and expires soon (30-day validity)' : ''}.`, to: `/quotes/${q.id}/${q.lastStep}`, action: 'Resume quote', date: q.updatedAt.slice(0, 10) });
    });
    policies.filter((p) => p.status === 'Pending Cancel').forEach((p) => items.push({ id: `pc-${p.number}`, kind: 'Billing', priority: 'high', title: `Pending cancellation — ${nameOf(p.customerId)}`, detail: `${p.type} ${p.number}: ${p.history[0]?.text ?? 'cancellation pending'}.`, to: `/policies/${p.number}`, action: 'Review policy', date: p.history[0]?.date ?? now }));
    billing.filter((b) => b.minimumDue > 0 && b.nextDueDate < now).forEach((b) => { const p = policies.find((x) => x.number === b.policyNumber); items.push({ id: `pd-${b.policyNumber}-${b.nextDueDate}`, kind: 'Billing', priority: 'high', title: `Past due ${b.minimumDue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} — ${p ? nameOf(p.customerId) : ''}`, detail: `${b.policyNumber} was due ${b.nextDueDate}. Collect payment to avoid cancellation.`, to: `/billing/pay?policy=${b.policyNumber}`, action: 'Take payment', date: b.nextDueDate }); });
    envelopes.filter((e) => e.status === 'Sent' || e.status === 'Viewed' || e.status === 'Expired').forEach((e) => items.push({ id: `es-${e.id}-${e.status}`, kind: 'eSignature', priority: e.status === 'Expired' ? 'high' : 'normal', title: `${e.status === 'Expired' ? 'Expired' : 'Awaiting'} signature — ${e.customer}`, detail: e.document, to: '/resources/esignature', action: e.status === 'Expired' ? 'Resend' : 'Send reminder', date: e.sent }));
    leads.filter((l) => l.status === 'New').forEach((l) => items.push({ id: `ld-${l.id}`, kind: 'Leads', priority: 'high', title: `New online lead — ${l.name}`, detail: `${l.interest} · ZIP ${l.zip} · ${l.source}`, to: '/resources/online-leads', action: 'Contact lead', date: l.received.slice(0, 10) }));
    claims.filter((c) => c.status !== 'Closed' && c.notes.length > 0).forEach((c) => { const last = c.notes[c.notes.length - 1]; if (last.date >= addDays(now, -7)) items.push({ id: `cl-${c.number}-${c.notes.length}`, kind: 'Claims', priority: 'normal', title: `Claim update — ${nameOf(c.customerId)}`, detail: `${c.number} (${c.status}): ${last.text}`, to: `/claims/${c.number}`, action: 'View claim', date: last.date }); });
    policies.filter((p) => p.status === 'Active' && p.expiration >= now && p.expiration <= addDays(now, 45) && p.type !== 'Life').forEach((p) => items.push({ id: `rn-${p.number}-${p.expiration}`, kind: 'Renewals', priority: 'normal', title: `Renewal ${p.expiration} — ${nameOf(p.customerId)}`, detail: `${p.type} ${p.number} renews in ${Math.ceil((new Date(p.expiration).getTime() - Date.now()) / 86400000)} days. Review coverages and cross-sell.`, to: `/policies/${p.number}`, action: 'Review renewal', date: p.expiration }));
    return items.sort((a, b) => (a.priority === b.priority ? b.date.localeCompare(a.date) : a.priority === 'high' ? -1 : 1));
  }, [quotes, policies, billing, envelopes, leads, claims, nameOf]);

  // Keep every mounted copy of the hook (header bell, work queue page) in sync.
  useEffect(() => {
    const sync = () => setDismissed(loadDismissed());
    window.addEventListener(SYNC_EVENT, sync);
    return () => window.removeEventListener(SYNC_EVENT, sync);
  }, []);

  const items = all.filter((i) => !dismissed.includes(i.id));
  const persist = (next: string[]) => {
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setDismissed(next);
    window.dispatchEvent(new Event(SYNC_EVENT));
  };
  const dismiss = useCallback((id: string) => persist([...loadDismissed(), id]), []);
  const restoreAll = useCallback(() => persist([]), []);
  return { items, dismissedCount: all.length - items.length, dismiss, restoreAll };
}
