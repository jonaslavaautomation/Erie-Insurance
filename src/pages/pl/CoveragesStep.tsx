import { ReactNode, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, MinusSquare, PlusSquare, Printer, XCircle } from 'lucide-react';
import { lineOf, rateQuote, usePortal } from '@/data/store';
import { AGENT, defaultLife } from '@/data/seed';
import { openDocument, quoteProposalHtml } from '@/lib/documents';
import { AUTO_SECURITY_OPTIONS, ageFrom, BI_OPTIONS, installmentSchedule, money, PAY_PLANS, payPlanLabel, PD_OPTIONS, rateLife, ROADSIDE_OPTIONS, UM_OPTIONS } from '@/lib/rating';
import { defaultVehicleCoverage, personName, underwritingScores, usDate } from '@/lib/personalLines';
import { umbrellaUnderlying } from '@/pages/QuoteSteps';
import type { AutoCoverages, HomeCoverages, PayPlan, PremiumBreakdown, ProductKey, RatingPlan, Vehicle, VehicleCoverage } from '@/data/types';
import { usePl } from '@/pages/pl/PersonalQuote';
import { PlModal, Tip } from '@/pages/pl/PlUi';

type Tab = 'auto' | 'home' | 'umbrella';
const tabLabel: Record<Tab, string> = { auto: 'AUTO', home: 'HOME', umbrella: 'UMBRELLA' };
const productName: Partial<Record<ProductKey, string>> = { auto: 'Auto', home: 'Home', umbrella: 'Umbrella', boat: 'Boat', life: 'ERIExpress Life' };
const limitLabel = (v: string) => (v.includes('CSL') ? `${Number(v.replace(' CSL', '')) * 1000 > 0 ? (Number(v.replace(' CSL', '')) * 1000).toLocaleString() : v} CSL` : v.split('/').map((x) => (Number(x) * 1000).toLocaleString()).join(' / '));
const dollars = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CoveragesStep() {
  const { quote, pl, update, setPl, go, busy, saveExit } = usePl();
  const { policies, notify } = usePortal();
  const tabs = (['auto', 'home', 'umbrella'] as Tab[]).filter((t) => quote.products.includes(t));
  const [tab, setTab] = useState<Tab>(tabs[0] ?? 'auto');
  const [payOpen, setPayOpen] = useState(false);
  const [planPending, setPlanPending] = useState<RatingPlan | ''>('');
  const [convertError, setConvertError] = useState('');
  const existing = useMemo(() => (quote.customerId ? policies.filter((p) => p.customerId === quote.customerId) : []), [policies, quote.customerId]);
  const rated = useMemo(() => rateQuote(quote, existing), [quote, existing]);
  const premiumOf = (p: ProductKey) => lineOf(rated, p as never)?.total ?? 0;
  const scores = underwritingScores(quote);
  const change = (apply: () => void) => busy('One Moment Please...', apply, 650);

  const convertable = (['auto', 'home', 'umbrella'] as ProductKey[]).filter((p) => quote.products.includes(p));
  const convert = pl.convert.length ? pl.convert : convertable;
  const total = convertable.filter((p) => convert.includes(p)).reduce((s, p) => s + premiumOf(p), 0);

  const lifeRows = [quote.drivers[0], quote.drivers.find((d) => d.id === pl.secondNamedInsuredId)].filter(Boolean).map((d) => ({ name: personName(d!), monthly: Math.round((rateLife(ageFrom(d!.dob), { ...defaultLife, faceAmount: 250000, term: 20, healthClass: 'Preferred', tobacco: false }).total / 12) * 100) / 100 }));
  const lifeTotal = lifeRows.reduce((s, r) => s + r.monthly, 0);
  const validUntil = new Date(new Date(pl.ratedAt || Date.now()).getTime() + 60 * 86400000);

  const printQuote = () => openDocument(quoteProposalHtml(quote, rated, PAY_PLANS.map((plan) => { const t = rateQuote(quote, existing, plan).total; const s = installmentSchedule(t, plan, quote.autoPay); return { plan: payPlanLabel[plan], count: s.count, perPayment: s.perPayment, total: s.totalCost }; })), `quote-${quote.id}`);

  const toApplication = () => {
    const chosen = convertable.filter((p) => convert.includes(p));
    if (!chosen.length) { setConvertError('Select at least one product to convert.'); return; }
    if (chosen.includes('umbrella')) {
      const u = umbrellaUnderlying({ ...quote, products: quote.products.filter((p) => p !== 'auto' && p !== 'home' ? true : chosen.includes(p)) }, existing);
      if (!u.autoOk || !u.homeOk) { setConvertError(`Umbrella underlying limits not met — ${!u.autoOk ? 'auto requires 250/500 BI and 100,000 PD' : 'home requires $300,000 personal liability'}. Raise the limits or uncheck Umbrella.`); setTab('umbrella'); return; }
    }
    busy('One Moment Please...', () => {
      update((q) => ({ products: q.products.filter((p) => !(['auto', 'home', 'umbrella'] as ProductKey[]).includes(p) || chosen.includes(p)), status: 'Quote' }));
      notify(`Converting ${chosen.map((p) => productName[p]).join(', ')} to application.`);
      go('underwriting', true);
    }, 900);
  };

  return <>
    <h1 className="pl-title">Product Coverages</h1>
    <div className="pl-cov-tabs"><nav>{tabs.map((t) => <button type="button" key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{tabLabel[t]}</button>)}</nav></div>
    <div className="pl-cov-layout">
      <div className="pl-cov-main">
        <div className="pl-print"><button type="button" className="pl-link" onClick={printQuote}><Printer size={14} /> Print</button></div>
        <section className="pl-card pl-cov-card">
          <div className="pl-cov-head">
            <label><span><span className="pl-req">*</span> Agent</span><select aria-label="Agent" value={quote.agentNumbers[tab] ?? ''} onChange={(e) => update((q) => ({ agentNumbers: { ...q.agentNumbers, [tab]: e.target.value } }))}>{AGENT.agentNumbers.map((a) => <option key={a}>{a}</option>)}</select></label>
            <label><span><span className="pl-req">*</span> Effective</span><span className="pl-inline"><input aria-label="Effective date" type="date" value={quote.effectiveDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => e.target.value && change(() => update({ effectiveDate: e.target.value }))} /></span></label>
            {tab === 'auto' ? <label><span><span className="pl-req">*</span> Rating Plan</span><select aria-label="Rating Plan" value={pl.ratingPlan} onChange={(e) => { const v = e.target.value as RatingPlan; if (v === 'ErieSecure Auto') setPlanPending(v); else change(() => setPl({ ratingPlan: v })); }}><option>Exchange</option><option>Company</option><option>ErieSecure Auto</option></select></label>
              : <label><span>Policy Type</span><strong className="pl-cov-static">{tab === 'home' ? quote.homePolicyType ?? 'Home - Primary Residence' : 'Personal Catastrophe Liability'}</strong></label>}
            <div className="pl-pay"><span>Pay Plan</span><button type="button" className="pl-link" onClick={() => setPayOpen(true)}>{quote.payPlan} <ExternalLink size={12} /></button><small>{quote.autoPay ? 'AutoPay (EFT)' : 'Cash/Check/Card'}</small></div>
          </div>
          {tab === 'auto' && <AutoTab breakdown={lineOf(rated, 'auto')} change={change} />}
          {tab === 'home' && <HomeTab breakdown={lineOf(rated, 'home')} change={change} />}
          {tab === 'umbrella' && <UmbrellaTab breakdown={lineOf(rated, 'umbrella')} change={change} />}
        </section>
        <div className="pl-footer"><button type="button" className="pl-btn outline" onClick={saveExit}>SAVE &amp; EXIT</button><div><button type="button" className="pl-btn outline" onClick={() => go('reports')}>PREVIOUS</button><button type="button" className="pl-btn" onClick={() => busy('One Moment Please...', saveExit, 900)}>CONTINUE</button></div></div>
      </div>

      <aside className="pl-cov-side">
        <div className="pl-side-card">
          <h3 className="blue">Products to Convert</h3>
          {convertable.map((p) => <label key={p} className="pl-convert-row"><input type="checkbox" checked={convert.includes(p)} onChange={(e) => { setConvertError(''); setPl({ convert: e.target.checked ? [...convert, p] : convert.filter((x) => x !== p) }); }} /><span><strong>{productName[p]}</strong><small>Eff. {usDate(quote.effectiveDate)}</small></span><em>{dollars(premiumOf(p))}</em></label>)}
          <div className="pl-convert-total"><strong>Total</strong><strong>{dollars(total)}</strong></div>
          <button type="button" className="pl-btn block" onClick={toApplication}>CONVERT TO APPLICATION</button>
          {convertError && <div className="pl-err-text">{convertError}</div>}
        </div>
        {lifeRows.length > 0 && <div className="pl-side-card gray">
          <h3><span>Life</span><span className="pl-life-price"><em>Only</em> <strong>{dollars(lifeTotal)}</strong>/mo <Tip text="ERIExpress Life — $250,000, 20-year level term, Preferred non-tobacco. Estimated monthly premium per named insured." /></span></h3>
          {lifeRows.map((r) => <details key={r.name} className="pl-life-row"><summary><span>{r.name}</span><small>{dollars(r.monthly)}</small></summary><p>$250,000 · 20-year term · Preferred non-tobacco. Add ERIExpress Life on the Product page.</p></details>)}
          <p className="pl-life-pitch">“For as low as {dollars(lifeTotal)} a month you can start protecting your family’s future today.”</p>
        </div>}
        <div className="pl-side-card gray">
          <h3>Underwriting Score</h3>
          {quote.products.includes('auto') && <div className="pl-score"><span>Auto</span><span>{scores.auto}</span></div>}
          {quote.products.includes('home') && <div className="pl-score"><span>Home</span><span>{scores.home}</span></div>}
          <div className="pl-score total"><span>Account Score</span><span>{scores.account}</span></div>
        </div>
        <p className="pl-valid">Reports valid until {validUntil.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</p>
      </aside>
    </div>

    {payOpen && <PayPlanModal onClose={() => setPayOpen(false)} />}
    {planPending && <PlModal title="Change rating plan" warn onCancel={() => setPlanPending('')} onContinue={() => { const v = planPending; setPlanPending(''); change(() => setPl({ ratingPlan: v })); }}>Please note that changing to the ErieSecure Auto rating plan may require additional data entry or validations of previously entered information. If an Account Billing payment type is selected, this will be updated to Single Bill.</PlModal>}
  </>;
}

function PolicyBar({ title, right }: { title: string; right?: ReactNode }) {
  return <div className="pl-blue-bar"><span>{title}</span>{right && <span className="pl-bar-right">{right}</span>}</div>;
}

function CovRow({ label, children, price, note }: { label: ReactNode; children: ReactNode; price?: string; note?: ReactNode }) {
  return <div className="pl-cov-row"><div className="pl-cov-label">{label}{note}</div><div className="pl-cov-control">{children}</div><div className="pl-cov-price">{price ?? '--'}</div></div>;
}

function AutoTab({ breakdown, change }: { breakdown: PremiumBreakdown | null | undefined; change: (fn: () => void) => void }) {
  const { quote, pl, update } = usePl();
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [discOpen, setDiscOpen] = useState<Record<string, boolean>>({});
  const a = quote.autoCoverages;
  const setA = (patch: Partial<AutoCoverages>) => change(() => update((q) => ({ autoCoverages: { ...q.autoCoverages, ...patch } })));
  const setV = (id: string, patch: Partial<VehicleCoverage>) => change(() => update((q) => ({ vehicles: q.vehicles.map((v) => (v.id === id ? { ...v, coverage: { ...(v.coverage ?? defaultVehicleCoverage()), ...patch } } : v)) })));
  if (!breakdown) return null;

  // Discounts and bundle credits are allocated to each vehicle so vehicle premiums add up to the policy total.
  const gross = breakdown.lines.reduce((s, l) => s + l.amount, 0) || 1;
  const factor = breakdown.total / gross;
  const lineFor = (v: Vehicle, re: RegExp) => breakdown.lines.find((l) => l.ref === v.id && re.test(l.label));
  const net = (n?: number) => (n === undefined ? undefined : Math.round(n * factor));
  const policyLines = breakdown.lines.filter((l) => !l.ref);
  const vehicleTotals = quote.vehicles.map((v) => Math.round(breakdown.lines.filter((l) => l.ref === v.id).reduce((s, l) => s + l.amount, 0) * factor));
  const policyNet = policyLines.map((l) => Math.round(l.amount * factor));
  const drift = breakdown.total - vehicleTotals.reduce((s, x) => s + x, 0) - policyNet.reduce((s, x) => s + x, 0);
  if (vehicleTotals.length) vehicleTotals[vehicleTotals.length - 1] += drift;

  return <>
    <PolicyBar title="Policy Level Coverages" />
    <div className="pl-policy-cards">
      <div className="pl-mini-card"><h4>Liability</h4>
        <div className="pl-kv"><label htmlFor="bi">Bodily Injury</label><select id="bi" value={a.bodilyInjury} onChange={(e) => setA({ bodilyInjury: e.target.value })}>{BI_OPTIONS.map((o) => <option key={o} value={o}>{limitLabel(o)}</option>)}</select></div>
        <div className="pl-kv"><label htmlFor="pd">Property Damage</label><select id="pd" value={a.propertyDamage} onChange={(e) => setA({ propertyDamage: e.target.value })}>{PD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
      </div>
      <div className="pl-mini-card"><h4>Uninsured Motorists</h4>
        <div className="pl-kv"><label htmlFor="um">Bodily Injury</label><select id="um" value={a.uninsuredMotorist} onChange={(e) => setA({ uninsuredMotorist: e.target.value })}>{UM_OPTIONS.map((o) => <option key={o} value={o}>{limitLabel(o)}</option>)}</select></div>
        <h4>Underinsured Motorists</h4>
        <div className="pl-kv"><label htmlFor="uim">Bodily Injury</label><select id="uim" value={a.underinsuredMotorist ?? a.uninsuredMotorist} onChange={(e) => setA({ underinsuredMotorist: e.target.value })}>{UM_OPTIONS.map((o) => <option key={o} value={o}>{limitLabel(o)}</option>)}</select></div>
        <h4>Other</h4>
        <div className="pl-kv"><label htmlFor="ap">ERIE Auto Plus</label><select id="ap" value={a.autoPlus ? 'Yes' : 'No'} onChange={(e) => setA({ autoPlus: e.target.value === 'Yes' })}><option>Yes</option><option>No</option></select></div>
      </div>
    </div>
    <PolicyBar title="Vehicle Level Coverages" right={<><strong>{pl.ratingPlan === 'ErieSecure Auto' ? 'ErieSecure Auto' : `${pl.ratingPlan} Auto`}</strong><span>{dollars(breakdown.total)}</span></>} />
    {quote.vehicles.map((v, i) => {
      const cov = v.coverage ?? defaultVehicleCoverage();
      const op = quote.drivers.find((d) => d.id === v.primaryOperatorId);
      const vGross = breakdown.lines.filter((l) => l.ref === v.id).reduce((s, l) => s + l.amount, 0);
      const newEnough = new Date().getFullYear() - v.year <= 2;
      return <div className="pl-vehicle" key={v.id}>
        <div className="pl-vehicle-head"><strong>{v.year} {v.make} {v.model}</strong>{op && <span> ({personName(op)})</span>}<em>{dollars(vehicleTotals[i])}</em></div>
        <div className="pl-collapse-row"><button type="button" className="pl-link" onClick={() => setClosed({ ...closed, [v.id]: !closed[v.id] })}>{closed[v.id] ? <PlusSquare size={12} /> : <MinusSquare size={12} />} Policy Coverages</button><span className="pl-yesno"><label><input type="radio" name={`inc-${v.id}`} checked={cov.include} onChange={() => setV(v.id, { include: true })} /> Include</label><label><input type="radio" name={`inc-${v.id}`} checked={!cov.include} onChange={() => setV(v.id, { include: false })} /> Exclude</label></span></div>
        {!closed[v.id] && <div className="pl-cov-rows">
          <CovRow label="Medical Payments" price={dollars(net(lineFor(v, /Medical/)?.amount) ?? 0)}>{i === 0 ? <select aria-label="Medical Payments" value={cov.medPay} onChange={(e) => change(() => update((q) => ({ vehicles: q.vehicles.map((x) => ({ ...x, coverage: { ...(x.coverage ?? defaultVehicleCoverage()), medPay: e.target.value } })) })))}>{['None', '1,000', '5,000', '10,000'].map((o) => <option key={o}>{o}</option>)}</select> : <span>{cov.medPay}</span>}</CovRow>
          {cov.include ? <>
            <CovRow label="Comprehensive" price={dollars(net(lineFor(v, /Comprehensive/)?.amount) ?? 0)}><select aria-label={`Comprehensive ${v.make}`} value={cov.comp} onChange={(e) => setV(v.id, { comp: Number(e.target.value) })}>{[100, 250, 500, 1000].map((d) => <option key={d} value={d}>{d} Deductible</option>)}</select></CovRow>
            <CovRow label="Collision" price={dollars(net(lineFor(v, /Collision/)?.amount) ?? 0)}><select aria-label={`Collision ${v.make}`} value={cov.coll} onChange={(e) => setV(v.id, { coll: Number(e.target.value) })}>{[250, 500, 1000].map((d) => <option key={d} value={d}>{d} Deductible</option>)}</select></CovRow>
            <CovRow label={<>Roadside and/or Rental <Tip text="Rental reimbursement and roadside service by vehicle class." /></>} note={cov.roadside.startsWith('Class 1') ? <small className="pl-blue-note">Class 1 - Compact Sedan included at no cost for Comprehensive (Transportation Expenses)</small> : undefined} price={dollars(net(lineFor(v, /Roadside/)?.amount) ?? 0)}>
              <select aria-label={`Roadside ${v.make}`} value={cov.roadside} onChange={(e) => setV(v.id, { roadside: e.target.value })}>{Object.keys(ROADSIDE_OPTIONS).map((o) => <option key={o}>{o}</option>)}</select>
              {cov.roadside !== 'None' && <ul className="pl-checks-list"><li><CheckCircle2 size={13} /> Comprehensive (Rental)</li><li><CheckCircle2 size={13} /> Collision (Rental)</li><li><CheckCircle2 size={13} /> Roadside Service</li></ul>}
            </CovRow>
            <CovRow label="Auto Security" price={cov.autoSecurity === '- None -' ? '--' : dollars(net(lineFor(v, /New Auto Security/)?.amount) ?? 0)}><select aria-label={`Auto Security ${v.make}`} value={cov.autoSecurity} onChange={(e) => setV(v.id, { autoSecurity: e.target.value })}>{Object.keys(AUTO_SECURITY_OPTIONS).filter((o) => o === '- None -' || newEnough).map((o) => <option key={o}>{o}</option>)}</select></CovRow>
          </> : <p className="pl-muted small">Physical damage, roadside and auto security excluded for this vehicle — liability and medical payments remain.</p>}
        </div>}
        <div className="pl-collapse-row"><button type="button" className="pl-link" onClick={() => setDiscOpen({ ...discOpen, [v.id]: !discOpen[v.id] })}>{discOpen[v.id] ? <MinusSquare size={12} /> : <PlusSquare size={12} />} Discounts &amp; Surcharges</button></div>
        {discOpen[v.id] && <div className="pl-disc">{breakdown.discounts.map((d) => <div key={d.label}><span>{d.label}</span><span className="good">−{dollars(Math.abs(Math.round((d.amount * vGross) / gross)))}</span></div>)}{quote.drivers.filter((d) => d.accidents || d.violations).map((d) => <div key={d.id}><span>Surcharge — {personName(d)}: {d.accidents ? `${d.accidents} at-fault accident(s)` : ''}{d.violations ? ` ${d.violations} violation(s)` : ''}</span><span className="bad">Included</span></div>)}{!breakdown.discounts.length && <div><span>No discounts applied</span></div>}</div>}
      </div>;
    })}
    {policyLines.map((l, i) => <div className="pl-vehicle-head policy" key={l.label}><strong>{/Auto Plus/.test(l.label) ? 'ERIE Auto Plus' : l.label}</strong>{/Auto Plus/.test(l.label) && <span> - Deductible diminished up to $0</span>}<em>{dollars(policyNet[i])}</em></div>)}
  </>;
}

function HomeTab({ breakdown, change }: { breakdown: PremiumBreakdown | null | undefined; change: (fn: () => void) => void }) {
  const { quote, update } = usePl();
  const h = quote.homeCoverages;
  const setH = (patch: Partial<HomeCoverages>) => change(() => update((q) => ({ homeCoverages: { ...q.homeCoverages, ...patch } })));
  if (!breakdown) return null;
  const gross = breakdown.lines.reduce((s, l) => s + l.amount, 0) || 1;
  const factor = breakdown.total / gross;
  const price = (re: RegExp) => { const l = breakdown.lines.find((x) => re.test(x.label)); return l ? dollars(Math.round(l.amount * factor)) : '--'; };
  const amt = (pct: number) => Math.round((h.dwelling * pct) / 100);
  return <>
    <PolicyBar title="Property Coverages" right={<><strong>{breakdown.name}</strong><span>{dollars(breakdown.total)}</span></>} />
    <div className="pl-cov-rows">
      <CovRow label="Dwelling (Coverage A)" price={price(/Coverage A/)}><span className="pl-inline"><span className="pl-dollar">$</span><input aria-label="Coverage A" className="amount" value={h.dwelling.toLocaleString()} onChange={(e) => update((q) => ({ homeCoverages: { ...q.homeCoverages, dwelling: Number(e.target.value.replace(/\D/g, '')) } }))} onBlur={() => change(() => undefined)} /></span></CovRow>
      <CovRow label="Other Structures (Coverage B)" price={price(/Coverage B/)}><select aria-label="Coverage B" value={Math.round(h.otherStructuresPct)} onChange={(e) => setH({ otherStructuresPct: Number(e.target.value) })}>{[...new Set([10, 15, 20, 25, Math.round(h.otherStructuresPct)])].sort((x, y) => x - y).map((p) => <option key={p} value={p}>{p}% — ${amt(p).toLocaleString()}</option>)}</select></CovRow>
      <CovRow label="Personal Property (Coverage C)" price={price(/Coverage C/)}><select aria-label="Coverage C" value={Math.round(h.personalPropertyPct)} onChange={(e) => setH({ personalPropertyPct: Number(e.target.value) })}>{[...new Set([50, 60, 70, 75, Math.round(h.personalPropertyPct)])].sort((x, y) => x - y).map((p) => <option key={p} value={p}>{p}% — ${amt(p).toLocaleString()}</option>)}</select></CovRow>
      <CovRow label="Loss of Use (Coverage D)" price={price(/Coverage D/)}><select aria-label="Coverage D" value={h.lossOfUsePct} onChange={(e) => setH({ lossOfUsePct: Number(e.target.value) })}>{[20, 30].map((p) => <option key={p} value={p}>{p}% — ${amt(p).toLocaleString()}</option>)}</select></CovRow>
      <CovRow label="Personal Liability" price={price(/Coverage E/)}><select aria-label="Personal Liability" value={h.personalLiability} onChange={(e) => setH({ personalLiability: Number(e.target.value) })}>{[100000, 300000, 500000, 1000000].map((o) => <option key={o} value={o}>{o.toLocaleString()}</option>)}</select></CovRow>
      <CovRow label="Medical Payments to Others" price={price(/Coverage F/)}><select aria-label="Medical Payments to Others" value={h.medicalPayments} onChange={(e) => setH({ medicalPayments: Number(e.target.value) })}>{[1000, 2000, 5000].map((o) => <option key={o} value={o}>{o.toLocaleString()}</option>)}</select></CovRow>
      <CovRow label="All-Peril Deductible"><select aria-label="All-Peril Deductible" value={h.deductible} onChange={(e) => setH({ deductible: Number(e.target.value) })}>{[500, 1000, 2500, 5000].map((o) => <option key={o} value={o}>{o.toLocaleString()} Deductible</option>)}</select></CovRow>
      <CovRow label="Wind/Hail Deductible" price={h.windHailDeductible && h.windHailDeductible !== 'Same as All-Peril' ? price(/Wind\/hail/) : '--'}><select aria-label="Wind/Hail Deductible" value={h.windHailDeductible ?? 'Same as All-Peril'} onChange={(e) => setH({ windHailDeductible: e.target.value })}>{['Same as All-Peril', '1% of Dwelling', '2% of Dwelling'].map((o) => <option key={o}>{o}</option>)}</select></CovRow>
    </div>
    <PolicyBar title="Optional Endorsements" />
    <div className="pl-cov-rows">
      {([['waterBackup', 'Water Backup and Sump Discharge', /Water backup/], ['equipmentBreakdown', 'Equipment Breakdown', /Equipment breakdown/], ['identityRecovery', 'Identity Recovery', /Identity recovery/], ['serviceLine', 'Service Line', /Service line/]] as const).map(([key, label, re]) => <CovRow key={key} label={label} price={h[key] ? price(re) : '--'}><span className="pl-yesno"><label><input type="radio" name={key} checked={h[key]} onChange={() => setH({ [key]: true })} /> Include</label><label><input type="radio" name={key} checked={!h[key]} onChange={() => setH({ [key]: false })} /> Exclude</label></span></CovRow>)}
    </div>
  </>;
}

function UmbrellaTab({ breakdown, change }: { breakdown: PremiumBreakdown | null | undefined; change: (fn: () => void) => void }) {
  const { quote, update } = usePl();
  const { policies } = usePortal();
  const u = quote.umbrella;
  if (!breakdown) return null;
  const check = umbrellaUnderlying(quote, policies.filter((p) => p.customerId === quote.customerId));
  const Status = ({ ok }: { ok: boolean }) => (ok ? <CheckCircle2 size={14} className="pl-ok" /> : <XCircle size={14} className="pl-bad" />);
  return <>
    <PolicyBar title="Personal Catastrophe Liability" right={<><strong>Umbrella</strong><span>{dollars(breakdown.total)}</span></>} />
    <div className="pl-cov-rows">
      <CovRow label="Limit" price={dollars(breakdown.lines[0]?.amount ?? 0)}><select aria-label="Umbrella Limit" value={u.limit} onChange={(e) => change(() => update((q) => ({ umbrella: { ...q.umbrella, limit: Number(e.target.value) } })))}>{[1, 2, 3, 4, 5].map((m) => <option key={m} value={m * 1000000}>{(m * 1000000).toLocaleString()}</option>)}</select></CovRow>
      {breakdown.lines.slice(1).map((l) => <CovRow key={l.label} label={l.label} price={dollars(l.amount)}><span>Included</span></CovRow>)}
    </div>
    <PolicyBar title="Underlying Policies" />
    <div className="pl-cov-rows">
      <CovRow label={<span className="pl-inline"><Status ok={check.autoOk} /> Auto — 250/500 BI, 100,000 PD required</span>}><span className="pl-stack"><span>{check.autoText}</span>{!check.autoOk && check.autoSource === 'quote' && <button type="button" className="pl-btn outline small" onClick={() => change(() => update((q) => ({ autoCoverages: { ...q.autoCoverages, bodilyInjury: '250/500', propertyDamage: '100,000' } })))}>RAISE TO 250/500/100</button>}</span></CovRow>
      <CovRow label={<span className="pl-inline"><Status ok={check.homeOk} /> Home — $300,000 personal liability required</span>}><span className="pl-stack"><span>{check.homeText}</span>{!check.homeOk && check.homeSource === 'quote' && <button type="button" className="pl-btn outline small" onClick={() => change(() => update((q) => ({ homeCoverages: { ...q.homeCoverages, personalLiability: 300000 } })))}>RAISE TO $300,000</button>}</span></CovRow>
      <CovRow label="Exposures"><span>{u.autoExposures} auto · {u.residences} residence · {u.youthfulOperators} operator(s) under 25</span></CovRow>
    </div>
  </>;
}

function PayPlanModal({ onClose }: { onClose: () => void }) {
  const { quote, update, busy } = usePl();
  const { policies } = usePortal();
  const [plan, setPlan] = useState<PayPlan>(quote.payPlan);
  const [autoPay, setAutoPay] = useState(quote.autoPay);
  const existing = policies.filter((p) => p.customerId === quote.customerId);
  return <PlModal title="Pay Plan" onCancel={onClose} onContinue={() => { onClose(); busy('One Moment Please...', () => update({ payPlan: plan, autoPay }), 600); }}>
    <table className="pl-table compact"><thead><tr><th /><th>Plan</th><th>Payments</th><th className="num">Total</th></tr></thead><tbody>{PAY_PLANS.map((p) => { const s = installmentSchedule(rateQuote({ ...quote, payPlan: p }, existing, p).total, p, autoPay); return <tr key={p}><td><input type="radio" name="payplan" aria-label={p} checked={plan === p} onChange={() => setPlan(p)} /></td><td>{p}</td><td>{s.count} × {money(s.perPayment, true)}</td><td className="num">{money(s.totalCost, true)}</td></tr>; })}</tbody></table>
    <label className="pl-inline-check"><input type="checkbox" checked={autoPay} onChange={(e) => setAutoPay(e.target.checked)} /> AutoPay (EFT) — waives installment fees</label>
  </PlModal>;
}
