import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ageFrom, rateAuto, rateBoat, rateHome, rateLife } from '@/lib/rating';
import { AGENT, createSeed, defaultAutoCoverages, defaultBoat, defaultHomeCoverages, defaultLife, defaultProperty, PortalData } from '@/data/seed';
import type { BillingAccount, BusinessDetails, Claim, Customer, Envelope, Lead, Payment, Policy, PolicyType, Quote, Toast } from '@/data/types';

const STORAGE_KEY = 'erie-agentexchange-demo-v1';

const today = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString().slice(0, 19);
const randomDigits = (length: number) => Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
const addYears = (date: string, years: number) => { const d = new Date(`${date}T12:00:00`); d.setFullYear(d.getFullYear() + years); return d.toISOString().slice(0, 10); };
const addDays = (date: string, days: number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const addMonths = (date: string, months: number) => { const d = new Date(`${date}T12:00:00`); d.setMonth(d.getMonth() + months); return d.toISOString().slice(0, 10); };

const policyPrefix: Record<PolicyType, string> = { Auto: 'A05', Home: 'H07', Boat: 'B09', Life: 'L22', Umbrella: 'U03', Business: 'Q97' };
const adjusters = [
  { name: 'Megan Reilly', phone: '(800) 367-3743 x4471', email: 'megan.reilly@erieinsurance.example' },
  { name: 'Carlos Medina', phone: '(800) 367-3743 x5120', email: 'carlos.medina@erieinsurance.example' },
  { name: 'Priya Desai', phone: '(800) 367-3743 x6204', email: 'priya.desai@erieinsurance.example' },
  { name: 'Jordan Pike', phone: '(800) 367-3743 x3318', email: 'jordan.pike@erieinsurance.example' },
];

function loadData(): PortalData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // Activity saved under the previous account owner is re-attributed to the current one.
      const data = JSON.parse(raw.split('Vito Bitanghol').join(AGENT.name).split('Bitanghol Insurance Agency, LLC').join(AGENT.agency)) as PortalData;
      // Quotes saved before boat/life quoting existed get default details.
      return { ...data, quotes: data.quotes.map((q) => ({ ...q, boat: q.boat ?? { ...defaultBoat }, life: q.life ?? { ...defaultLife } })) };
    }
  } catch {
    // Storage can be unavailable (private mode); fall back to seed data.
  }
  return createSeed();
}

export function newQuoteDraft(applicant: Quote['applicant'], customerId?: string): Quote {
  const stamp = nowIso();
  return {
    id: `Q-26-${randomDigits(6)}`,
    customerId,
    applicant,
    products: [],
    agentNumbers: {},
    status: 'Quote',
    effectiveDate: addDays(today(), 7),
    underwriting: {},
    drivers: [],
    vehicles: [],
    autoCoverages: { ...defaultAutoCoverages },
    property: { ...defaultProperty },
    homeCoverages: { ...defaultHomeCoverages },
    boat: { ...defaultBoat },
    life: { ...defaultLife },
    priorCarrier: '',
    priorYears: 0,
    payPlan: 'Monthly',
    autoPay: true,
    signatureMethod: '',
    issuedPolicies: [],
    createdAt: stamp,
    updatedAt: stamp,
    lastStep: 'underwriting',
  };
}

export function quotePremiums(quote: Quote) {
  const multiPolicy = quote.products.filter((p) => p === 'auto' || p === 'home').length > 1;
  const daysOut = (new Date(quote.effectiveDate).getTime() - Date.now()) / 86400000;
  return {
    auto: quote.products.includes('auto') ? rateAuto(quote.applicant.state, quote.drivers, quote.vehicles, quote.autoCoverages, { multiPolicy, payPlan: quote.payPlan, autoPay: quote.autoPay }) : null,
    home: quote.products.includes('home') ? rateHome(quote.applicant.state, quote.property, quote.homeCoverages, { multiPolicy, earlyQuote: daysOut >= 7, payPlan: quote.payPlan }) : null,
    boat: quote.products.includes('boat') ? rateBoat(quote.applicant.state, quote.boat, { multiPolicy: quote.products.length > 1, payPlan: quote.payPlan }) : null,
    life: quote.products.includes('life') ? rateLife(ageFrom(quote.applicant.dob), quote.life) : null,
  };
}

export const premiumTotal = (premiums: ReturnType<typeof quotePremiums>) => (premiums.auto?.total ?? 0) + (premiums.home?.total ?? 0) + (premiums.boat?.total ?? 0) + (premiums.life?.total ?? 0);

type StoreValue = PortalData & {
  toasts: Toast[];
  notify: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  saveQuote: (quote: Quote) => void;
  deleteQuotes: (ids: string[]) => void;
  archiveQuotes: (ids: string[], archived: boolean) => void;
  issueQuote: (id: string) => string[];
  updateCustomer: (customer: Customer) => void;
  issueBusinessPolicy: (business: BusinessDetails, terms: { premium: number; effective: string; payPlan: Policy['payPlan']; autoPay: boolean; agentNumber: string }) => string;
  updatePolicy: (number: string, patch: Partial<Policy>, historyText: string) => void;
  cancelPolicy: (number: string, reason: string, date: string) => void;
  reinstatePolicy: (number: string) => void;
  addClaim: (claim: Omit<Claim, 'number' | 'status' | 'adjuster' | 'reserve' | 'paid' | 'notes' | 'payments' | 'reportedDate'>) => string;
  updateClaim: (number: string, patch: Partial<Claim>, note?: string) => void;
  makePayment: (policyNumber: string, amount: number, method: string) => Payment;
  adjustBalance: (policyNumber: string, delta: number) => void;
  setAutoPay: (policyNumber: string, enabled: boolean, account: string) => void;
  updateLead: (id: string, status: Lead['status']) => void;
  addEnvelope: (envelope: Omit<Envelope, 'id' | 'sent' | 'status'>) => void;
  updateEnvelope: (id: string, status: Envelope['status']) => void;
  resetDemo: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function PortalStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PortalData>(loadData);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, [data]);

  // Merge any shared demo customers stored in Supabase into the local book.
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    void (async () => {
      const { data: rows, error } = await client.from('portal_customers').select('id, first_name, middle_name, last_name, address, city, state, zip, date_of_birth');
      if (!active || error || !rows) return;
      setData((current) => {
        const known = new Set(current.customers.map((c) => `${c.firstName} ${c.lastName}`.toLowerCase()));
        const additions: Customer[] = rows
          .filter((row) => !known.has(`${row.first_name} ${row.last_name}`.toLowerCase()))
          .map((row) => ({ id: row.id, firstName: row.first_name, middleName: row.middle_name, lastName: row.last_name, address: row.address, city: row.city, state: row.state, zip: row.zip, dob: row.date_of_birth, phone: '', email: '', customerSince: today() }));
        return additions.length ? { ...current, customers: [...current.customers, ...additions] } : current;
      });
    })();
    return () => { active = false; };
  }, []);

  const notify = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = ++toastId.current;
    setToasts((current) => [...current, { id, text, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4200);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const saveQuote = useCallback((quote: Quote) => {
    setData((current) => {
      const exists = current.quotes.some((q) => q.id === quote.id);
      const next = { ...quote, updatedAt: nowIso() };
      return { ...current, quotes: exists ? current.quotes.map((q) => (q.id === quote.id ? next : q)) : [next, ...current.quotes] };
    });
  }, []);

  const deleteQuotes = useCallback((ids: string[]) => setData((current) => ({ ...current, quotes: current.quotes.filter((q) => !ids.includes(q.id)) })), []);
  const archiveQuotes = useCallback((ids: string[], archived: boolean) => setData((current) => ({ ...current, quotes: current.quotes.map((q) => (ids.includes(q.id) ? { ...q, status: archived ? 'Archived' : 'Quote', updatedAt: nowIso() } : q)) })), []);

  const issueQuote = useCallback((id: string) => {
    const issued: string[] = [];
    const current = dataRef.current;
    const quote = current.quotes.find((q) => q.id === id);
    if (!quote) return issued;
    {
      const premiums = quotePremiums(quote);
      let customers = current.customers;
      let customerId = quote.customerId;
      if (!customerId || !customers.some((c) => c.id === customerId)) {
        const existing = customers.find((c) => c.firstName.toLowerCase() === quote.applicant.firstName.toLowerCase() && c.lastName.toLowerCase() === quote.applicant.lastName.toLowerCase());
        if (existing) customerId = existing.id;
        else {
          customerId = `C-${randomDigits(6)}`;
          customers = [...customers, { id: customerId, ...quote.applicant, customerSince: quote.effectiveDate }];
        }
      }
      const newPolicies: Policy[] = [];
      const newBilling: BillingAccount[] = [];
      const make = (type: PolicyType, premium: number, extra: Partial<Policy>) => {
        const number = `${policyPrefix[type]}-${randomDigits(7)}`;
        issued.push(number);
        const installments = { Annual: 1, Quarterly: 4, '9 Month': 9, Monthly: 12 }[quote.payPlan];
        newPolicies.push({ number, type, customerId: customerId!, status: 'Active', effective: quote.effectiveDate, expiration: addYears(quote.effectiveDate, 1), premium, payPlan: quote.payPlan, autoPay: quote.autoPay, agentNumber: quote.agentNumbers[type.toLowerCase() as 'auto'] ?? AGENT.agentNumbers[0], drivers: [], vehicles: [], description: '', documents: [{ name: 'Declarations Page', date: quote.effectiveDate, kind: 'Declarations' }, { name: 'Signed Application', date: today(), kind: 'Application' }, { name: 'Initial Bill', date: today(), kind: 'Bill' }], history: [{ date: today(), text: `New business issued from quote ${quote.id}`, by: AGENT.name }], quoteId: quote.id, ...extra });
        newBilling.push({ policyNumber: number, balance: premium, nextDueDate: quote.effectiveDate, minimumDue: Math.round((premium / installments) * 100) / 100, payments: [] });
      };
      if (premiums.auto) make('Auto', premiums.auto.total, { drivers: quote.drivers, vehicles: quote.vehicles, autoCoverages: quote.autoCoverages, description: `${quote.vehicles.length} vehicle${quote.vehicles.length === 1 ? '' : 's'} · ${quote.drivers.length} driver${quote.drivers.length === 1 ? '' : 's'}`, documents: [{ name: 'Auto ID Cards', date: quote.effectiveDate, kind: 'ID Card' }, { name: 'Declarations Page', date: quote.effectiveDate, kind: 'Declarations' }, { name: 'Signed Application', date: today(), kind: 'Application' }] });
      if (premiums.home) make('Home', premiums.home.total, { property: quote.property, homeCoverages: quote.homeCoverages, description: `ErieSecure Home · ${quote.applicant.address}` });
      if (premiums.boat) make('Boat', premiums.boat.total, { boat: quote.boat, description: `${quote.boat.year} ${quote.boat.make} ${quote.boat.model} · ${quote.boat.length} ft · ${quote.boat.horsepower} HP` });
      if (premiums.life) make('Life', premiums.life.total, { life: quote.life, expiration: addYears(quote.effectiveDate, quote.life.term), status: quote.underwriting._approved === 'yes' ? 'Pending Issue' : 'Active', description: `ERIExpress Life · ${quote.life.term}-year term · $${quote.life.faceAmount.toLocaleString()} face` });
      const next: PortalData = {
        ...current,
        customers,
        policies: [...newPolicies, ...current.policies],
        billing: [...newBilling, ...current.billing],
        quotes: current.quotes.map((q) => (q.id === id ? { ...q, customerId, status: 'Issued', issuedPolicies: [...issued], updatedAt: nowIso() } : q)),
      };
      dataRef.current = next;
      setData(next);
    }
    return issued;
  }, []);

  const updateCustomer = useCallback((customer: Customer) => setData((current) => ({ ...current, customers: current.customers.map((c) => (c.id === customer.id ? customer : c)) })), []);

  const issueBusinessPolicy: StoreValue['issueBusinessPolicy'] = useCallback((business, terms) => {
    const current = dataRef.current;
    const number = `${policyPrefix.Business}-${randomDigits(7)}`;
    const existing = current.customers.find((c) => c.firstName.toLowerCase() === business.ownerFirst.toLowerCase() && c.lastName.toLowerCase() === business.ownerLast.toLowerCase());
    const customerId = existing?.id ?? `C-${randomDigits(6)}`;
    const customers = existing ? current.customers : [...current.customers, { id: customerId, firstName: business.ownerFirst, middleName: '', lastName: business.ownerLast, address: business.address, city: business.city, state: business.state, zip: business.zip, dob: '', phone: business.phone, email: business.email, customerSince: terms.effective }];
    const installments = { Annual: 1, Quarterly: 4, '9 Month': 9, Monthly: 12 }[terms.payPlan];
    const policy: Policy = { number, type: 'Business', customerId, status: 'Active', effective: terms.effective, expiration: addYears(terms.effective, 1), premium: terms.premium, payPlan: terms.payPlan, autoPay: terms.autoPay, agentNumber: terms.agentNumber, drivers: [], vehicles: [], business, description: `ErieSecure Business® · ${business.businessName}`, documents: [{ name: 'Commercial Declarations', date: terms.effective, kind: 'Declarations' }, { name: 'Signed Commercial Application', date: today(), kind: 'Application' }, { name: 'Initial Bill', date: today(), kind: 'Bill' }], history: [{ date: today(), text: `New business issued — ErieSecure Business® for ${business.businessName}`, by: AGENT.name }] };
    const next: PortalData = { ...current, customers, policies: [policy, ...current.policies], billing: [{ policyNumber: number, balance: terms.premium, nextDueDate: terms.effective, minimumDue: Math.round((terms.premium / installments) * 100) / 100, payments: [] }, ...current.billing] };
    dataRef.current = next;
    setData(next);
    return number;
  }, []);

  const updatePolicy = useCallback((number: string, patch: Partial<Policy>, historyText: string) => {
    setData((current) => ({ ...current, policies: current.policies.map((p) => (p.number === number ? { ...p, ...patch, history: [{ date: today(), text: historyText, by: AGENT.name }, ...p.history], documents: patch.documents ?? p.documents } : p)) }));
  }, []);

  const cancelPolicy = useCallback((number: string, reason: string, date: string) => {
    setData((current) => ({ ...current, policies: current.policies.map((p) => (p.number === number ? { ...p, status: date <= today() ? 'Cancelled' : 'Pending Cancel', history: [{ date: today(), text: `Cancellation requested effective ${date} — ${reason}`, by: AGENT.name }, ...p.history], documents: [{ name: 'Cancellation Notice', date: today(), kind: 'Notice' }, ...p.documents] } : p)) }));
  }, []);

  const reinstatePolicy = useCallback((number: string) => {
    setData((current) => ({ ...current, policies: current.policies.map((p) => (p.number === number ? { ...p, status: 'Active', history: [{ date: today(), text: 'Policy reinstated with no lapse in coverage', by: AGENT.name }, ...p.history], documents: [{ name: 'Reinstatement Notice', date: today(), kind: 'Notice' }, ...p.documents] } : p)) }));
  }, []);

  const addClaim: StoreValue['addClaim'] = useCallback((claim) => {
    const number = `CLM-26-${randomDigits(7)}`;
    const adjuster = adjusters[Math.floor(Math.random() * adjusters.length)];
    setData((current) => ({ ...current, claims: [{ ...claim, number, status: 'Assigned', adjuster, reserve: 0, paid: 0, reportedDate: today(), notes: [{ date: today(), author: AGENT.name, text: 'First notice of loss submitted through AgentExchange.' }, { date: today(), author: 'System', text: `Claim assigned to ${adjuster.name}. Customer contact expected within 24 hours.` }], payments: [] }, ...current.claims] }));
    return number;
  }, []);

  const updateClaim = useCallback((number: string, patch: Partial<Claim>, note?: string) => {
    setData((current) => ({ ...current, claims: current.claims.map((c) => (c.number === number ? { ...c, ...patch, notes: note ? [...c.notes, { date: today(), author: AGENT.name, text: note }] : c.notes } : c)) }));
  }, []);

  const makePayment = useCallback((policyNumber: string, amount: number, method: string) => {
    const payment: Payment = { id: `P${randomDigits(6)}`, date: today(), amount, method, confirmation: `EP-${randomDigits(8)}`, policyNumber };
    setData((current) => {
      const account = current.billing.find((b) => b.policyNumber === policyNumber);
      // A non-payment cancellation is rescinded only once the past-due amount is fully paid.
      const curesPastDue = !!account && amount >= account.minimumDue - 0.005;
      return {
        ...current,
        billing: current.billing.map((b) => (b.policyNumber === policyNumber ? { ...b, balance: Math.max(0, Math.round((b.balance - amount) * 100) / 100), minimumDue: Math.max(0, Math.round((b.minimumDue - amount) * 100) / 100), payments: [payment, ...b.payments] } : b)),
        policies: current.policies.map((p) => (p.number === policyNumber && curesPastDue && p.status === 'Pending Cancel' && p.history[0]?.text.includes('non-payment') ? { ...p, status: 'Active', history: [{ date: today(), text: `Payment ${payment.confirmation} received — non-payment cancellation rescinded`, by: 'System' }, ...p.history] } : p)),
      };
    });
    return payment;
  }, []);

  const adjustBalance = useCallback((policyNumber: string, delta: number) => setData((current) => ({ ...current, billing: current.billing.map((b) => (b.policyNumber === policyNumber ? { ...b, balance: Math.max(0, Math.round((b.balance + delta) * 100) / 100) } : b)) })), []);

  const setAutoPay = useCallback((policyNumber: string, enabled: boolean, account: string) => {
    setData((current) => ({ ...current, policies: current.policies.map((p) => (p.number === policyNumber ? { ...p, autoPay: enabled, history: [{ date: today(), text: enabled ? `Enrolled in AutoPay (${account}); installment fees waived` : 'AutoPay cancelled', by: AGENT.name }, ...p.history] } : p)) }));
  }, []);

  const updateLead = useCallback((id: string, status: Lead['status']) => setData((current) => ({ ...current, leads: current.leads.map((l) => (l.id === id ? { ...l, status } : l)) })), []);
  const addEnvelope = useCallback((envelope: Omit<Envelope, 'id' | 'sent' | 'status'>) => setData((current) => ({ ...current, envelopes: [{ ...envelope, id: `ES-${randomDigits(5)}`, sent: today(), status: 'Sent' }, ...current.envelopes] })), []);
  const updateEnvelope = useCallback((id: string, status: Envelope['status']) => setData((current) => ({ ...current, envelopes: current.envelopes.map((e) => (e.id === id ? { ...e, status, sent: status === 'Sent' ? today() : e.sent } : e)) })), []);
  const resetDemo = useCallback(() => setData(createSeed()), []);

  const value = useMemo<StoreValue>(() => ({ ...data, toasts, notify, dismissToast, saveQuote, deleteQuotes, archiveQuotes, issueQuote, updateCustomer, issueBusinessPolicy, updatePolicy, cancelPolicy, reinstatePolicy, addClaim, updateClaim, makePayment, adjustBalance, setAutoPay, updateLead, addEnvelope, updateEnvelope, resetDemo }), [data, toasts, notify, dismissToast, saveQuote, deleteQuotes, archiveQuotes, issueQuote, updateCustomer, issueBusinessPolicy, updatePolicy, cancelPolicy, reinstatePolicy, addClaim, updateClaim, makePayment, adjustBalance, setAutoPay, updateLead, addEnvelope, updateEnvelope, resetDemo]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function usePortal() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('usePortal must be used inside PortalStoreProvider');
  return context;
}

export const fullName = (c: { firstName: string; middleName?: string; lastName: string }) => [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ');
export { today, addDays, addMonths };
