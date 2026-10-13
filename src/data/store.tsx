import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ageFrom, calculateErieQuote, ErieQuoteResult, payPlanInstallments, QuoteLineKey, rateAuto, rateBoat, rateHome, rateLife, rateUmbrella } from '@/lib/rating';
import { LEGACY_CODES, LEGACY_TRADES, liabilityPremium, rateBusiness, rateCommercialAuto, rateCommercialUmbrella, rateContractors, rateWorkersComp } from '@/data/commercial';
import { afterPayment, dueDates, rebill } from '@/lib/billing';
import { AGENT, createSeed, defaultAutoCoverages, defaultBoat, defaultCommercial, defaultHomeCoverages, defaultLife, defaultProperty, defaultUmbrella, PortalData } from '@/data/seed';
import type { AutoCoverages, BillingAccount, BusinessDetails, Claim, ClaimStatus, CommercialDetails, CommercialLine, ContractorsDetails, Customer, Envelope, HomeCoverages, Lead, Payment, PaymentMethod, Policy, PolicyDocument, PolicyEndorsement, PolicyType, PremiumBreakdown, Quote, Toast } from '@/data/types';

const STORAGE_KEY = 'erie-agentexchange-demo-v1';

// Local calendar date (toISOString is UTC, which rolls over to tomorrow in the US evening).
const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => localDate(new Date());
const nowIso = () => new Date().toISOString().slice(0, 19);
const randomDigits = (length: number) => Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
const addYears = (date: string, years: number) => { const d = new Date(`${date}T12:00:00`); d.setFullYear(d.getFullYear() + years); return d.toISOString().slice(0, 10); };
const addDays = (date: string, days: number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const addMonths = (date: string, months: number) => { const d = new Date(`${date}T12:00:00`); d.setMonth(d.getMonth() + months); return d.toISOString().slice(0, 10); };

const policyPrefix: Record<PolicyType, string> = { Auto: 'A05', Home: 'H07', Boat: 'B09', Life: 'L22', Umbrella: 'U03', Business: 'Q97', 'Commercial Auto': 'CA1', 'Workers Comp': 'WC4' };
// The most recent cancellation entry decides why a policy is pending cancel (history is newest first).
export const isNonPaymentCancel = (p: Policy) => /non-payment/i.test(p.history.find((h) => /cancel/i.test(h.text) && !/rescinded/i.test(h.text))?.text ?? '');
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// Older saved data used a single "Roadside & Rentals" flag and fixed B/C/D percentages.
type LegacyAuto = AutoCoverages & { roadsideRentals?: boolean };
export const migrateAuto = (a?: LegacyAuto): AutoCoverages | undefined => (a ? { ...a, emergencyRoadService: a.emergencyRoadService ?? !!a.roadsideRentals, transportationExpense: a.transportationExpense ?? !!a.roadsideRentals } : a);
export const migrateHome = (h?: HomeCoverages): HomeCoverages | undefined => (h ? { ...h, otherStructuresPct: h.otherStructuresPct ?? 10, personalPropertyPct: h.personalPropertyPct ?? 70, lossOfUsePct: h.lossOfUsePct ?? 20 } : h);
// Commercial class codes were corrected to verified ISO codes; new property and auto fields get defaults.
const migrateBusiness = (b?: BusinessDetails): BusinessDetails | undefined => (b ? { ...defaultCommercial.business, ...b, classCode: LEGACY_CODES[b.classCode] ?? b.classCode } : b);
const migrateContractors = (c?: ContractorsDetails): ContractorsDetails | undefined => (c && (c.codeVersion ?? 1) < 2 ? { ...c, trade: LEGACY_TRADES[c.trade] ?? c.trade, codeVersion: 2 } : c);
const migrateCommercial = (c?: CommercialDetails): CommercialDetails => {
  if (!c) return clone(defaultCommercial);
  return { ...c, business: migrateBusiness(c.business)!, contractors: migrateContractors(c.contractors)!, umbrella: c.umbrella ?? { limit: 1000000 } };
};

const adjusters = [
  { name: 'Megan Reilly', phone: '(800) 367-3743 x4471', email: 'megan.reilly@erieinsurance.example' },
  { name: 'Carlos Medina', phone: '(800) 367-3743 x5120', email: 'carlos.medina@erieinsurance.example' },
  { name: 'Priya Desai', phone: '(800) 367-3743 x6204', email: 'priya.desai@erieinsurance.example' },
  { name: 'Jordan Pike', phone: '(800) 367-3743 x3318', email: 'jordan.pike@erieinsurance.example' },
];

// Claim statuses were renamed to the FNOL tracker steps.
const LEGACY_CLAIM_STATUS: Record<string, ClaimStatus> = { Reported: 'Claim Submitted', Assigned: 'Adjuster Assigned', 'Estimate Review': 'Estimate Approved', 'Repair In Progress': 'Estimate Approved' };

// Future-dated payments post on their scheduled date.
function applyScheduled(billing: BillingAccount[], policies: Policy[]): BillingAccount[] {
  const now = today();
  return billing.map((b) => {
    const due = (b.scheduled ?? []).filter((p) => p.date <= now);
    const policy = policies.find((p) => p.number === b.policyNumber);
    if (!due.length || !policy) return b;
    const posted = due.reduce((acc, p) => ({ ...acc, ...afterPayment(policy, acc, p.amount) }), b);
    return { ...posted, scheduled: (b.scheduled ?? []).filter((p) => p.date > now), payments: [...due, ...b.payments] };
  });
}

/** Cancellation effective date from the policy's most recent cancellation entry. */
export function cancelDateOf(p: Policy) {
  const entry = p.history.find((h) => /cancel/i.test(h.text) && !/rescinded|reinstated/i.test(h.text));
  return entry?.text.match(/(?:effective|cancels|cancelled)\s+(\d{4}-\d{2}-\d{2})/i)?.[1];
}

function loadData(): PortalData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // Activity saved under the previous account owner is re-attributed to the current one.
      const data = JSON.parse(raw.split('Guttenberg').join('Lindqvist').split('1968-07-14').join('1967-11-02').split('Vito Bitanghol').join(AGENT.name).split('Bitanghol Insurance Agency, LLC').join(AGENT.agency)) as PortalData;
      // Quotes saved before newer product lines existed get default details.
      return {
        ...data,
        quotes: data.quotes.map((q) => ({ ...q, boat: q.boat ?? { ...defaultBoat }, life: q.life ?? { ...defaultLife }, umbrella: q.umbrella ?? { ...defaultUmbrella }, commercial: migrateCommercial(q.commercial), autoCoverages: migrateAuto(q.autoCoverages)!, homeCoverages: migrateHome(q.homeCoverages)! })),
        policies: data.policies.map((p) => ({ ...p, autoCoverages: migrateAuto(p.autoCoverages), homeCoverages: migrateHome(p.homeCoverages), business: migrateBusiness(p.business), contractors: migrateContractors(p.contractors) })),
        claims: data.claims.map((c) => ({ ...c, status: LEGACY_CLAIM_STATUS[c.status as string] ?? c.status })),
        paymentMethods: data.paymentMethods ?? createSeed().paymentMethods,
        billing: applyScheduled(data.billing, data.policies),
      };
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
    umbrella: { ...defaultUmbrella },
    commercial: clone(defaultCommercial),
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

export function rateCommercialLine(line: CommercialLine, quote: Quote): PremiumBreakdown {
  const c = quote.commercial;
  const state = c.business.state || quote.applicant.state;
  if (line === 'bop') return rateBusiness({ ...c.business, state });
  if (line === 'contractors') return rateContractors(c.contractors, { ...c.business, state }, state);
  if (line === 'commercialAuto') return rateCommercialAuto(c.commercialAuto, state);
  if (line === 'umbrella') {
    // The umbrella is priced off the liability premium of the underlying lines on the account.
    const underlying = c.lines.filter((l) => l !== 'umbrella').reduce((s, l) => s + liabilityPremium(rateCommercialLine(l, quote)), 0);
    const heavy = c.lines.includes('commercialAuto') && c.commercialAuto.vehicles.some((v) => ['Heavy Truck', 'Extra-Heavy Truck', 'Truck-Tractor'].includes(v.bodyType));
    return rateCommercialUmbrella(c.umbrella?.limit ?? 1000000, underlying, heavy, state);
  }
  return rateWorkersComp(c.workersComp, state);
}

/**
 * Rates every line on the quote and combines them into one account quote with bundle credits,
 * taxes and the installment schedule. `existing` are the customer's in-force policies, which
 * count toward the auto + home multi-policy discount just like lines on this quote.
 */
export function rateQuote(quote: Quote, existing: Policy[] = [], payPlan = quote.payPlan): ErieQuoteResult {
  const has = (p: Quote['products'][number]) => quote.products.includes(p);
  // In-force policies other than the ones this quote itself issued.
  const others = existing.filter((p) => p.status !== 'Cancelled' && p.quoteId !== quote.id);
  const holds = (t: PolicyType) => others.some((p) => p.type === t);
  const multiPolicy = (has('auto') || holds('Auto')) && (has('home') || holds('Home')) && (has('auto') || has('home'));
  const daysOut = (new Date(quote.effectiveDate).getTime() - Date.now()) / 86400000;
  const state = quote.applicant.state;
  // Insurance score results from the Reports step feed the rating tier.
  const scoreHit = (kind: 'Auto' | 'Property') => !!quote.pl?.reports.some((r) => r.report === `Insurance Score (${kind})` && r.status === 'Hit');
  const lines: { key: QuoteLineKey; breakdown: PremiumBreakdown }[] = [];
  if (has('auto')) lines.push({ key: 'auto', breakdown: rateAuto(state, quote.drivers, quote.vehicles, quote.autoCoverages, { multiPolicy, payPlan, autoPay: quote.autoPay, ratingPlan: quote.pl?.ratingPlan, context: { insuranceScoreHit: scoreHit('Auto'), priorCarrier: quote.pl?.autoCarrier, priorYears: quote.pl?.autoYears } }) });
  if (has('home')) lines.push({ key: 'home', breakdown: rateHome(state, quote.property, quote.homeCoverages, { multiPolicy, earlyQuote: daysOut >= 7, payPlan, context: { insuranceScoreHit: scoreHit('Property'), propertyClaims: quote.pl?.reports.filter((r) => r.report.startsWith('Property Loss') && (r.amount ?? 0) > 0).length } }) });
  if (has('umbrella')) lines.push({ key: 'umbrella', breakdown: rateUmbrella(state, quote.umbrella) });
  if (has('boat')) lines.push({ key: 'boat', breakdown: rateBoat(state, quote.boat, { multiPolicy: quote.products.length > 1 || others.length > 0, payPlan }) });
  if (has('life')) lines.push({ key: 'life', breakdown: rateLife(ageFrom(quote.applicant.dob), quote.life) });
  if (has('commercial')) quote.commercial.lines.forEach((line) => lines.push({ key: `commercial:${line}`, breakdown: rateCommercialLine(line, quote) }));
  return calculateErieQuote({
    state,
    payPlan,
    autoPay: quote.autoPay,
    lines,
    factors: {
      homeCoverageA: has('home') ? quote.homeCoverages.dwelling : 0,
      autoVehiclesCount: has('auto') ? quote.vehicles.length : 0,
      autoDriversCount: has('auto') ? quote.drivers.length : 0,
      umbrellaLimit: has('umbrella') ? quote.umbrella.limit : 0,
      commercialPayroll: has('commercial') ? quote.commercial.workersComp.classes.reduce((s, c) => s + c.payroll, 0) || quote.commercial.business.payroll : 0,
      commercialRevenue: has('commercial') ? quote.commercial.business.revenue : 0,
    },
  });
}

export const lineOf = (rated: ErieQuoteResult, key: QuoteLineKey) => rated.lines.find((l) => l.key === key)?.breakdown ?? null;

type StoreValue = PortalData & {
  toasts: Toast[];
  notify: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  saveQuote: (quote: Quote) => void;
  deleteQuotes: (ids: string[]) => void;
  archiveQuotes: (ids: string[], archived: boolean) => void;
  issueQuote: (id: string) => string[];
  updateCustomer: (customer: Customer) => void;
  updatePolicy: (number: string, patch: Partial<Policy>, historyText: string) => void;
  cancelPolicy: (number: string, reason: string, date: string) => void;
  reinstatePolicy: (number: string) => void;
  endorsePolicy: (number: string, patch: Partial<Policy>, change: Omit<PolicyEndorsement, 'id' | 'processed' | 'by'>, documents: PolicyDocument[]) => PolicyEndorsement;
  reinstateForNonPayment: (number: string, details: { pastDue: number; lateFee: number; reinstatementFee: number; method: string; noLapse: boolean; signedBy: string; cancelDate?: string }) => Payment;
  savePaymentMethod: (method: Omit<PaymentMethod, 'id'> & { id?: string }) => PaymentMethod;
  removePaymentMethod: (id: string) => void;
  setDefaultPaymentMethod: (id: string) => void;
  addClaim: (claim: Omit<Claim, 'number' | 'status' | 'adjuster' | 'reserve' | 'paid' | 'notes' | 'payments' | 'reportedDate'>) => string;
  updateClaim: (number: string, patch: Partial<Claim>, note?: string) => void;
  makePayment: (policyNumber: string, amount: number, method: string, options?: { kind?: Payment['kind']; date?: string }) => Payment;
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
  const archiveQuotes = useCallback((ids: string[], archived: boolean) => setData((current) => ({ ...current, quotes: current.quotes.map((q) => {
    // Issued quotes belong to the policy record and are never archived.
    if (!ids.includes(q.id) || q.status === 'Issued') return q;
    if (archived) return q.status === 'Archived' ? q : { ...q, status: 'Archived', preArchiveStatus: q.status, updatedAt: nowIso() };
    return { ...q, status: q.preArchiveStatus ?? 'Quote', preArchiveStatus: undefined, updatedAt: nowIso() };
  }) })), []);

  const issueQuote = useCallback((id: string) => {
    const issued: string[] = [];
    const current = dataRef.current;
    const quote = current.quotes.find((q) => q.id === id);
    if (!quote) return issued;
    {
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
      const rated = rateQuote(quote, current.policies.filter((p) => p.customerId === customerId));
      const line = (key: QuoteLineKey) => rated.lines.find((l) => l.key === key);
      const productOf: Partial<Record<PolicyType, Quote['products'][number]>> = { Auto: 'auto', Home: 'home', Umbrella: 'umbrella', Boat: 'boat', Life: 'life', Business: 'commercial', 'Commercial Auto': 'commercial', 'Workers Comp': 'commercial' };
      // Each policy is billed its bundled premium plus its share of state premium taxes.
      const make = (type: PolicyType, key: QuoteLineKey, extra: Partial<Policy>) => {
        const rl = line(key);
        if (!rl) return;
        const premium = rl.breakdown.total;
        const number = `${policyPrefix[type]}-${randomDigits(7)}`;
        issued.push(number);
        const installments = payPlanInstallments[quote.payPlan];
        newBilling.push({ policyNumber: number, balance: premium + rl.tax, nextDueDate: quote.effectiveDate, minimumDue: Math.round(((premium + rl.tax) / installments) * 100) / 100, payments: [] });
        newPolicies.push({ number, type, customerId: customerId!, status: 'Active', effective: quote.effectiveDate, expiration: addYears(quote.effectiveDate, 1), premium, payPlan: quote.payPlan, autoPay: quote.autoPay, agentNumber: quote.agentNumbers[productOf[type] ?? 'auto'] ?? AGENT.agentNumbers[0], drivers: [], vehicles: [], description: '', documents: [{ name: 'Declarations Page', date: quote.effectiveDate, kind: 'Declarations' }, { name: 'Signed Application', date: today(), kind: 'Application' }, { name: 'Initial Bill', date: today(), kind: 'Bill' }], history: [{ date: today(), text: `New business issued from quote ${quote.id}`, by: AGENT.name }], quoteId: quote.id, ...extra });
      };
      const biz = quote.commercial.business;
      make('Auto', 'auto', { drivers: quote.drivers, vehicles: quote.vehicles, autoCoverages: quote.autoCoverages, description: `${quote.vehicles.length} vehicle${quote.vehicles.length === 1 ? '' : 's'} · ${quote.drivers.length} driver${quote.drivers.length === 1 ? '' : 's'}`, documents: [{ name: 'Auto ID Cards', date: quote.effectiveDate, kind: 'ID Card' }, { name: 'Declarations Page', date: quote.effectiveDate, kind: 'Declarations' }, { name: 'Signed Application', date: today(), kind: 'Application' }] });
      make('Home', 'home', { property: quote.property, homeCoverages: quote.homeCoverages, description: `ErieSecure Home · ${quote.applicant.address}` });
      make('Umbrella', 'umbrella', { umbrella: quote.umbrella, description: `Personal Catastrophe Liability · $${quote.umbrella.limit.toLocaleString()}` });
      make('Business', 'commercial:bop', { business: biz, description: `Ultrapack Plus · ${biz.businessName}` });
      make('Business', 'commercial:contractors', { business: biz, contractors: quote.commercial.contractors, description: `Fivestar Contractors · ${biz.businessName}` });
      make('Commercial Auto', 'commercial:commercialAuto', { business: biz, commercialAuto: quote.commercial.commercialAuto, description: `Commercial Auto · ${quote.commercial.commercialAuto.vehicles.length} unit${quote.commercial.commercialAuto.vehicles.length === 1 ? '' : 's'} · ${biz.businessName}` });
      make('Workers Comp', 'commercial:workersComp', { business: biz, workersComp: quote.commercial.workersComp, description: `Workers' Compensation · E-Mod ${quote.commercial.workersComp.experienceMod.toFixed(2)} · ${biz.businessName}` });
      make('Business', 'commercial:umbrella', { business: biz, policyForm: 'Commercial Umbrella', description: `Commercial Umbrella · $${(quote.commercial.umbrella?.limit ?? 1000000).toLocaleString()} · ${biz.businessName}` });
      make('Boat', 'boat', { boat: quote.boat, description: `${quote.boat.year} ${quote.boat.make} ${quote.boat.model} · ${quote.boat.length} ft · ${quote.boat.horsepower} HP` });
      make('Life', 'life', { life: quote.life, expiration: addYears(quote.effectiveDate, quote.life.term), status: quote.underwriting._approved === 'yes' ? 'Pending Issue' : 'Active', description: `ERIExpress Life · ${quote.life.term}-year term · $${quote.life.faceAmount.toLocaleString()} face` });
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


  const updatePolicy = useCallback((number: string, patch: Partial<Policy>, historyText: string) => {
    setData((current) => ({ ...current, policies: current.policies.map((p) => (p.number === number ? { ...p, ...patch, history: [{ date: today(), text: historyText, by: AGENT.name }, ...p.history], documents: patch.documents ?? p.documents } : p)) }));
  }, []);

  const cancelPolicy = useCallback((number: string, reason: string, date: string) => {
    setData((current) => ({ ...current, policies: current.policies.map((p) => (p.number === number ? { ...p, status: date <= today() ? 'Cancelled' : 'Pending Cancel', history: [{ date: today(), text: `Cancellation requested effective ${date} — ${reason}`, by: AGENT.name }, ...p.history], documents: [{ name: 'Cancellation Notice', date: today(), kind: 'Notice' }, ...p.documents] } : p)) }));
  }, []);

  const reinstatePolicy = useCallback((number: string) => {
    setData((current) => ({ ...current, policies: current.policies.map((p) => (p.number === number ? { ...p, status: 'Active', history: [{ date: today(), text: 'Policy reinstated with no lapse in coverage', by: AGENT.name }, ...p.history], documents: [{ name: 'Reinstatement Notice', date: today(), kind: 'Notice' }, ...p.documents] } : p)) }));
  }, []);

  const endorsePolicy: StoreValue['endorsePolicy'] = useCallback((number, patch, change, documents) => {
    const endorsement: PolicyEndorsement = { ...change, id: `END-${randomDigits(6)}`, processed: today(), by: AGENT.name };
    setData((current) => ({
      ...current,
      policies: current.policies.map((p) => (p.number === number ? { ...p, ...patch, endorsements: [endorsement, ...(p.endorsements ?? [])], documents: [...documents, ...p.documents], history: [{ date: today(), text: `${change.type}: ${change.description} — effective ${change.effective}. Premium ${change.proRata >= 0 ? '+' : '−'}${Math.abs(change.proRata).toFixed(2)} pro rata`, by: AGENT.name }, ...p.history] } : p)),
      billing: current.billing.map((b) => { if (b.policyNumber !== number) return b; const p = current.policies.find((x) => x.number === number)!; const balance = Math.max(0, Math.round((b.balance + change.proRata) * 100) / 100); return { ...b, balance, ...rebill(p, balance, b.nextDueDate) }; }),
    }));
    return endorsement;
  }, []);

  const reinstateForNonPayment: StoreValue['reinstateForNonPayment'] = useCallback((number, d) => {
    const total = Math.round((d.pastDue + d.lateFee + d.reinstatementFee) * 100) / 100;
    const payment: Payment = { id: `P${randomDigits(6)}`, date: today(), amount: total, method: d.method, confirmation: `EP-${randomDigits(8)}`, policyNumber: number, kind: 'Reinstatement' };
    setData((current) => ({
      ...current,
      // Fees are paid on top of premium, so only the past-due premium reduces the balance.
      billing: current.billing.map((b) => (b.policyNumber === number ? { ...b, ...(() => { const p = current.policies.find((x) => x.number === number)!; const balance = Math.max(0, Math.round((b.balance - d.pastDue) * 100) / 100); return { balance, ...rebill(p, balance, dueDates(p).find((x) => x > today()) ?? b.nextDueDate) }; })(), payments: [{ ...payment, amount: d.pastDue, kind: 'Installment' }, ...(d.lateFee ? [{ ...payment, id: `${payment.id}-L`, amount: d.lateFee, kind: 'Late fee' as const }] : []), ...(d.reinstatementFee ? [{ ...payment, id: `${payment.id}-R`, amount: d.reinstatementFee, kind: 'Reinstatement' as const }] : []), ...b.payments] } : b)),
      policies: current.policies.map((p) => (p.number === number ? { ...p, status: 'Active', history: [{ date: today(), text: `Reinstated after non-payment — ${d.noLapse ? 'no lapse in coverage' : `lapse from ${d.cancelDate ?? 'cancellation'} to ${today()}`}. Statement of no known loss signed by ${d.signedBy}. Paid ${total.toFixed(2)} (${payment.confirmation})`, by: AGENT.name }, ...p.history], documents: [{ name: 'Notice of Reinstatement', date: today(), kind: 'Notice' }, ...p.documents] } : p)),
    }));
    return payment;
  }, []);

  const savePaymentMethod: StoreValue['savePaymentMethod'] = useCallback((method) => {
    const saved: PaymentMethod = { ...method, id: method.id ?? `PM-${randomDigits(6)}` };
    setData((current) => {
      const others = (current.paymentMethods ?? []).filter((m) => m.id !== saved.id);
      const first = !others.some((m) => m.customerId === saved.customerId);
      const next = { ...saved, isDefault: saved.isDefault || first };
      return { ...current, paymentMethods: [...others.map((m) => (next.isDefault && m.customerId === next.customerId ? { ...m, isDefault: false } : m)), next] };
    });
    return saved;
  }, []);
  const removePaymentMethod = useCallback((id: string) => setData((current) => {
    const removed = current.paymentMethods.find((m) => m.id === id);
    const rest = current.paymentMethods.filter((m) => m.id !== id);
    // Keep one default per customer.
    const heirId = removed?.isDefault ? rest.find((m) => m.customerId === removed.customerId)?.id : undefined;
    return { ...current, paymentMethods: rest.map((m) => (m.id === heirId ? { ...m, isDefault: true } : m)) };
  }), []);
  const setDefaultPaymentMethod = useCallback((id: string) => setData((current) => {
    const target = current.paymentMethods.find((m) => m.id === id);
    return target ? { ...current, paymentMethods: current.paymentMethods.map((m) => (m.customerId === target.customerId ? { ...m, isDefault: m.id === id } : m)) } : current;
  }), []);

  const addClaim: StoreValue['addClaim'] = useCallback((claim) => {
    const number = `CLM-${new Date().getFullYear()}-${randomDigits(5)}`;
    const adjuster = adjusters[Math.floor(Math.random() * adjusters.length)];
    setData((current) => ({ ...current, claims: [{ ...claim, number, status: 'Adjuster Assigned', adjuster, reserve: 0, paid: 0, reportedDate: today(), notes: [{ date: today(), author: AGENT.name, text: 'First notice of loss submitted through AgentExchange.' }, { date: today(), author: 'System', text: `Claim assigned to ${adjuster.name}. Customer contact expected within 24 hours.` }], payments: [] }, ...current.claims] }));
    return number;
  }, []);

  const updateClaim = useCallback((number: string, patch: Partial<Claim>, note?: string) => {
    setData((current) => ({ ...current, claims: current.claims.map((c) => (c.number === number ? { ...c, ...patch, notes: note ? [...(patch.notes ?? c.notes), { date: today(), author: AGENT.name, text: note }] : (patch.notes ?? c.notes) } : c)) }));
  }, []);

  const makePayment = useCallback((policyNumber: string, amount: number, method: string, options: { kind?: Payment['kind']; date?: string } = {}) => {
    const date = options.date && options.date > today() ? options.date : today();
    const payment: Payment = { id: `P${randomDigits(6)}`, date, amount, method, confirmation: `EP-${randomDigits(8)}`, policyNumber, kind: options.kind ?? 'Installment' };
    // Future-dated payments are held as scheduled and post on their date.
    if (date > today()) {
      setData((current) => ({ ...current, billing: current.billing.map((b) => (b.policyNumber === policyNumber ? { ...b, scheduled: [...(b.scheduled ?? []), payment] } : b)) }));
      return payment;
    }
    setData((current) => {
      const account = current.billing.find((b) => b.policyNumber === policyNumber);
      // A non-payment cancellation is rescinded only once the past-due amount is fully paid.
      const curesPastDue = !!account && amount >= account.minimumDue - 0.005;
      return {
        ...current,
        billing: current.billing.map((b) => { if (b.policyNumber !== policyNumber) return b; const p = current.policies.find((x) => x.number === policyNumber); return { ...b, ...(p ? afterPayment(p, b, amount) : { balance: Math.max(0, Math.round((b.balance - amount) * 100) / 100), minimumDue: Math.max(0, Math.round((b.minimumDue - amount) * 100) / 100) }), payments: [payment, ...b.payments] }; }),
        policies: current.policies.map((p) => (p.number === policyNumber && curesPastDue && p.status === 'Pending Cancel' && isNonPaymentCancel(p) ? { ...p, status: 'Active', history: [{ date: today(), text: `Payment ${payment.confirmation} received — non-payment cancellation rescinded`, by: 'System' }, ...p.history] } : p)),
      };
    });
    return payment;
  }, []);

  const adjustBalance = useCallback((policyNumber: string, delta: number) => setData((current) => ({ ...current, billing: current.billing.map((b) => { if (b.policyNumber !== policyNumber) return b; const p = current.policies.find((x) => x.number === policyNumber); const balance = Math.max(0, Math.round((b.balance + delta) * 100) / 100); return { ...b, balance, ...(p ? rebill(p, balance, b.nextDueDate) : {}) }; }) })), []);

  const setAutoPay = useCallback((policyNumber: string, enabled: boolean, account: string) => {
    setData((current) => ({ ...current, policies: current.policies.map((p) => (p.number === policyNumber ? { ...p, autoPay: enabled, history: [{ date: today(), text: enabled ? `Enrolled in AutoPay (${account}); installment fees waived` : 'AutoPay cancelled', by: AGENT.name }, ...p.history] } : p)) }));
  }, []);

  const updateLead = useCallback((id: string, status: Lead['status']) => setData((current) => ({ ...current, leads: current.leads.map((l) => (l.id === id ? { ...l, status } : l)) })), []);
  const addEnvelope = useCallback((envelope: Omit<Envelope, 'id' | 'sent' | 'status'>) => setData((current) => ({ ...current, envelopes: [{ ...envelope, id: `ES-${randomDigits(5)}`, sent: today(), status: 'Sent' }, ...current.envelopes] })), []);
  const updateEnvelope = useCallback((id: string, status: Envelope['status']) => setData((current) => ({ ...current, envelopes: current.envelopes.map((e) => (e.id === id ? { ...e, status, sent: status === 'Sent' ? today() : e.sent } : e)) })), []);
  const resetDemo = useCallback(() => {
    setData(createSeed());
    // Work items marked done refer to seed records, so they come back with the reset.
    try { localStorage.removeItem('erie-agentexchange-dismissed-work'); } catch { /* storage unavailable */ }
    window.dispatchEvent(new Event('erie-work-dismissed'));
  }, []);

  const value = useMemo<StoreValue>(() => ({ ...data, toasts, notify, dismissToast, saveQuote, deleteQuotes, archiveQuotes, issueQuote, updateCustomer, updatePolicy, cancelPolicy, reinstatePolicy, endorsePolicy, reinstateForNonPayment, savePaymentMethod, removePaymentMethod, setDefaultPaymentMethod, addClaim, updateClaim, makePayment, adjustBalance, setAutoPay, updateLead, addEnvelope, updateEnvelope, resetDemo }), [data, toasts, notify, dismissToast, saveQuote, deleteQuotes, archiveQuotes, issueQuote, updateCustomer, updatePolicy, cancelPolicy, reinstatePolicy, endorsePolicy, reinstateForNonPayment, savePaymentMethod, removePaymentMethod, setDefaultPaymentMethod, addClaim, updateClaim, makePayment, adjustBalance, setAutoPay, updateLead, addEnvelope, updateEnvelope, resetDemo]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function usePortal() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('usePortal must be used inside PortalStoreProvider');
  return context;
}

export const fullName = (c: { firstName: string; middleName?: string; lastName: string }) => [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ');
export { today, addDays, addMonths };
