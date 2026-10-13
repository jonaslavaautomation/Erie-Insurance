import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Building2, Car, Check, CheckCircle2, Download, FileText, Heart, Home, Mail, Pencil, Plus, Printer, Sailboat, Save, ShieldCheck, Trash2, Umbrella, UserPlus, Wand2 } from 'lucide-react';
import '@/product-page.css';
import QuoteHeader from '@/components/QuoteHeader';
import { Field, Modal, StatusBadge } from '@/components/ui';
import { fullName, lineOf, rateQuote, today, usePortal } from '@/data/store';
import { commercialRules, commercialValidation } from '@/data/commercial';
import { CommercialStep, umbrellaUnderlying, UmbrellaStep } from '@/pages/QuoteSteps';
import { AGENT } from '@/data/seed';
import { STATES } from '@/data/content';
import { ageFrom, BI_OPTIONS, bmi, ErieQuoteResult, installmentSchedule, money, PAY_PLANS, payPlanLabel, PD_OPTIONS, ratedLifeClass, UM_OPTIONS } from '@/lib/rating';
import { loadTemplates, saveTemplates } from '@/lib/templates';
import { validCardExpiry } from '@/lib/validation';
import { downloadDocument, openDocument, quoteProposalHtml } from '@/lib/documents';
import type { Driver, Policy, PremiumBreakdown, ProductKey, Quote, Vehicle } from '@/data/types';
import PersonalQuote from '@/pages/pl/PersonalQuote';
import { PL_STEPS, PlStep } from '@/lib/personalLines';

type StepKey = 'underwriting' | 'drivers' | 'vehicles' | 'property' | 'coverages' | 'umbrella' | 'boat' | 'life' | 'commercial' | 'summary' | 'application' | 'issued';
const stepLabels: Record<StepKey, string> = { underwriting: 'Customer Profile & Risk', drivers: 'Auto · Drivers', vehicles: 'Auto · Vehicles', property: 'Home · Property', coverages: 'Auto & Home Coverages', umbrella: 'Umbrella', boat: 'Boat', life: 'Life', commercial: 'Commercial Lines', summary: 'Summary & Bundle', application: 'Binder & Issue', issued: 'Issued' };

type UwQuestion = { id: string; text: string; products: ProductKey[] | 'all'; outcome: 'refer' | 'decline' };
const UW_QUESTIONS: UwQuestion[] = [
  { id: 'cancelled', text: 'Has any insurance been cancelled, declined or non-renewed for any applicant in the past 3 years?', products: 'all', outcome: 'refer' },
  { id: 'fraud', text: 'Has any applicant been convicted of insurance fraud, arson or a felony in the past 10 years?', products: 'all', outcome: 'decline' },
  { id: 'dui', text: 'Has any household driver been convicted of DUI/DWI in the past 5 years?', products: ['auto'], outcome: 'refer' },
  { id: 'suspended', text: "Has any driver's license been suspended or revoked in the past 5 years?", products: ['auto'], outcome: 'refer' },
  { id: 'business-use', text: 'Is any vehicle used for delivery, livery, rideshare or other business purposes?', products: ['auto'], outcome: 'refer' },
  { id: 'vehicle-damage', text: 'Does any vehicle have existing unrepaired damage?', products: ['auto'], outcome: 'refer' },
  { id: 'unlisted', text: 'Are there household residents of driving age not listed on this quote?', products: ['auto'], outcome: 'refer' },
  { id: 'home-business', text: 'Is any business conducted on the premises?', products: ['home'], outcome: 'refer' },
  { id: 'dog', text: 'Is there a dog on premises with a bite history?', products: ['home'], outcome: 'refer' },
  { id: 'pool', text: 'Is there a swimming pool or trampoline without a locked fence?', products: ['home'], outcome: 'refer' },
  { id: 'losses', text: 'Have there been two or more property losses at this location in the past 3 years?', products: ['home'], outcome: 'refer' },
  { id: 'vacant', text: 'Is the dwelling vacant, under major renovation, or in foreclosure?', products: ['home'], outcome: 'decline' },
  { id: 'woodstove', text: 'Is a wood stove or space heater the primary source of heat?', products: ['home'], outcome: 'refer' },
  { id: 'boat-size', text: 'Is the boat longer than 26 feet or powered by more than 300 HP?', products: ['boat'], outcome: 'refer' },
  { id: 'umb-board', text: 'Does any household member serve on a board of directors, hold public office, or have a high public profile?', products: ['umbrella'], outcome: 'refer' },
  { id: 'umb-aircraft', text: 'Does any household member own or operate an aircraft?', products: ['umbrella'], outcome: 'decline' },
  { id: 'comm-losses', text: 'Has the business had any property or liability losses over $10,000 in the past 3 years?', products: ['commercial'], outcome: 'refer' },
  { id: 'comm-hazmat', text: 'Do operations involve hazardous materials, explosives, or work above three stories?', products: ['commercial'], outcome: 'decline' },
  { id: 'comm-cois', text: 'Are subcontractors used without obtaining certificates of insurance?', products: ['commercial'], outcome: 'refer' },
  { id: 'life-health', text: 'In the past 5 years has the proposed insured been diagnosed with or treated for cancer, heart disease or stroke?', products: ['life'], outcome: 'refer' },
];

const questionsFor = (quote: Quote) => UW_QUESTIONS.filter((q) => q.products === 'all' || q.products.some((p) => quote.products.includes(p)));
function uwOutcome(quote: Quote) {
  const qs = questionsFor(quote);
  const reasons = productReferrals(quote);
  const declined = qs.some((q) => q.outcome === 'decline' && quote.underwriting[q.id] === 'yes') || reasons.some((r) => r.outcome === 'decline');
  const referred = qs.some((q) => q.outcome === 'refer' && quote.underwriting[q.id] === 'yes') || reasons.some((r) => r.outcome === 'refer');
  return { declined, referred, reasons, approved: quote.underwriting._approved === 'yes', requested: quote.underwriting._requested === 'yes' };
}

// Eligibility rules that come from the risk details rather than the yes/no questions.
function productReferrals(quote: Quote): { outcome: 'refer' | 'decline'; text: string }[] {
  const out: { outcome: 'refer' | 'decline'; text: string }[] = [];
  if (quote.products.includes('boat') && (quote.boat.length > 26 || quote.boat.horsepower > 300)) out.push({ outcome: 'refer', text: 'Boat exceeds 26 ft or 300 HP — outside the standard watercraft program.' });
  if (quote.products.includes('life')) {
    const age = ageFrom(quote.applicant.dob);
    if (age < 18 || age > 65) out.push({ outcome: 'decline', text: `ERIExpress Life is available for ages 18–65 (applicant is ${age}). Consider fully underwritten Term Life.` });
    if (bmi(quote.life.heightIn, quote.life.weightLb) >= 40) out.push({ outcome: 'refer', text: 'Build (BMI 40+) requires life underwriter review.' });
  }
  if (quote.products.includes('umbrella') && quote.umbrella.youthfulOperators > 2) out.push({ outcome: 'refer', text: 'More than two youthful operators on an umbrella requires underwriter review.' });
  if (quote.products.includes('commercial')) out.push(...commercialRules(quote.commercial));
  return out;
}

function stepsFor(quote: Quote): StepKey[] {
  const steps: StepKey[] = ['underwriting'];
  // Personal lines quotes rate auto, home and umbrella on the quoting screens; the wizard handles the application.
  const pl = quote.flow === 'pl';
  if (quote.products.includes('auto') && !pl) steps.push('drivers', 'vehicles');
  if (quote.products.includes('home') && !pl) steps.push('property');
  if ((quote.products.includes('auto') || quote.products.includes('home')) && !pl) steps.push('coverages');
  if (quote.products.includes('umbrella') && !pl) steps.push('umbrella');
  if (quote.products.includes('boat')) steps.push('boat');
  if (quote.products.includes('life')) steps.push('life');
  if (quote.products.includes('commercial')) steps.push('commercial');
  steps.push('summary', 'application', 'issued');
  return steps;
}

const VIN_YEAR: Record<string, number> = { G: 2016, H: 2017, J: 2018, K: 2019, L: 2020, M: 2021, N: 2022, P: 2023, R: 2024, S: 2025, T: 2026, V: 2027 };
const VIN_MAKE: Record<string, string> = { '1FT': 'Ford', '1FA': 'Ford', '1FM': 'Ford', '4S4': 'Subaru', '4S3': 'Subaru', JF2: 'Subaru', '2T3': 'Toyota', JTD: 'Toyota', '4T1': 'Toyota', JM3: 'Mazda', '19X': 'Honda', '1HG': 'Honda', '5FN': 'Honda', '1G1': 'Chevrolet', '3GC': 'Chevrolet', '1GC': 'Chevrolet', '5YJ': 'Tesla', KL4: 'Buick', WBA: 'BMW', '1C4': 'Jeep', '1HD': 'Harley-Davidson', KM8: 'Hyundai', '5XY': 'Kia' };
const MAKES = ['Buick', 'BMW', 'Chevrolet', 'Ford', 'GMC', 'Harley-Davidson', 'Honda', 'Hyundai', 'Jeep', 'Kia', 'Mazda', 'Nissan', 'Ram', 'Subaru', 'Tesla', 'Toyota', 'Volkswagen'];

const blankDriver = (quote: Quote): Driver => ({ id: `D${Date.now()}`, firstName: '', lastName: quote.applicant.lastName, dob: '', gender: 'M', maritalStatus: 'Single', relationship: 'Other Household', licenseState: quote.applicant.state, licenseNumber: '', yearsLicensed: 0, violations: 0, accidents: 0, driverTraining: false, goodStudent: false });
const blankVehicle = (quote: Quote): Vehicle => ({ id: `V${Date.now()}`, year: new Date().getFullYear() - 3, make: 'Toyota', model: '', vin: '', use: 'Commute', annualMiles: 12000, garagingZip: quote.applicant.zip, antiTheft: false, airbags: true, antiLock: true, lienholder: '', reducedUsage: false });

function seededPrefill(quote: Quote) {
  const seed = [...`${quote.applicant.lastName}${quote.applicant.zip}`].reduce((total, ch) => total + ch.charCodeAt(0), 0);
  const vehiclePool: Omit<Vehicle, 'id' | 'garagingZip'>[] = [
    { year: 2021, make: 'Honda', model: 'CR-V EX', vin: '5J6RW2H59ML004182', use: 'Commute', annualMiles: 12000, antiTheft: true, airbags: true, antiLock: true, lienholder: '', reducedUsage: false },
    { year: 2018, make: 'Ford', model: 'Escape SE', vin: '1FMCU9GD4JUA21734', use: 'Commute', annualMiles: 10000, antiTheft: true, airbags: true, antiLock: true, lienholder: '', reducedUsage: false },
    { year: 2023, make: 'Toyota', model: 'Camry LE', vin: '4T1C11AK3PU118823', use: 'Commute', annualMiles: 14000, antiTheft: true, airbags: true, antiLock: true, lienholder: 'Toyota Financial Services', reducedUsage: false },
    { year: 2016, make: 'Chevrolet', model: 'Equinox LT', vin: '2GNALCEK4G6290041', use: 'Pleasure', annualMiles: 7000, antiTheft: false, airbags: true, antiLock: true, lienholder: '', reducedUsage: false },
  ];
  const names = ['Jordan', 'Taylor', 'Casey', 'Morgan'];
  const ageGap = seed % 2 === 0 ? 2 : -3;
  const birthYear = Number(quote.applicant.dob.slice(0, 4) || 1980) + ageGap;
  return {
    vehicles: [vehiclePool[seed % 4], vehiclePool[(seed + 1) % 4]].map((v, i) => ({ ...v, id: `PV${i}`, garagingZip: quote.applicant.zip })),
    driver: { ...blankDriver(quote), id: 'PD1', firstName: names[seed % 4], dob: `${birthYear}-0${(seed % 9) + 1}-1${seed % 9}`, maritalStatus: 'Married' as const, relationship: 'Spouse' as const, gender: (seed % 2 ? 'F' : 'M') as Driver['gender'], yearsLicensed: 20 },
  };
}

export default function QuoteWizard() {
  const { quoteId = '', step = 'underwriting' } = useParams();
  const navigate = useNavigate();
  const { quotes, saveQuote, issueQuote, notify, addEnvelope, policies } = usePortal();
  const stored = quotes.find((q) => q.id === quoteId);
  const [draft, setDraft] = useState<Quote | undefined>(stored);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => { if (stored && (!draft || draft.id !== stored.id || (stored.status === 'Issued' && draft.status !== 'Issued'))) setDraft(stored); }, [stored]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (draft && stored && draft !== stored && draft.status !== 'Issued') saveQuote(draft); }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps
  // Clear errors only when the step actually changes, so an early click's validation isn't wiped on mount.
  const lastStepRef = useRef(step);
  useEffect(() => {
    if (lastStepRef.current === step) return;
    lastStepRef.current = step;
    setErrors([]);
    window.scrollTo(0, 0);
  }, [step]);

  // Named insured is always the first driver on an auto quote.
  useEffect(() => {
    if (draft && draft.flow !== 'pl' && step === 'drivers' && draft.drivers.length === 0) {
      setDraft({ ...draft, drivers: [{ ...blankDriver(draft), id: 'D1', firstName: draft.applicant.firstName, dob: draft.applicant.dob, relationship: 'Named Insured', yearsLicensed: Math.max(0, ageFrom(draft.applicant.dob) - 16) }] });
    }
  }, [step, draft]);

  const customerPolicies = useMemo(() => (draft?.customerId ? policies.filter((p) => p.customerId === draft.customerId) : []), [policies, draft?.customerId]);
  const rated = useMemo(() => (draft ? rateQuote(draft, customerPolicies) : null), [draft, customerPolicies]);
  const premiums = { auto: rated && lineOf(rated, 'auto'), home: rated && lineOf(rated, 'home'), boat: rated && lineOf(rated, 'boat'), life: rated && lineOf(rated, 'life') };

  if (!draft || !rated) return <div className="product-page"><QuoteHeader /><main className="product-main"><section className="product-card wizard-card"><h1>Quote not found</h1><p>This quote may have been deleted.</p><Link className="continue-action inline" to="/quotes">View all quotes</Link></section></main></div>;

  const update = (patch: Partial<Quote> | ((q: Quote) => Partial<Quote>)) => setDraft((current) => (current ? { ...current, ...(typeof patch === 'function' ? patch(current) : patch), updatedAt: new Date().toISOString() } : current));
  if (draft.flow === 'pl' && (PL_STEPS as string[]).includes(step)) return <PersonalQuote key={draft.id} quote={draft} step={step as PlStep} update={update} />;
  const steps = stepsFor(draft);
  const currentStep = (steps.includes(step as StepKey) ? step : 'underwriting') as StepKey;
  const index = steps.indexOf(currentStep);
  const visitedIndex = Math.max(steps.indexOf(draft.lastStep as StepKey), index);
  const outcome = uwOutcome(draft);
  const total = rated.total;

  const validate = (target: StepKey): string[] => {
    const problems: string[] = [];
    if (target === 'underwriting') {
      const unanswered = questionsFor(draft).filter((q) => !draft.underwriting[q.id]);
      if (unanswered.length) problems.push(`Answer all underwriting questions (${unanswered.length} remaining).`);
    }
    if (target === 'drivers') {
      if (!draft.drivers.length) problems.push('Add at least one driver.');
      draft.drivers.forEach((d) => {
        if (!d.firstName || !d.dob) problems.push(`Driver ${d.firstName || '(unnamed)'} needs a name and date of birth.`);
        if (d.licenseNumber.trim().length < 5) problems.push(`Enter a license number for ${d.firstName || 'each driver'}.`);
      });
    }
    if (target === 'vehicles') {
      if (!draft.vehicles.length) problems.push('Add at least one vehicle.');
      draft.vehicles.forEach((v) => { if (v.vin.length !== 17) problems.push(`VIN for ${v.year} ${v.make} ${v.model || ''} must be 17 characters.`); if (!v.model) problems.push(`Model is required for the ${v.year} ${v.make}.`); });
    }
    if (target === 'umbrella') {
      const check = umbrellaUnderlying(draft, customerPolicies);
      if (!check.autoOk) problems.push(`Umbrella underlying auto limits not met — ${check.autoText}. Required: 250/500/100 or 500 CSL.`);
      if (!check.homeOk) problems.push(`Umbrella underlying home liability not met — ${check.homeText}. Required: $300,000.`);
    }
    if (target === 'commercial') problems.push(...commercialValidation(draft.commercial));
    if (target === 'boat') {
      const b = draft.boat;
      if (!b.make.trim() || !b.model.trim()) problems.push('Enter the boat make and model.');
      if (b.length < 8 || b.length > 45) problems.push('Enter hull length in feet (8–45).');
      if (b.horsepower <= 0) problems.push('Enter total horsepower.');
      if (b.agreedValue < 1000) problems.push('Agreed value must be at least $1,000.');
      if (b.year < 1960 || b.year > new Date().getFullYear() + 1) problems.push('Enter a valid model year.');
    }
    if (target === 'life') {
      const l = draft.life;
      if (l.faceAmount < 25000 || l.faceAmount > 500000) problems.push('ERIExpress Life face amounts range from $25,000 to $500,000.');
      if (l.heightIn < 48 || l.heightIn > 90 || l.weightLb < 80 || l.weightLb > 500) problems.push('Enter a valid height and weight.');
      if (!l.beneficiary.trim()) problems.push('Name a primary beneficiary.');
      if (ageFrom(draft.applicant.dob) + l.term > 85) problems.push(`A ${l.term}-year term is not available at age ${ageFrom(draft.applicant.dob)} (term must end by age 85).`);
    }
    if (target === 'property') {
      if (draft.property.squareFeet < 400) problems.push('Enter finished square footage.');
      if (draft.property.yearBuilt < 1800 || draft.property.yearBuilt > new Date().getFullYear()) problems.push('Enter a valid year built.');
      if (draft.property.roofYear < draft.property.yearBuilt) problems.push('Roof year cannot be before the year built.');
    }
    if (target === 'application') {
      if (outcome.declined) problems.push('This risk is ineligible based on underwriting answers and cannot be bound.');
      if (outcome.referred && !outcome.approved) problems.push('Underwriter approval is required before binding.');
      if (!/^\(?\d{3}\)?[\s-]?\d{3}-?\d{4}$/.test(draft.applicant.phone)) problems.push('Enter a valid 10-digit phone number.');
      if (!/^\S+@\S+\.\S+$/.test(draft.applicant.email)) problems.push('Enter a valid email address.');
      if (!draft.priorCarrier) problems.push('Select the prior carrier (or "No prior insurance").');
      if (!draft.signatureMethod) problems.push('Choose a signature method.');
      if (draft.underwriting._disclosures !== 'yes') problems.push('Confirm the disclosures were reviewed with the applicant.');
      if (draft.underwriting._payment !== 'yes') problems.push('Capture the initial payment method.');
      if (draft.effectiveDate < today()) problems.push('Effective date cannot be in the past.');
    }
    return problems;
  };

  const goTo = (target: StepKey) => {
    const status: Quote['status'] = outcome.declined ? 'Declined' : outcome.referred && !outcome.approved ? 'Referred' : draft.status === 'Declined' || draft.status === 'Referred' ? 'Quote' : draft.status;
    const next = { ...draft, status, lastStep: steps.indexOf(target) > steps.indexOf(draft.lastStep as StepKey) ? target : draft.lastStep };
    setDraft(next);
    navigate(`/quotes/${draft.id}/${target}`);
  };

  const next = () => {
    const problems = validate(currentStep);
    setErrors(problems);
    if (problems.length) return;
    if (currentStep === 'underwriting' && outcome.declined) notify('Risk is ineligible — the quote can be saved but not bound.', 'error');
    else if (currentStep === 'underwriting' && outcome.referred && !outcome.approved) notify('Quote referred to underwriting. You can keep quoting while the underwriter reviews.', 'info');
    goTo(steps[index + 1]);
  };

  const bind = () => {
    // Re-check bind-critical steps: they may have been edited after they were passed.
    const problems = [...(['umbrella', 'commercial'] as StepKey[]).filter((s) => steps.includes(s)).flatMap(validate), ...validate('application')];
    setErrors(problems);
    if (problems.length) return;
    saveQuote({ ...draft, status: 'Application', lastStep: 'issued' });
    if (draft.signatureMethod === 'eSignature') addEnvelope({ customer: fullName(draft.applicant), document: `New Business Application — ${draft.id}` });
    const numbers = issueQuote(draft.id);
    notify(`Bound and issued ${numbers.length} polic${numbers.length === 1 ? 'y' : 'ies'}: ${numbers.join(', ')}`);
    navigate(`/quotes/${draft.id}/issued`);
  };

  const requestApproval = () => {
    update({ underwriting: { ...draft.underwriting, _requested: 'yes' } });
    notify('Referral sent to Angela Moretti, Personal Lines Underwriter.', 'info');
    window.setTimeout(() => {
      setDraft((current) => (current ? { ...current, status: 'Quote', underwriting: { ...current.underwriting, _approved: 'yes' } } : current));
      notify('Underwriting approved the referral. You may bind this quote.');
    }, 2200);
  };

  const body: Record<StepKey, ReactNode> = {
    underwriting: <UnderwritingStep quote={draft} onAnswer={(answers) => update({ underwriting: { ...draft.underwriting, ...answers } })} />,
    drivers: <DriversStep quote={draft} update={update} />,
    vehicles: <VehiclesStep quote={draft} update={update} />,
    property: <PropertyStep quote={draft} update={update} />,
    umbrella: <UmbrellaStep quote={draft} update={update} existing={customerPolicies} rated={rated} />,
    commercial: <CommercialStep quote={draft} update={update} rated={rated} />,
    boat: <BoatStep quote={draft} update={update} breakdown={premiums.boat} />,
    life: <LifeStep quote={draft} update={update} breakdown={premiums.life} />,
    coverages: <CoveragesStep quote={draft} update={update} />,
    summary: <SummaryStep quote={draft} update={update} rated={rated} existing={customerPolicies} />,
    application: <ApplicationStep quote={draft} update={update} total={total} />,
    issued: <IssuedStep quote={draft} />,
  };

  const existingPolicies = customerPolicies;
  const bundleSavings = -rated.bundleCredits.reduce((s, c) => s + c.amount, 0);

  return <div className="product-page">
    <QuoteHeader />
    <main className="product-main wizard-main">
      <div className="product-breadcrumb"><Home size={12} fill="#003b70" /> <Link to="/quotes">QUOTES</Link> <span>›</span> <strong>{stepLabels[currentStep].toUpperCase()}</strong><span className="crumb-right">{draft.id} · <StatusBadge status={draft.status} /></span></div>
      <ol className="wizard-steps">{steps.map((s, i) => { const reachable = draft.status === 'Issued' ? s === 'issued' : i <= visitedIndex && s !== 'issued'; return <li key={s} className={`${s === currentStep ? 'current' : ''} ${i < index ? 'done' : ''}`}><button type="button" disabled={!reachable} onClick={() => goTo(s)}><span>{i < index ? <Check size={12} /> : i + 1}</span>{stepLabels[s]}</button></li>; })}</ol>

      {outcome.declined && currentStep !== 'issued' && <div className="wizard-banner bad"><AlertTriangle size={16} /> Ineligible: one or more underwriting answers fall outside ERIE guidelines. This quote cannot be bound. <button type="button" onClick={() => goTo('underwriting')}>Review answers</button></div>}
      {!outcome.declined && outcome.referred && !outcome.approved && currentStep !== 'underwriting' && currentStep !== 'issued' && <div className="wizard-banner warn"><AlertTriangle size={16} /> Referred to underwriting. {outcome.requested ? 'Awaiting underwriter decision…' : <button type="button" onClick={requestApproval}>Submit referral to underwriter</button>}</div>}
      {outcome.approved && currentStep !== 'issued' && <div className="wizard-banner good"><ShieldCheck size={16} /> Underwriter approval received — eligible to bind.</div>}
      {outcome.reasons.length > 0 && !outcome.approved && currentStep !== 'issued' && <ul className="wizard-reasons">{outcome.reasons.map((r) => <li key={r.text} className={r.outcome}>{r.text}</li>)}</ul>}

      <div className="wizard-layout">
        <section className="product-card wizard-card">
          <h1>{stepLabels[currentStep]}</h1>
          {body[currentStep]}
          {errors.length > 0 && <ul className="quote-errors" role="alert">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}
        </section>
        {currentStep !== 'issued' && <aside className="wizard-aside">
          <div className="product-card aside-card"><h3>Applicant</h3><strong>{fullName(draft.applicant)}</strong><span>{draft.applicant.address}</span><span>{draft.applicant.city}, {draft.applicant.state} {draft.applicant.zip}</span>{draft.applicant.dob && <span>DOB {draft.applicant.dob} · Age {ageFrom(draft.applicant.dob)}</span>}{draft.products.includes('commercial') && draft.commercial.business.businessName && <span>Business: {draft.commercial.business.businessName}</span>}{existingPolicies.length > 0 && <Link to={`/customers/${draft.customerId}`}>Existing customer · {existingPolicies.length} policies</Link>}</div>
          <div className="product-card aside-card premium-card"><h3>Estimated annual premium</h3><div className="premium-total">{money(total)}</div><small className="per-month">≈ {money(rated.schedule.perPayment, true)} × {rated.schedule.count} ({payPlanLabel[draft.payPlan]})</small>{rated.lines.map((l) => <div className="premium-row" key={l.key}><span>{lineIcon(l.key)} {l.breakdown.name ?? l.breakdown.product}</span><span>{l.breakdown.total ? money(l.breakdown.total) : '—'}</span></div>)}{rated.taxes.map((t) => <div className="premium-row tax" key={t.label}><span>Taxes &amp; fees</span><span>{money(t.amount)}</span></div>)}{bundleSavings > 0 && <div className="bundle-savings">Multi-policy savings: {money(bundleSavings)}</div>}<small>Illustrative rating — final premium determined at issue.</small></div>
          <button type="button" className="outline-action wide" onClick={() => { saveQuote(draft); notify(`Quote ${draft.id} saved.`); }}><Save size={13} /> SAVE QUOTE</button>
        </aside>}
      </div>

      {currentStep !== 'issued' && <div className="product-actions"><button className="outline-action" type="button" onClick={() => { saveQuote(draft); navigate('/quotes'); }}>SAVE &amp; EXIT</button><div><button className="outline-action" type="button" onClick={() => (index === 0 && draft.flow === 'pl' ? navigate(`/quotes/${draft.id}/coverages`) : index === 0 ? navigate(`/quotes/select-products?${new URLSearchParams({ ...draft.applicant, ...(draft.customerId ? { customerId: draft.customerId } : {}) }).toString()}`) : goTo(steps[index - 1]))}>PREVIOUS</button>{currentStep === 'application' ? <button className="continue-action" type="button" onClick={bind}>BIND &amp; ISSUE</button> : <button className="continue-action" type="button" onClick={next}>CONTINUE</button>}</div></div>}
    </main>
  </div>;
}

function lineIcon(key: string) {
  if (key === 'auto') return <Car size={13} />;
  if (key === 'home') return <Home size={13} />;
  if (key === 'umbrella') return <Umbrella size={13} />;
  if (key === 'boat') return <Sailboat size={13} />;
  if (key === 'life') return <Heart size={13} />;
  return <Building2 size={13} />;
}

function YesNo({ value, onChange, name }: { value: string; onChange: (value: 'yes' | 'no') => void; name: string }) {
  return <div className="yes-no" role="radiogroup">{(['yes', 'no'] as const).map((option) => <label key={option} className={value === option ? 'checked' : ''}><input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} />{option === 'yes' ? 'Yes' : 'No'}</label>)}</div>;
}

function UnderwritingStep({ quote, onAnswer }: { quote: Quote; onAnswer: (answers: Record<string, 'yes' | 'no'>) => void }) {
  const qs = questionsFor(quote);
  return <>
    <p className="wizard-intro">Ask the applicant each question. Answers become part of the signed application.</p>
    <div className="wizard-actions-row"><button type="button" className="link-button" onClick={() => onAnswer(Object.fromEntries(qs.filter((q) => !quote.underwriting[q.id]).map((q) => [q.id, 'no'])))}>Answer “No” to all unanswered</button></div>
    <ol className="uw-list">{qs.map((q) => <li key={q.id} className={quote.underwriting[q.id] === 'yes' ? 'flagged' : ''}><span>{q.text}{quote.underwriting[q.id] === 'yes' && <em>{q.outcome === 'decline' ? 'Ineligible risk' : 'Requires underwriter review'}</em>}</span><YesNo name={q.id} value={quote.underwriting[q.id] ?? ''} onChange={(value) => onAnswer({ [q.id]: value })} /></li>)}</ol>
  </>;
}

function DriversStep({ quote, update }: { quote: Quote; update: (patch: Partial<Quote>) => void }) {
  const [editing, setEditing] = useState<Driver | null>(null);
  const [prefill, setPrefill] = useState<Driver | null>(null);
  const [ran, setRan] = useState(false);
  const save = (driver: Driver) => { update({ drivers: quote.drivers.some((d) => d.id === driver.id) ? quote.drivers.map((d) => (d.id === driver.id ? driver : d)) : [...quote.drivers, driver] }); setEditing(null); };
  return <>
    <p className="wizard-intro">List every licensed household member. Exclusions require a signed Named Driver Exclusion (AU-220).</p>
    <div className="wizard-actions-row"><button type="button" className="outline-action" onClick={() => setEditing(blankDriver(quote))}><UserPlus size={13} /> ADD DRIVER</button><button type="button" className="outline-action" disabled={ran} onClick={() => { setPrefill(seededPrefill(quote).driver); setRan(true); }}><Wand2 size={13} /> {ran ? 'PREFILL COMPLETE' : 'RUN HOUSEHOLD PREFILL'}</button></div>
    {prefill && <div className="prefill-card"><strong>Public records found a possible household member:</strong><span>{prefill.firstName} {prefill.lastName} · DOB {prefill.dob}</span><div><button type="button" className="continue-action" onClick={() => { setEditing(prefill); setPrefill(null); }}>ADD AS DRIVER</button><button type="button" className="outline-action" onClick={() => setPrefill(null)}>NOT IN HOUSEHOLD</button></div></div>}
    <table className="px-table"><thead><tr><th>Driver</th><th>Relationship</th><th>Age</th><th>License</th><th>Incidents (3 yr)</th><th /></tr></thead><tbody>{quote.drivers.map((d) => <tr key={d.id}><td><strong>{d.firstName} {d.lastName}</strong></td><td>{d.relationship}</td><td>{d.dob ? ageFrom(d.dob) : '—'}</td><td>{d.licenseNumber ? `${d.licenseState} ${d.licenseNumber}` : <span className="needs">Needed</span>}</td><td>{d.violations} viol. · {d.accidents} acc.</td><td className="row-actions"><button type="button" onClick={() => setEditing(d)} aria-label={`Edit ${d.firstName}`}><Pencil size={14} /></button>{d.relationship !== 'Named Insured' && <button type="button" onClick={() => update({ drivers: quote.drivers.filter((x) => x.id !== d.id) })} aria-label={`Remove ${d.firstName}`}><Trash2 size={14} /></button>}</td></tr>)}</tbody></table>
    {editing && <DriverModal driver={editing} onClose={() => setEditing(null)} onSave={save} />}
  </>;
}

export function DriverModal({ driver, onClose, onSave }: { driver: Driver; onClose: () => void; onSave: (driver: Driver) => void }) {
  const [d, setD] = useState(driver);
  const [error, setError] = useState('');
  const set = <K extends keyof Driver>(key: K, value: Driver[K]) => setD((current) => ({ ...current, [key]: value }));
  const submit = () => { if (!d.firstName || !d.lastName || !d.dob) return setError('Name and date of birth are required.'); if (ageFrom(d.dob) < 15) return setError('Driver must be at least 15 (permit holders included).'); onSave(d); };
  return <Modal title={driver.firstName ? `Edit driver — ${driver.firstName}` : 'Add driver'} onClose={onClose} wide footer={<><button type="button" className="px-btn ghost" onClick={onClose}>Cancel</button><button type="button" className="px-btn" onClick={submit}>Save driver</button></>}>
    <div className="px-grid3">
      <Field label="First name" required><input value={d.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
      <Field label="Last name" required><input value={d.lastName} onChange={(e) => set('lastName', e.target.value)} /></Field>
      <Field label="Date of birth" required><input type="date" value={d.dob} onChange={(e) => set('dob', e.target.value)} /></Field>
      <Field label="Gender"><select value={d.gender} onChange={(e) => set('gender', e.target.value as Driver['gender'])}><option value="M">Male</option><option value="F">Female</option><option value="X">Non-binary / X</option></select></Field>
      <Field label="Marital status"><select value={d.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value as Driver['maritalStatus'])}><option>Single</option><option>Married</option><option>Widowed</option><option>Divorced</option></select></Field>
      <Field label="Relationship"><select value={d.relationship} disabled={driver.relationship === 'Named Insured'} onChange={(e) => set('relationship', e.target.value as Driver['relationship'])}><option>Named Insured</option><option>Spouse</option><option>Child</option><option>Other Household</option></select></Field>
      <Field label="License state"><select value={d.licenseState} onChange={(e) => set('licenseState', e.target.value)}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></Field>
      <Field label="License number" required><input value={d.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value.toUpperCase())} /></Field>
      <Field label="Years licensed"><input type="number" min={0} value={d.yearsLicensed} onChange={(e) => set('yearsLicensed', Number(e.target.value))} /></Field>
      <Field label="Violations (3 yrs)"><input type="number" min={0} max={9} value={d.violations} onChange={(e) => set('violations', Number(e.target.value))} /></Field>
      <Field label="At-fault accidents (3 yrs)"><input type="number" min={0} max={9} value={d.accidents} onChange={(e) => set('accidents', Number(e.target.value))} /></Field>
    </div>
    <div className="px-checks inline"><label><input type="checkbox" checked={d.driverTraining} onChange={(e) => set('driverTraining', e.target.checked)} /> Completed driver training</label><label><input type="checkbox" checked={d.goodStudent} onChange={(e) => set('goodStudent', e.target.checked)} /> Good student (B average)</label></div>
    {error && <div className="agent-error block">{error}</div>}
  </Modal>;
}

function VehiclesStep({ quote, update }: { quote: Quote; update: (patch: Partial<Quote>) => void }) {
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [suggestions, setSuggestions] = useState<Vehicle[] | null>(null);
  const save = (vehicle: Vehicle) => { update({ vehicles: quote.vehicles.some((v) => v.id === vehicle.id) ? quote.vehicles.map((v) => (v.id === vehicle.id ? vehicle : v)) : [...quote.vehicles, vehicle] }); setEditing(null); };
  return <>
    <p className="wizard-intro">Vehicles must be owned by or registered to a household member. Order prefill to pull registrations at this address.</p>
    <div className="wizard-actions-row"><button type="button" className="outline-action" onClick={() => setEditing(blankVehicle(quote))}><Plus size={13} /> ADD VEHICLE</button><button type="button" className="outline-action" disabled={suggestions !== null} onClick={() => setSuggestions(seededPrefill(quote).vehicles)}><Wand2 size={13} /> ORDER VEHICLE PREFILL</button></div>
    {suggestions && suggestions.length > 0 && <div className="prefill-card"><strong>Registrations found at {quote.applicant.address}:</strong>{suggestions.map((v) => <div key={v.id} className="prefill-row"><span>{v.year} {v.make} {v.model} · VIN {v.vin}</span><div><button type="button" className="continue-action" onClick={() => { save({ ...v, id: `V${Date.now()}` }); setSuggestions(suggestions.filter((s) => s.id !== v.id)); }}>ADD</button><button type="button" className="outline-action" onClick={() => setSuggestions(suggestions.filter((s) => s.id !== v.id))}>DISMISS</button></div></div>)}</div>}
    {quote.vehicles.length === 0 ? <div className="px-empty">No vehicles yet. Add a vehicle or order prefill.</div> : <table className="px-table"><thead><tr><th>Vehicle</th><th>VIN</th><th>Use</th><th>Annual miles</th><th>Safety</th><th /></tr></thead><tbody>{quote.vehicles.map((v) => <tr key={v.id}><td><strong>{v.year} {v.make} {v.model}</strong>{v.lienholder && <small className="cell-note">Lien: {v.lienholder}</small>}</td><td className="mono">{v.vin || <span className="needs">Needed</span>}</td><td>{v.use}</td><td>{v.annualMiles.toLocaleString()}</td><td>{[v.airbags && 'Airbags', v.antiLock && 'ABS', v.antiTheft && 'Anti-theft'].filter(Boolean).join(', ') || '—'}</td><td className="row-actions"><button type="button" onClick={() => setEditing(v)} aria-label="Edit vehicle"><Pencil size={14} /></button><button type="button" onClick={() => update({ vehicles: quote.vehicles.filter((x) => x.id !== v.id) })} aria-label="Remove vehicle"><Trash2 size={14} /></button></td></tr>)}</tbody></table>}
    {editing && <VehicleModal vehicle={editing} onClose={() => setEditing(null)} onSave={save} />}
  </>;
}

export function VehicleModal({ vehicle, onClose, onSave }: { vehicle: Vehicle; onClose: () => void; onSave: (vehicle: Vehicle) => void }) {
  const [v, setV] = useState(vehicle);
  const [message, setMessage] = useState('');
  const set = <K extends keyof Vehicle>(key: K, value: Vehicle[K]) => setV((current) => ({ ...current, [key]: value }));
  const decode = () => {
    if (v.vin.length !== 17) return setMessage('VIN must be 17 characters to decode.');
    const year = VIN_YEAR[v.vin[9]];
    const make = VIN_MAKE[v.vin.slice(0, 3)];
    setV((current) => ({ ...current, year: year ?? current.year, make: make ?? current.make }));
    setMessage(year || make ? `Decoded: ${year ?? v.year} ${make ?? v.make}. Confirm model and trim.` : 'VIN not recognized — enter details manually.');
  };
  const submit = () => { if (v.vin.length !== 17) return setMessage('A valid 17-character VIN is required.'); if (!v.model) return setMessage('Model is required.'); onSave(v); };
  return <Modal title={vehicle.model ? `Edit — ${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Add vehicle'} onClose={onClose} wide footer={<><button type="button" className="px-btn ghost" onClick={onClose}>Cancel</button><button type="button" className="px-btn" onClick={submit}>Save vehicle</button></>}>
    <div className="vin-row"><Field label="VIN" required><input value={v.vin} maxLength={17} onChange={(e) => set('vin', e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ''))} className="mono" /></Field><button type="button" className="px-btn ghost" onClick={decode}>Decode VIN</button></div>
    <div className="px-grid3">
      <Field label="Year" required><input type="number" value={v.year} onChange={(e) => set('year', Number(e.target.value))} /></Field>
      <Field label="Make" required><select value={v.make} onChange={(e) => set('make', e.target.value)}>{[...new Set([...MAKES, v.make])].map((m) => <option key={m}>{m}</option>)}</select></Field>
      <Field label="Model" required><input value={v.model} onChange={(e) => set('model', e.target.value)} /></Field>
      <Field label="Primary use"><select value={v.use} onChange={(e) => set('use', e.target.value as Vehicle['use'])}><option>Pleasure</option><option>Commute</option><option>Business</option><option>Farm</option></select></Field>
      <Field label="Annual miles"><input type="number" step={500} value={v.annualMiles} onChange={(e) => set('annualMiles', Number(e.target.value))} /></Field>
      <Field label="Garaging ZIP"><input value={v.garagingZip} onChange={(e) => set('garagingZip', e.target.value.replace(/\D/g, '').slice(0, 5))} /></Field>
      <Field label="Lienholder / lessor" className="span2"><input value={v.lienholder} onChange={(e) => set('lienholder', e.target.value)} placeholder="None" /></Field>
    </div>
    <div className="px-checks inline"><label><input type="checkbox" checked={v.airbags} onChange={(e) => set('airbags', e.target.checked)} /> Factory air bags</label><label><input type="checkbox" checked={v.antiLock} onChange={(e) => set('antiLock', e.target.checked)} /> Anti-lock brakes</label><label><input type="checkbox" checked={v.antiTheft} onChange={(e) => set('antiTheft', e.target.checked)} /> Anti-theft device</label><label><input type="checkbox" checked={v.reducedUsage} onChange={(e) => set('reducedUsage', e.target.checked)} /> Not driven 90+ consecutive days (reduced usage)</label></div>
    {message && <div className="px-note">{message}</div>}
  </Modal>;
}

export function estimateReplacementCost(property: Quote['property']) {
  const perSqFt = property.construction === 'Masonry' ? 182 : property.construction === 'Masonry Veneer' ? 171 : 158;
  const storyAdj = property.stories > 1 ? 0.96 : 1.04;
  const roofAdj = property.roofType === 'Slate' ? 1.08 : property.roofType === 'Tile' ? 1.05 : property.roofType === 'Metal' ? 1.03 : 1;
  return Math.round((property.squareFeet * perSqFt * storyAdj * roofAdj) / 1000) * 1000;
}

function PropertyStep({ quote, update }: { quote: Quote; update: (patch: Partial<Quote>) => void }) {
  const p = quote.property;
  const set = <K extends keyof Quote['property']>(key: K, value: Quote['property'][K]) => update({ property: { ...p, [key]: value } });
  const estimate = estimateReplacementCost(p);
  return <>
    <p className="wizard-intro">Confirm the dwelling characteristics for {quote.applicant.address}. Coverage A must reflect 100% of the estimated replacement cost.</p>
    <div className="px-grid3">
      <Field label="Dwelling type"><select value={p.dwellingType} onChange={(e) => set('dwellingType', e.target.value as typeof p.dwellingType)}><option>Single Family</option><option>Townhouse</option><option>Condo</option></select></Field>
      <Field label="Year built" required><input type="number" value={p.yearBuilt} onChange={(e) => set('yearBuilt', Number(e.target.value))} /></Field>
      <Field label="Finished sq. ft." required><input type="number" step={50} value={p.squareFeet} onChange={(e) => set('squareFeet', Number(e.target.value))} /></Field>
      <Field label="Construction"><select value={p.construction} onChange={(e) => set('construction', e.target.value as typeof p.construction)}><option>Frame</option><option>Masonry</option><option>Masonry Veneer</option></select></Field>
      <Field label="Stories"><select value={p.stories} onChange={(e) => set('stories', Number(e.target.value))}><option value={1}>1</option><option value={1.5}>1.5</option><option value={2}>2</option><option value={3}>3</option></select></Field>
      <Field label="Roof type"><select value={p.roofType} onChange={(e) => set('roofType', e.target.value as typeof p.roofType)}><option>Asphalt Shingle</option><option>Metal</option><option>Slate</option><option>Tile</option></select></Field>
      <Field label="Roof installed (year)" required hint={new Date().getFullYear() - p.roofYear > 20 ? 'Roofs over 20 years refer to underwriting' : undefined}><input type="number" value={p.roofYear} onChange={(e) => set('roofYear', Number(e.target.value))} /></Field>
      <Field label="Primary heat"><select value={p.heating} onChange={(e) => set('heating', e.target.value as typeof p.heating)}><option>Gas Forced Air</option><option>Electric</option><option>Oil</option><option>Heat Pump</option></select></Field>
      <Field label="Fire protection class"><select value={p.protectionClass} onChange={(e) => set('protectionClass', Number(e.target.value))}>{Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></Field>
    </div>
    <div className="px-checks inline"><label><input type="checkbox" checked={p.smokeAlarms} onChange={(e) => set('smokeAlarms', e.target.checked)} /> Smoke alarms</label><label><input type="checkbox" checked={p.burglarAlarm} onChange={(e) => set('burglarAlarm', e.target.checked)} /> Central burglar alarm</label><label><input type="checkbox" checked={p.sprinklers} onChange={(e) => set('sprinklers', e.target.checked)} /> Automatic sprinklers</label></div>
    <div className="estimate-card"><div><strong>Home Cost Estimator</strong><span>Estimated replacement cost: <b>{money(estimate)}</b></span><span>Current Coverage A: {money(quote.homeCoverages.dwelling)}{quote.homeCoverages.dwelling < estimate && <em className="needs"> — below estimate</em>}</span></div><button type="button" className="continue-action" onClick={() => update({ homeCoverages: { ...quote.homeCoverages, dwelling: estimate } })}>USE ESTIMATE FOR COVERAGE A</button></div>
  </>;
}

function Endorsement({ checked, onChange, title, children, price }: { checked: boolean; onChange: (value: boolean) => void; title: string; children: ReactNode; price: string }) {
  return <label className={`endorsement ${checked ? 'on' : ''}`}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span><strong>{title}</strong><small>{children}</small></span><em>{price}</em></label>;
}

function CoveragesStep({ quote, update }: { quote: Quote; update: (patch: Partial<Quote>) => void }) {
  const { notify } = usePortal();
  const [templates, setTemplates] = useState(loadTemplates);
  const a = quote.autoCoverages;
  const h = quote.homeCoverages;
  const setA = <K extends keyof typeof a>(key: K, value: (typeof a)[K]) => update({ autoCoverages: { ...a, [key]: value } });
  const setH = <K extends keyof typeof h>(key: K, value: (typeof h)[K]) => update({ homeCoverages: { ...h, [key]: value } });
  const saveAsTemplate = () => {
    const name = window.prompt('Template name', `${quote.products.join(' + ')} standard`);
    if (!name) return;
    const next = [{ id: `T${Date.now()}`, name, created: today(), autoCoverages: a, homeCoverages: h }, ...templates];
    saveTemplates(next); setTemplates(next); notify(`Template “${name}” saved.`);
  };
  return <>
    <div className="wizard-actions-row"><select aria-label="Apply a template" value="" onChange={(e) => { const t = templates.find((x) => x.id === e.target.value); if (t) { update({ autoCoverages: t.autoCoverages, homeCoverages: { ...t.homeCoverages, dwelling: h.dwelling } }); notify(`Applied template “${t.name}”.`, 'info'); } }}><option value="">{templates.length ? 'Apply a template…' : 'No saved templates'}</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select><button type="button" className="outline-action" onClick={saveAsTemplate}><Save size={13} /> SAVE AS TEMPLATE</button></div>
    {quote.products.includes('auto') && <div className="coverage-group"><h2><Car size={16} /> Auto coverages</h2>
      <div className="px-grid3">
        <Field label="Bodily injury liability" hint={quote.products.includes('umbrella') && !['250/500', '500/500', '500 CSL'].includes(a.bodilyInjury) ? 'Umbrella requires 250/500 or 500 CSL' : undefined}><select value={a.bodilyInjury} onChange={(e) => setA('bodilyInjury', e.target.value)}>{BI_OPTIONS.map((o) => <option key={o} value={o}>{(o.includes('CSL') ? `$${o.replace(' CSL', '')}K CSL` : `$${o.replace('/', 'K/$')}K`)}</option>)}</select></Field>
        <Field label="Property damage liability"><select value={a.propertyDamage} onChange={(e) => setA('propertyDamage', e.target.value)}>{PD_OPTIONS.map((o) => <option key={o} value={o}>${o}</option>)}</select></Field>
        <Field label="Uninsured / underinsured motorists"><select value={a.uninsuredMotorist} onChange={(e) => setA('uninsuredMotorist', e.target.value)}>{UM_OPTIONS.map((o) => <option key={o} value={o}>{(o.includes('CSL') ? `$${o.replace(' CSL', '')}K CSL` : `$${o.replace('/', 'K/$')}K`)}</option>)}</select></Field>
        <Field label="Medical payments / first party benefits"><select value={a.medicalPayments} onChange={(e) => setA('medicalPayments', e.target.value)}>{['None', '1,000', '5,000', '10,000'].map((o) => <option key={o} value={o}>{o === 'None' ? 'None' : `$${o}`}</option>)}</select></Field>
        <Field label="Comprehensive deductible"><select value={a.comprehensiveDeductible} onChange={(e) => setA('comprehensiveDeductible', Number(e.target.value))}>{[0, 100, 250, 500, 1000].map((o) => <option key={o} value={o}>{o === 0 ? 'Full glass / $0' : `$${o}`}</option>)}</select></Field>
        <Field label="Collision deductible"><select value={a.collisionDeductible} onChange={(e) => setA('collisionDeductible', Number(e.target.value))}>{[100, 250, 500, 1000, 2000].map((o) => <option key={o} value={o}>${o.toLocaleString()}</option>)}</select></Field>
      </div>
      <div className="endorsements">
        <Endorsement checked={a.rateLock} onChange={(v) => setA('rateLock', v)} title="ERIE Rate Lock®" price="Included">Premium changes only when a driver, vehicle or address changes — even after a claim.</Endorsement>
        <Endorsement checked={a.autoPlus} onChange={(v) => setA('autoPlus', v)} title="ERIE Auto Plus® endorsement" price="+$30/yr">Diminishing deductible ($100 off per claim-free year, up to $500), higher limits on extras, $10,000 death benefit.</Endorsement>
        <Endorsement checked={a.emergencyRoadService} onChange={(v) => setA('emergencyRoadService', v)} title="Emergency road service" price={`+${money(14 * Math.max(1, quote.vehicles.length))}/yr`}>Towing, jump-starts, flat tires, lockouts and fuel delivery.</Endorsement>
        <Endorsement checked={a.transportationExpense} onChange={(v) => setA('transportationExpense', v)} title="Transportation expenses" price={`+${money(22 * Math.max(1, quote.vehicles.length))}/yr`}>Rental car or ride costs while the vehicle is out of service after a covered loss.</Endorsement>
        <Endorsement checked={a.newAutoSecurity} onChange={(v) => setA('newAutoSecurity', v)} title="New Auto Security" price="+$42/vehicle">Replace a totaled vehicle up to two model years old with a brand-new one — no depreciation.</Endorsement>
      </div>
    </div>}
    {quote.products.includes('home') && <div className="coverage-group"><h2><Home size={16} /> ErieSecure Home® coverages</h2>
      <div className="px-grid3">
        <Field label="A — Dwelling" hint="Guaranteed Replacement Cost applies"><input type="number" step={5000} value={h.dwelling} onChange={(e) => setH('dwelling', Number(e.target.value))} /></Field>
        <Field label="B — Other structures (% of A)"><select value={h.otherStructuresPct} onChange={(e) => setH('otherStructuresPct', Number(e.target.value))}>{[10, 15, 20].map((o) => <option key={o} value={o}>{o}% · {money(h.dwelling * o / 100)}</option>)}</select></Field>
        <Field label="C — Personal property (% of A)"><select value={h.personalPropertyPct} onChange={(e) => setH('personalPropertyPct', Number(e.target.value))}>{[50, 60, 70].map((o) => <option key={o} value={o}>{o}% · {money(h.dwelling * o / 100)}</option>)}</select></Field>
        <Field label="D — Loss of use (% of A)"><select value={h.lossOfUsePct} onChange={(e) => setH('lossOfUsePct', Number(e.target.value))}>{[20, 30].map((o) => <option key={o} value={o}>{o}% · {money(h.dwelling * o / 100)}</option>)}</select></Field>
        <Field label="E — Personal liability" hint={quote.products.includes('umbrella') && h.personalLiability < 300000 ? 'Umbrella requires $300,000' : undefined}><select value={h.personalLiability} onChange={(e) => setH('personalLiability', Number(e.target.value))}>{[100000, 300000, 500000, 1000000].map((o) => <option key={o} value={o}>{money(o)}</option>)}</select></Field>
        <Field label="F — Medical payments to others"><select value={h.medicalPayments} onChange={(e) => setH('medicalPayments', Number(e.target.value))}>{[1000, 2000, 5000].map((o) => <option key={o} value={o}>{money(o)}</option>)}</select></Field>
        <Field label="All-peril deductible"><select value={h.deductible} onChange={(e) => setH('deductible', Number(e.target.value))}>{[500, 1000, 2500, 5000].map((o) => <option key={o} value={o}>{money(o)}</option>)}</select></Field>
        <Field label="Scheduled valuables (total)"><input type="number" step={1000} value={h.scheduledValuables} onChange={(e) => setH('scheduledValuables', Number(e.target.value))} /></Field>
      </div>
      <div className="endorsements">
        <Endorsement checked={h.waterBackup} onChange={(v) => setH('waterBackup', v)} title="Water backup & sump discharge" price="+$65/yr">Water that backs up through sewers, drains or overflows from a sump pump.</Endorsement>
        <Endorsement checked={h.identityRecovery} onChange={(v) => setH('identityRecovery', v)} title="Identity recovery" price="+$25/yr">Expenses and case management to restore a stolen identity.</Endorsement>
        <Endorsement checked={h.equipmentBreakdown} onChange={(v) => setH('equipmentBreakdown', v)} title="Equipment breakdown" price="+$30/yr">Mechanical or electrical breakdown of HVAC, appliances and home systems.</Endorsement>
        <Endorsement checked={h.serviceLine} onChange={(v) => setH('serviceLine', v)} title="Service line (underground utility lines)" price="+$22/yr">Underground water, sewer, power and data lines on the property.</Endorsement>
        <Endorsement checked={h.homeSharing} onChange={(v) => setH('homeSharing', v)} title="Home-sharing host" price="+$55/yr">Coverage while renting part of the home through home-sharing platforms.</Endorsement>
      </div>
    </div>}
    {!quote.products.includes('auto') && !quote.products.includes('home') && <p className="wizard-intro">Boat and life coverages were selected on their own steps. Review pricing on the next step.</p>}
  </>;
}

function StepPremium({ breakdown, label }: { breakdown: PremiumBreakdown | null; label: string }) {
  if (!breakdown) return null;
  return <div className="estimate-card"><div><strong>{label}</strong><span className="big">{money(breakdown.total)}</span><span>{breakdown.discounts.length ? `Includes ${breakdown.discounts.map((d) => d.label.replace(/ discount$/i, '')).join(', ')} discount${breakdown.discounts.length > 1 ? 's' : ''}.` : breakdown.product === 'Life' ? 'Premium is guaranteed level for the full term.' : 'No discounts applied yet.'}</span></div></div>;
}

function BoatStep({ quote, update, breakdown }: { quote: Quote; update: (patch: Partial<Quote>) => void; breakdown: PremiumBreakdown | null }) {
  const b = quote.boat;
  const set = <K extends keyof typeof b>(key: K, value: (typeof b)[K]) => update({ boat: { ...b, [key]: value } });
  return <>
    <p className="wizard-intro">Physical damage is written on an agreed-value basis. Boats over 26 feet or 300 HP refer to underwriting.</p>
    <h2 className="section-h"><Sailboat size={15} /> Watercraft</h2>
    <div className="px-grid3">
      <Field label="Model year" required><input type="number" value={b.year} onChange={(e) => set('year', Number(e.target.value))} /></Field>
      <Field label="Make" required><input value={b.make} onChange={(e) => set('make', e.target.value)} placeholder="Lund, Bennington, Sea Ray…" /></Field>
      <Field label="Model" required><input value={b.model} onChange={(e) => set('model', e.target.value)} /></Field>
      <Field label="Hull type"><select value={b.hullType} onChange={(e) => set('hullType', e.target.value as typeof b.hullType)}><option>Aluminum</option><option>Fiberglass</option><option>Pontoon</option><option>Personal Watercraft</option></select></Field>
      <Field label="Engine type"><select value={b.engine} onChange={(e) => set('engine', e.target.value as typeof b.engine)}><option>Outboard</option><option>Inboard/Outboard</option><option>Inboard</option><option>Jet</option></select></Field>
      <Field label="Length (ft)" required hint={b.length > 26 ? 'Over 26 ft — refers to underwriting' : undefined}><input type="number" value={b.length} onChange={(e) => set('length', Number(e.target.value))} /></Field>
      <Field label="Total horsepower" required hint={b.horsepower > 300 ? 'Over 300 HP — refers to underwriting' : undefined}><input type="number" value={b.horsepower} onChange={(e) => set('horsepower', Number(e.target.value))} /></Field>
      <Field label="Storage"><select value={b.storage} onChange={(e) => set('storage', e.target.value as typeof b.storage)}><option>Trailer at residence</option><option>Marina slip</option><option>Lift at residence</option></select></Field>
      <Field label="Navigation waters"><select value={b.waters} onChange={(e) => set('waters', e.target.value as typeof b.waters)}><option>Inland lakes & rivers</option><option>Great Lakes</option><option>Coastal</option></select></Field>
      <Field label="Operator years of experience"><input type="number" min={0} value={b.operatorYears} onChange={(e) => set('operatorYears', Number(e.target.value))} /></Field>
    </div>
    <label className="px-checks"><input type="checkbox" checked={b.safetyCourse} onChange={(e) => set('safetyCourse', e.target.checked)} /> Primary operator completed an approved boating safety course</label>
    <h2 className="section-h">Coverages</h2>
    <div className="px-grid3">
      <Field label="Agreed value (hull, motor, equipment)" required><input type="number" step={500} value={b.agreedValue} onChange={(e) => set('agreedValue', Number(e.target.value))} /></Field>
      <Field label="Physical damage deductible"><select value={b.deductible} onChange={(e) => set('deductible', Number(e.target.value))}>{[250, 500, 1000, 2500].map((d) => <option key={d} value={d}>{money(d)}</option>)}</select></Field>
      <Field label="Watercraft liability"><select value={b.liability} onChange={(e) => set('liability', Number(e.target.value))}>{[300000, 500000, 1000000].map((d) => <option key={d} value={d}>{money(d)}</option>)}</select></Field>
      <Field label="Trailer value"><input type="number" step={250} value={b.trailerValue} onChange={(e) => set('trailerValue', Number(e.target.value))} /></Field>
      <Field label="Fishing equipment"><input type="number" step={250} value={b.fishingEquipment} onChange={(e) => set('fishingEquipment', Number(e.target.value))} /></Field>
    </div>
    <label className="px-checks"><input type="checkbox" checked={b.towing} onChange={(e) => set('towing', e.target.checked)} /> On-water towing &amp; assistance</label>
    <StepPremium breakdown={breakdown} label="Boat annual premium" />
  </>;
}

function LifeStep({ quote, update, breakdown }: { quote: Quote; update: (patch: Partial<Quote>) => void; breakdown: PremiumBreakdown | null }) {
  const l = quote.life;
  const set = <K extends keyof typeof l>(key: K, value: (typeof l)[K]) => update({ life: { ...l, [key]: value } });
  const age = ageFrom(quote.applicant.dob);
  const value = bmi(l.heightIn, l.weightLb);
  const rated = ratedLifeClass(l);
  return <>
    <p className="wizard-intro">ERIExpress Life is simplified-issue term life from Erie Family Life — most applicants get a decision without a medical exam. Proposed insured: <strong>{fullName(quote.applicant)}</strong>, age {age}.</p>
    <h2 className="section-h"><Heart size={15} /> Coverage</h2>
    <div className="px-grid3">
      <Field label="Face amount" required><select value={l.faceAmount} onChange={(e) => set('faceAmount', Number(e.target.value))}>{[50000, 100000, 150000, 250000, 350000, 500000].map((f) => <option key={f} value={f}>{money(f)}</option>)}</select></Field>
      <Field label="Level term period"><select value={l.term} onChange={(e) => set('term', Number(e.target.value) as typeof l.term)}>{[10, 15, 20, 30].map((t) => <option key={t} value={t}>{t} years</option>)}</select></Field>
      <Field label="Requested health class"><select value={l.healthClass} onChange={(e) => set('healthClass', e.target.value as typeof l.healthClass)}><option>Preferred Plus</option><option>Preferred</option><option>Standard Plus</option><option>Standard</option></select></Field>
    </div>
    <h2 className="section-h">Health &amp; build</h2>
    <div className="px-grid3">
      <Field label="Height (inches)" required><input type="number" value={l.heightIn} onChange={(e) => set('heightIn', Number(e.target.value))} /></Field>
      <Field label="Weight (lbs)" required><input type="number" value={l.weightLb} onChange={(e) => set('weightLb', Number(e.target.value))} /></Field>
      <Field label="Build" hint={rated !== l.healthClass ? `Rated ${rated} based on build/tobacco` : undefined}><input value={`BMI ${value}`} readOnly /></Field>
    </div>
    <label className="px-checks"><input type="checkbox" checked={l.tobacco} onChange={(e) => set('tobacco', e.target.checked)} /> Used tobacco or nicotine products in the past 12 months</label>
    <h2 className="section-h">Beneficiary &amp; riders</h2>
    <div className="px-grid3">
      <Field label="Primary beneficiary" required className="span2"><input value={l.beneficiary} onChange={(e) => set('beneficiary', e.target.value)} placeholder="Full legal name" /></Field>
      <Field label="Relationship"><select value={l.beneficiaryRelation} onChange={(e) => set('beneficiaryRelation', e.target.value)}>{['Spouse', 'Child', 'Parent', 'Sibling', 'Trust', 'Estate', 'Other'].map((r) => <option key={r}>{r}</option>)}</select></Field>
    </div>
    <div className="px-checks"><label><input type="checkbox" checked={l.acceleratedBenefit} onChange={(e) => set('acceleratedBenefit', e.target.checked)} /> Accelerated death benefit rider (no charge)</label><label><input type="checkbox" checked={l.childRider} onChange={(e) => set('childRider', e.target.checked)} /> Children’s term rider — $10,000</label><label><input type="checkbox" checked={l.waiverOfPremium} onChange={(e) => set('waiverOfPremium', e.target.checked)} /> Waiver of premium for disability</label></div>
    <StepPremium breakdown={breakdown} label="ERIExpress Life annual premium" />
  </>;
}

function BreakdownTable({ breakdown }: { breakdown: PremiumBreakdown }) {
  return <table className="px-table breakdown"><tbody>{breakdown.lines.map((line) => <tr key={line.label}><td>{line.label}</td><td className="num">{money(line.amount)}</td></tr>)}{breakdown.discounts.map((line) => <tr key={line.label} className="discount"><td>{line.label}</td><td className="num">−{money(-line.amount)}</td></tr>)}<tr className="total"><td>{breakdown.name ?? breakdown.product} annual premium</td><td className="num">{money(breakdown.total)}</td></tr></tbody></table>;
}

function SummaryStep({ quote, update, rated, existing }: { quote: Quote; update: (patch: Partial<Quote>) => void; rated: ErieQuoteResult; existing: Policy[] }) {
  const { notify } = usePortal();
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState(quote.applicant.email);
  const savings = -rated.bundleCredits.reduce((s, c) => s + c.amount, 0);
  // Proposal shows every plan re-rated (pay-in-full carries its own discount).
  const proposal = () => quoteProposalHtml(quote, rated, PAY_PLANS.map((plan) => { const t = rateQuote(quote, existing, plan).total; const sch = installmentSchedule(t, plan, quote.autoPay); return { plan: payPlanLabel[plan], count: sch.count, perPayment: sch.perPayment, total: sch.totalCost }; }));
  const lineTitle = (key: string, name: string) => (key === 'auto' ? `${name} — ${quote.vehicles.length} vehicle(s), ${quote.drivers.length} driver(s)` : key === 'home' ? `${name} — ${quote.applicant.address}` : key === 'boat' ? `${name} — ${quote.boat.year} ${quote.boat.make} ${quote.boat.model}` : key.startsWith('commercial:') ? `${name} — ${quote.commercial.business.businessName}` : name);
  return <>
    <div className="wizard-actions-row"><button type="button" className="outline-action" onClick={() => setEmailOpen(true)}><Mail size={13} /> EMAIL QUOTE</button><button type="button" className="outline-action" onClick={() => window.print()}><Printer size={13} /> PRINT</button><button type="button" className="outline-action" onClick={() => openDocument(proposal(), `proposal-${quote.id}`)}><FileText size={13} /> PROPOSAL (PDF)</button><button type="button" className="outline-action" onClick={() => downloadDocument(proposal(), `proposal-${quote.id}`)}><Download size={13} /> DOWNLOAD</button></div>
    {rated.lines.map((l) => <div key={l.key}><h2 className="section-h">{lineIcon(l.key)} {lineTitle(l.key, l.breakdown.name ?? l.breakdown.product)}</h2><BreakdownTable breakdown={l.breakdown} /></div>)}
    <h2 className="section-h">Multi-policy bundle</h2>
    {rated.bundleCredits.length === 0 ? <p className="px-muted">No bundle credits yet. Auto + Home earns 10% on auto and 15% on home; adding an Umbrella earns another 5%; adding Commercial Lines earns a further 5% across the account.</p>
      : <table className="px-table breakdown"><tbody>{rated.bundleCredits.map((c) => <tr key={c.label} className="discount"><td>{c.label}</td><td className="num">−{money(-c.amount)}</td></tr>)}<tr className="total"><td>Total multi-policy savings</td><td className="num">{money(savings)}</td></tr></tbody></table>}
    <h2 className="section-h">Account total</h2>
    <table className="px-table breakdown"><tbody><tr><td>Premium (all lines, after discounts)</td><td className="num">{money(rated.premium)}</td></tr>{rated.taxes.map((t) => <tr key={t.label}><td>{t.label}</td><td className="num">{money(t.amount)}</td></tr>)}<tr className="total"><td>Total annual cost</td><td className="num">{money(rated.total)}</td></tr></tbody></table>
    <h2 className="section-h">Payment plan</h2>
    <div className="plan-grid five">{PAY_PLANS.map((plan) => { const planTotal = rateQuote(quote, existing, plan).total; const s = installmentSchedule(planTotal, plan, quote.autoPay); return <label key={plan} className={`plan ${quote.payPlan === plan ? 'on' : ''}`}><input type="radio" name="plan" checked={quote.payPlan === plan} onChange={() => update({ payPlan: plan })} /><strong>{payPlanLabel[plan]}</strong><span>{s.count} × {money(s.perPayment, true)}</span><span className="plan-total">{money(s.totalCost)} total</span>{s.fee > 0 && <small>includes ${s.fee} installment fee</small>}{plan === 'Annual' && <small>Pay-in-full discount</small>}</label>; })}</div>
    <label className="px-checks autopay"><input type="checkbox" checked={quote.autoPay} onChange={(e) => update({ autoPay: e.target.checked })} /> Enroll in AutoPay (EFT) — waives all installment fees</label>
    <div className="grand-total"><span>Total estimated annual cost</span><strong>{money(rated.total)}</strong></div>
    {emailOpen && <Modal title="Email quote proposal" onClose={() => setEmailOpen(false)} footer={<button type="button" className="px-btn" onClick={() => { if (!/^\S+@\S+\.\S+$/.test(email)) return; update({ applicant: { ...quote.applicant, email } }); setEmailOpen(false); notify(`Quote proposal emailed to ${email}.`); }}>Send</button>}><Field label="Customer email" required><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field><p className="px-muted">The proposal includes coverages, premium by product and payment plan options. Quotes are valid for 30 days.</p></Modal>}
  </>;
}

function ApplicationStep({ quote, update, total }: { quote: Quote; update: (patch: Partial<Quote>) => void; total: number }) {
  const [payType, setPayType] = useState<'eft' | 'card'>('eft');
  const [pay, setPay] = useState({ routing: '', account: '', card: '', exp: '' });
  const s = installmentSchedule(total, quote.payPlan, quote.autoPay);
  const setApplicant = (key: keyof Quote['applicant'], value: string) => update({ applicant: { ...quote.applicant, [key]: value } });
  const verifyPayment = () => {
    const ok = payType === 'eft' ? /^\d{9}$/.test(pay.routing) && pay.account.length >= 4 : /^\d{15,16}$/.test(pay.card.replace(/\s/g, '')) && validCardExpiry(pay.exp);
    update({ underwriting: { ...quote.underwriting, _payment: ok ? 'yes' : '' , _paymethod: ok ? (payType === 'eft' ? `Checking ••${pay.account.slice(-4)}` : `Card ••${pay.card.slice(-4)}`) : '' } });
  };
  return <>
    <h2 className="section-h">Applicant contact</h2>
    <div className="px-grid3">
      <Field label="Phone" required><input value={quote.applicant.phone} onChange={(e) => setApplicant('phone', e.target.value)} placeholder="(608) 555-0100" /></Field>
      <Field label="Email" required><input type="email" value={quote.applicant.email} onChange={(e) => setApplicant('email', e.target.value)} /></Field>
      <Field label="Policy effective date" required><input type="date" value={quote.effectiveDate} min={today()} onChange={(e) => update({ effectiveDate: e.target.value })} /></Field>
    </div>
    <h2 className="section-h">Prior insurance</h2>
    <div className="px-grid3">
      <Field label="Prior carrier" required><select value={quote.priorCarrier} onChange={(e) => update({ priorCarrier: e.target.value })}><option value="">-- Select --</option>{['American Family', 'Allstate', 'GEICO', 'Progressive', 'State Farm', 'Nationwide', 'Travelers', 'Other', 'No prior insurance'].map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Years with prior carrier"><input type="number" min={0} value={quote.priorYears} onChange={(e) => update({ priorYears: Number(e.target.value) })} /></Field>
    </div>
    <h2 className="section-h">Signatures</h2>
    <div className="plan-grid two">{(['eSignature', 'Wet Signature'] as const).map((m) => <label key={m} className={`plan ${quote.signatureMethod === m ? 'on' : ''}`}><input type="radio" name="sig" checked={quote.signatureMethod === m} onChange={() => update({ signatureMethod: m })} /><strong>{m}</strong><span>{m === 'eSignature' ? `Send to ${quote.applicant.email || 'customer email'} — tracked on the eSignature Dashboard` : 'Print application; upload signed copy within 10 days'}</span></label>)}</div>
    <h2 className="section-h">Initial payment — {money(s.perPayment, true)} due at bind</h2>
    <div className="pay-tabs"><button type="button" className={payType === 'eft' ? 'on' : ''} onClick={() => setPayType('eft')}>Bank account (EFT)</button><button type="button" className={payType === 'card' ? 'on' : ''} onClick={() => setPayType('card')}>Debit / credit card</button></div>
    {payType === 'eft' ? <div className="px-grid3"><Field label="Routing number"><input value={pay.routing} inputMode="numeric" onChange={(e) => setPay({ ...pay, routing: e.target.value.replace(/\D/g, '').slice(0, 9) })} placeholder="9 digits" /></Field><Field label="Account number"><input value={pay.account} inputMode="numeric" onChange={(e) => setPay({ ...pay, account: e.target.value.replace(/\D/g, '').slice(0, 17) })} /></Field><button type="button" className="px-btn ghost align-end" onClick={verifyPayment}>Verify payment method</button></div>
      : <div className="px-grid3"><Field label="Card number"><input value={pay.card} inputMode="numeric" onChange={(e) => setPay({ ...pay, card: e.target.value.replace(/[^\d ]/g, '').slice(0, 19) })} placeholder="Visa, Mastercard, Discover, Amex" /></Field><Field label="Expiration (MM/YY)"><input value={pay.exp} onChange={(e) => setPay({ ...pay, exp: e.target.value.slice(0, 5) })} placeholder="MM/YY" /></Field><button type="button" className="px-btn ghost align-end" onClick={verifyPayment}>Verify payment method</button></div>}
    {quote.underwriting._payment === 'yes' ? <div className="px-note good"><CheckCircle2 size={14} /> Payment method verified: {quote.underwriting._paymethod}</div> : <div className="px-muted">Test values: routing 075000022, any account number.</div>}
    <h2 className="section-h">Disclosures</h2>
    <label className="px-checks"><input type="checkbox" checked={quote.underwriting._disclosures === 'yes'} onChange={(e) => update({ underwriting: { ...quote.underwriting, _disclosures: e.target.checked ? 'yes' : '' } })} /> I reviewed the consumer report notice, UM/UIM selection, and privacy notice with the applicant, and all answers are accurate to the best of the applicant’s knowledge.</label>
  </>;
}

function IssuedStep({ quote }: { quote: Quote }) {
  const { policies } = usePortal();
  const issued = policies.filter((p) => quote.issuedPolicies.includes(p.number));
  return <div className="issued">
    <div className="issued-hero"><CheckCircle2 size={40} /><div><h2>Congratulations — coverage is bound</h2><p>{fullName(quote.applicant)} is now an ERIE customer. Documents are available on each policy and were sent {quote.signatureMethod === 'eSignature' ? 'for eSignature' : 'for printing'}.</p></div></div>
    <table className="px-table"><thead><tr><th>Policy</th><th>Type</th><th>Effective</th><th>Annual premium</th><th>Status</th><th /></tr></thead><tbody>{issued.map((p) => <tr key={p.number}><td><Link to={`/policies/${p.number}`} className="mono">{p.number}</Link></td><td>{p.type}</td><td>{p.effective}</td><td>{money(p.premium)}</td><td><StatusBadge status={p.status} /></td><td><Link to={`/policies/${p.number}`}>Open policy →</Link></td></tr>)}</tbody></table>
    <div className="issued-actions">{issued.find((p) => p.type === 'Auto') && <Link className="outline-action" to={`/policies/${issued.find((p) => p.type === 'Auto')!.number}?doc=id`}><FileText size={13} /> PRINT ID CARDS</Link>}{quote.customerId && <Link className="outline-action" to={`/customers/${quote.customerId}`}>VIEW CUSTOMER ACCOUNT</Link>}<Link className="outline-action" to="/billing">PAYMENT CENTER</Link><Link className="continue-action" to="/quotes/search-results">START ANOTHER QUOTE</Link></div>
    <p className="px-muted">Producer: {AGENT.name} · {Object.values(quote.agentNumbers).join(', ')}</p>
  </div>;
}
