import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Building2, CheckCircle2, HardHat, Plus, Trash2, Truck, Umbrella, XCircle } from 'lucide-react';
import { Field } from '@/components/ui';
import { basisLabel, BOP_LIMITS, businessClasses, CDL_GVW, coinsuranceShortfall, commercialLineLabels, commercialRules, CONSTRUCTION_CLASSES, contractorTrades, sizeClass, suggestedBuildingLimit, UMBRELLA_NAME, UMBRELLA_UNDERLYING, WC_EXPENSE_CONSTANT, WC_RATES_EFFECTIVE, wcClasses } from '@/data/commercial';
import { STATES } from '@/data/content';
import { ageFrom, ErieQuoteResult, meetsUmbrellaAutoMinimum, money, UMBRELLA_HOME_MINIMUM } from '@/lib/rating';
import type { BusinessDetails, CommercialAutoDetails, CommercialDetails, CommercialLine, ContractorsDetails, Policy, Quote, UmbrellaDetails, WorkersCompDetails } from '@/data/types';

type Update = (patch: Partial<Quote>) => void;

function LinePremium({ rated, lineKey }: { rated: ErieQuoteResult; lineKey: string }) {
  const line = rated.lines.find((l) => l.key === lineKey);
  if (!line) return null;
  return <span className="line-premium">{line.breakdown.total ? `${money(line.breakdown.total)}/yr` : 'Not rated'}</span>;
}

// ---------------------------------------------------------------- Umbrella

export type UnderlyingCheck = { autoOk: boolean; homeOk: boolean; autoText: string; homeText: string; autoSource: 'quote' | 'erie' | 'other' | 'none'; homeSource: 'quote' | 'erie' | 'other' | 'none'; erieAuto?: Policy; erieHome?: Policy };

/** Verifies the umbrella's required underlying limits from this quote, in-force ERIE policies, or another carrier. */
export function umbrellaUnderlying(quote: Quote, existing: Policy[]): UnderlyingCheck {
  // Check every in-force ERIE policy; the first one that falls short is the one reported.
  const autos = existing.filter((p) => p.type === 'Auto' && p.status !== 'Cancelled' && p.autoCoverages);
  const homes = existing.filter((p) => p.type === 'Home' && p.status !== 'Cancelled' && p.homeCoverages);
  const erieAuto = autos.find((p) => !meetsUmbrellaAutoMinimum(p.autoCoverages!.bodilyInjury, p.autoCoverages!.propertyDamage)) ?? autos[0];
  const erieHome = homes.find((p) => p.homeCoverages!.personalLiability < UMBRELLA_HOME_MINIMUM) ?? homes[0];
  const u = quote.umbrella;
  let autoOk = true; let autoText = 'No auto exposure'; let autoSource: UnderlyingCheck['autoSource'] = 'none';
  if (quote.products.includes('auto')) { autoSource = 'quote'; autoOk = meetsUmbrellaAutoMinimum(quote.autoCoverages.bodilyInjury, quote.autoCoverages.propertyDamage); autoText = `This quote: BI ${quote.autoCoverages.bodilyInjury} · PD $${quote.autoCoverages.propertyDamage}`; }
  else if (erieAuto?.autoCoverages) { autoSource = 'erie'; autoOk = meetsUmbrellaAutoMinimum(erieAuto.autoCoverages.bodilyInjury, erieAuto.autoCoverages.propertyDamage); autoText = `ERIE ${erieAuto.number}: BI ${erieAuto.autoCoverages.bodilyInjury} · PD $${erieAuto.autoCoverages.propertyDamage}`; }
  else if (u.autoExposures > 0) { autoSource = 'other'; autoOk = ['250/500/100', '500 CSL', '1M CSL'].includes(u.otherAutoLimits); autoText = u.otherAutoLimits ? `Other carrier: ${u.otherAutoLimits}` : 'Other carrier limits not entered'; }
  let homeOk = true; let homeText = 'No residence exposure'; let homeSource: UnderlyingCheck['homeSource'] = 'none';
  if (quote.products.includes('home')) { homeSource = 'quote'; homeOk = quote.homeCoverages.personalLiability >= UMBRELLA_HOME_MINIMUM; homeText = `This quote: personal liability ${money(quote.homeCoverages.personalLiability)}`; }
  else if (erieHome?.homeCoverages) { homeSource = 'erie'; homeOk = erieHome.homeCoverages.personalLiability >= UMBRELLA_HOME_MINIMUM; homeText = `ERIE ${erieHome.number}: personal liability ${money(erieHome.homeCoverages.personalLiability)}`; }
  else if (u.residences > 0) { homeSource = 'other'; homeOk = u.otherHomeLiability >= UMBRELLA_HOME_MINIMUM; homeText = u.otherHomeLiability ? `Other carrier: personal liability ${money(u.otherHomeLiability)}` : 'Other carrier limit not entered'; }
  return { autoOk, homeOk, autoText, homeText, autoSource, homeSource, erieAuto, erieHome };
}

export function UmbrellaStep({ quote, update, existing, rated }: { quote: Quote; update: Update; existing: Policy[]; rated: ErieQuoteResult }) {
  const u = quote.umbrella;
  const set = <K extends keyof UmbrellaDetails>(key: K, value: UmbrellaDetails[K]) => update({ umbrella: { ...u, [key]: value } });
  const check = umbrellaUnderlying(quote, existing);
  const Check = ({ ok, children }: { ok: boolean; children: ReactNode }) => <div className={`underlying ${ok ? 'ok' : 'bad'}`}>{ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}<span>{children}</span></div>;
  return <>
    <p className="wizard-intro">Personal Catastrophe Liability sits above the auto, home and watercraft policies. ERIE requires the underlying liability limits to be at their required minimums before the umbrella can be bound.</p>
    <h2 className="section-h"><Umbrella size={15} /> Limit <LinePremium rated={rated} lineKey="umbrella" /></h2>
    <div className="plan-grid">{[1, 2, 3, 4, 5].map((m) => <label key={m} className={`plan ${u.limit === m * 1000000 ? 'on' : ''}`}><input type="radio" checked={u.limit === m * 1000000} onChange={() => set('limit', m * 1000000)} /><strong>${m},000,000</strong></label>)}</div>
    <h2 className="section-h">Exposures</h2>
    <div className="px-grid3">
      <Field label="Autos (all household)"><input type="number" min={0} value={u.autoExposures} onChange={(e) => set('autoExposures', Math.max(0, Number(e.target.value)))} /></Field>
      <Field label="Operators under 25"><input type="number" min={0} value={u.youthfulOperators} onChange={(e) => set('youthfulOperators', Math.max(0, Number(e.target.value)))} /></Field>
      <Field label="Residences owned or rented"><input type="number" min={0} value={u.residences} onChange={(e) => set('residences', Math.max(0, Number(e.target.value)))} /></Field>
      <Field label="Watercraft"><input type="number" min={0} value={u.watercraft} onChange={(e) => set('watercraft', Math.max(0, Number(e.target.value)))} /></Field>
      <Field label="Recreational vehicles (golf carts, ATVs)"><input type="number" min={0} value={u.recreationalVehicles} onChange={(e) => set('recreationalVehicles', Math.max(0, Number(e.target.value)))} /></Field>
    </div>
    <button type="button" className="link-button" onClick={() => update({ umbrella: { ...u, autoExposures: Math.max(quote.vehicles.length + existing.filter((p) => p.type === 'Auto' && p.status !== 'Cancelled').reduce((t, p) => t + p.vehicles.length, 0), u.autoExposures), youthfulOperators: quote.drivers.filter((d) => d.dob && ageFrom(d.dob) < 25).length, watercraft: quote.products.includes('boat') ? Math.max(1, u.watercraft) : u.watercraft } })}>Fill exposures from this quote and in-force policies</button>
    <h2 className="section-h">Underlying limits verification</h2>
    <Check ok={check.autoOk}>Auto — requires 250/500/100 or 500 CSL. <strong>{check.autoText}</strong>
      {!check.autoOk && check.autoSource === 'quote' && <button type="button" className="px-btn small" onClick={() => update({ autoCoverages: { ...quote.autoCoverages, bodilyInjury: '250/500', propertyDamage: '100,000', uninsuredMotorist: '250/500' } })}>Raise to 250/500/100</button>}
      {!check.autoOk && check.autoSource === 'erie' && check.erieAuto && <Link className="px-btn small" to={`/policies/${check.erieAuto.number}`}>Policy change on {check.erieAuto.number}</Link>}
    </Check>
    {check.autoSource === 'other' && <Field label="Other carrier auto limits"><select value={u.otherAutoLimits} onChange={(e) => set('otherAutoLimits', e.target.value)}><option value="">-- Select --</option>{['100/300/100', '250/500/100', '500 CSL', '1M CSL'].map((o) => <option key={o}>{o}</option>)}</select></Field>}
    <Check ok={check.homeOk}>Home — requires $300,000 personal liability. <strong>{check.homeText}</strong>
      {!check.homeOk && check.homeSource === 'quote' && <button type="button" className="px-btn small" onClick={() => update({ homeCoverages: { ...quote.homeCoverages, personalLiability: 300000 } })}>Raise to $300,000</button>}
      {!check.homeOk && check.homeSource === 'erie' && check.erieHome && <Link className="px-btn small" to={`/policies/${check.erieHome.number}`}>Policy change on {check.erieHome.number}</Link>}
    </Check>
    {check.homeSource === 'other' && <Field label="Other carrier personal liability"><select value={u.otherHomeLiability} onChange={(e) => set('otherHomeLiability', Math.max(0, Number(e.target.value)))}><option value={0}>-- Select --</option>{[100000, 300000, 500000, 1000000].map((o) => <option key={o} value={o}>{money(o)}</option>)}</select></Field>}
  </>;
}

// -------------------------------------------------------------- Commercial

const num = (value: string) => (value === '' ? 0 : Number(value));

/** Referral / decline findings for the commercial account, shown live while quoting. */
export function CommercialRulesPanel({ c }: { c: CommercialDetails }) {
  const rules = commercialRules(c);
  if (!rules.length) return <div className="underlying ok"><CheckCircle2 size={16} /><span>Within appetite — eligible for real-time quote and bind.</span></div>;
  return <>{rules.map((r) => <div key={r.text} className={`underlying ${r.outcome === 'decline' ? 'bad' : 'refer'}`}>{r.outcome === 'decline' ? <XCircle size={16} /> : <AlertTriangle size={16} />}<span><strong>{r.outcome === 'decline' ? 'Ineligible' : 'Refer to underwriting'}:</strong> {r.text}</span></div>)}</>;
}

export function CommercialStep({ quote, update, rated }: { quote: Quote; update: Update; rated: ErieQuoteResult }) {
  const c = quote.commercial;
  const setC = (patch: Partial<CommercialDetails>) => update({ commercial: { ...c, ...patch } });
  const b = c.business;
  const setB = <K extends keyof BusinessDetails>(key: K, value: BusinessDetails[K]) => setC({ business: { ...b, [key]: value } });
  const toggleLine = (line: CommercialLine) => setC({ lines: c.lines.includes(line) ? c.lines.filter((l) => l !== line) : [...c.lines, line] });
  const lineIcon: Record<CommercialLine, ReactNode> = { bop: <Building2 size={15} />, contractors: <HardHat size={15} />, commercialAuto: <Truck size={15} />, workersComp: <HardHat size={15} />, umbrella: <Umbrella size={15} /> };

  return <>
    <h2 className="section-h"><Building2 size={15} /> Business profile</h2>
    <div className="px-grid3">
      <Field label="Legal business name" required className="span2"><input value={b.businessName} onChange={(e) => setB('businessName', e.target.value)} /></Field>
      <Field label="Entity type"><select value={b.entity} onChange={(e) => setB('entity', e.target.value as BusinessDetails['entity'])}><option>LLC</option><option>Corporation</option><option>Sole Proprietor</option><option>Partnership</option></select></Field>
      <Field label="FEIN"><input value={b.fein} onChange={(e) => setB('fein', e.target.value)} placeholder="12-3456789" /></Field>
      <Field label="Years in business" hint={b.yearsInBusiness < 1 ? 'New ventures refer to underwriting' : undefined}><input type="number" min={0} value={b.yearsInBusiness} onChange={(e) => setB('yearsInBusiness', Math.max(0, num(e.target.value)))} /></Field>
      <Field label="Employees"><input type="number" min={0} value={b.employees} onChange={(e) => setB('employees', Math.max(0, num(e.target.value)))} /></Field>
      <Field label="Annual gross sales"><input type="number" step={10000} value={b.revenue} onChange={(e) => setB('revenue', Math.max(0, num(e.target.value)))} /></Field>
      <Field label="Annual payroll" hint="Rating basis for contractors and payroll-rated classes"><input type="number" step={10000} value={b.payroll} onChange={(e) => setB('payroll', Math.max(0, num(e.target.value)))} /></Field>
      <Field label="General liability limits"><select value={b.glLimit} onChange={(e) => setB('glLimit', e.target.value as BusinessDetails['glLimit'])}><option value="1M/2M">$1M occurrence / $2M aggregate</option><option value="2M/4M">$2M occurrence / $4M aggregate</option></select></Field>
      <Field label="Business location" required className="span2"><input value={b.address} onChange={(e) => setB('address', e.target.value)} /></Field>
      <Field label="City"><input value={b.city} onChange={(e) => setB('city', e.target.value)} /></Field>
      <Field label="State"><select value={b.state} onChange={(e) => setB('state', e.target.value)}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></Field>
      <Field label="ZIP" required><input value={b.zip} onChange={(e) => setB('zip', e.target.value.replace(/\D/g, '').slice(0, 5))} /></Field>
    </div>

    <h2 className="section-h">Prior insurance &amp; loss history (5 years)</h2>
    <div className="px-grid3">
      <Field label="Prior carrier"><input value={b.priorCarrier ?? ''} onChange={(e) => setB('priorCarrier', e.target.value)} placeholder="None if new venture" /></Field>
      <Field label="Years with prior carrier"><input type="number" min={0} value={b.priorYears ?? 0} onChange={(e) => setB('priorYears', Math.max(0, num(e.target.value)))} /></Field>
      <Field label="Number of losses" hint={(b.lossCount5yr ?? 0) >= 3 ? '3 or more losses refer to underwriting' : undefined}><input type="number" min={0} value={b.lossCount5yr ?? 0} onChange={(e) => setB('lossCount5yr', Math.max(0, num(e.target.value)))} /></Field>
      <Field label="Total incurred losses" hint={(b.lossIncurred5yr ?? 0) > 50000 ? 'Over $50,000 refers to underwriting' : undefined}><input type="number" min={0} step={1000} value={b.lossIncurred5yr ?? 0} onChange={(e) => setB('lossIncurred5yr', Math.max(0, num(e.target.value)))} /></Field>
    </div>

    <h2 className="section-h">Commercial lines</h2>
    <div className="line-picker">{(Object.keys(commercialLineLabels) as CommercialLine[]).map((line) => <label key={line} className={`plan ${c.lines.includes(line) ? 'on' : ''}`}><input type="checkbox" checked={c.lines.includes(line)} onChange={() => toggleLine(line)} /><strong>{lineIcon[line]} {commercialLineLabels[line]}</strong><LinePremium rated={rated} lineKey={`commercial:${line}`} /></label>)}</div>

    {c.lines.includes('bop') && <BopSection b={b} setB={setB} patch={(p) => setC({ business: { ...b, ...p } })} rated={rated} />}
    {c.lines.includes('contractors') && <ContractorsSection v={c.contractors} set={(contractors) => setC({ contractors })} b={b} rated={rated} />}
    {c.lines.includes('commercialAuto') && <CommercialAutoSection v={c.commercialAuto} set={(commercialAuto) => setC({ commercialAuto })} rated={rated} />}
    {c.lines.includes('workersComp') && <WorkersCompSection v={c.workersComp} set={(workersComp) => setC({ workersComp })} state={b.state} rated={rated} />}
    {c.lines.includes('umbrella') && <CommercialUmbrellaSection c={c} setC={setC} rated={rated} />}

    <h2 className="section-h">Underwriting eligibility</h2>
    <CommercialRulesPanel c={c} />
  </>;
}

function BopSection({ b, setB, patch, rated }: { b: BusinessDetails; setB: <K extends keyof BusinessDetails>(key: K, value: BusinessDetails[K]) => void; patch: (p: Partial<BusinessDetails>) => void; rated: ErieQuoteResult }) {
  const cls = businessClasses.find((x) => x.code === b.classCode);
  const short = coinsuranceShortfall(b);
  return <div className="coverage-group commercial-line">
    <h2><Building2 size={16} /> Ultrapack Plus — Business Owners <LinePremium rated={rated} lineKey="commercial:bop" /></h2>
    <div className="px-grid3">
      <Field label="Business class" required className="span2"><select value={b.classCode} onChange={(e) => setB('classCode', e.target.value)}><option value="">-- Select class --</option>{[...new Set(businessClasses.map((x) => x.group))].map((g) => <optgroup key={g} label={g}>{businessClasses.filter((x) => x.group === g).map((x) => <option key={x.code} value={x.code}>{x.label}{x.iso ? ` (ISO ${x.iso})` : ''}{x.appetite === 'no' ? ' — not eligible' : x.appetite === 'refer' ? ' — referral' : ''}</option>)}</optgroup>)}</select></Field>
      <Field label="GL premium basis"><input readOnly value={cls ? `${cls.basis === 'sales' ? 'Gross sales' : cls.basis === 'payroll' ? 'Payroll' : 'Area'} — ${basisLabel[cls.basis]}` : '—'} /></Field>
      <Field label="Occupied sq. ft." hint={`BOP limit ${BOP_LIMITS.squareFeet.toLocaleString()} sq ft`}><input type="number" step={100} value={b.squareFeet} onChange={(e) => setB('squareFeet', Math.max(0, num(e.target.value)))} /></Field>
      <Field label="Stories" hint={`BOP limit ${BOP_LIMITS.stories}`}><input type="number" min={1} value={b.stories ?? 1} onChange={(e) => setB('stories', Math.max(1, num(e.target.value)))} /></Field>
      <Field label="Construction (ISO)"><select value={b.construction} onChange={(e) => setB('construction', e.target.value as BusinessDetails['construction'])}>{CONSTRUCTION_CLASSES.map((x, i) => <option key={x} value={x}>{i + 1} — {x}</option>)}</select></Field>
      <Field label="Protection class (1–10)" hint="ISO public protection class for the location"><input type="number" min={1} max={10} value={b.protectionClass ?? 4} onChange={(e) => setB('protectionClass', Math.max(0, num(e.target.value)))} /></Field>
      <Field label="Fire alarm"><select value={b.alarm} onChange={(e) => setB('alarm', e.target.value as BusinessDetails['alarm'])}><option>None</option><option>Local</option><option>Central Station</option></select></Field>
      <Field label="Valuation"><select value={b.valuation ?? 'Replacement Cost'} onChange={(e) => setB('valuation', e.target.value as BusinessDetails['valuation'])}><option>Replacement Cost</option><option>Actual Cash Value</option></select></Field>
      <Field label="Coinsurance"><select value={b.coinsurance ?? 90} onChange={(e) => setB('coinsurance', Number(e.target.value) as BusinessDetails['coinsurance'])}>{[80, 90, 100].map((x) => <option key={x} value={x}>{x}%</option>)}</select></Field>
      <Field label="Business personal property"><input type="number" step={5000} value={b.bppLimit} onChange={(e) => setB('bppLimit', Math.max(0, num(e.target.value)))} /></Field>
      <Field label="Property deductible"><select value={b.propertyDeductible} onChange={(e) => setB('propertyDeductible', Number(e.target.value))}>{[500, 1000, 2500, 5000, 10000].map((d) => <option key={d} value={d}>{money(d)}</option>)}</select></Field>
      <Field label="Wind/hail deductible"><select value={b.windHailPct ?? 0} onChange={(e) => setB('windHailPct', Number(e.target.value) as BusinessDetails['windHailPct'])}><option value={0}>Same as property deductible</option>{[1, 2, 5].map((x) => <option key={x} value={x}>{x}% of building value</option>)}</select></Field>
      {b.ownsBuilding && <Field label="Building limit" hint={`Estimated replacement cost ${money(suggestedBuildingLimit(b))}`}><input type="number" step={5000} value={b.buildingLimit} onChange={(e) => setB('buildingLimit', Math.max(0, num(e.target.value)))} /></Field>}
    </div>
    {cls && <p className="px-muted">{cls.note}</p>}
    {short && <div className="underlying bad"><XCircle size={16} /><span>Building limit is below {b.coinsurance ?? 90}% of estimated replacement cost ({money(short.required)}). <button type="button" className="px-btn small" onClick={() => setB('buildingLimit', short.replacement)}>Insure to {money(short.replacement)}</button></span></div>}
    <div className="px-checks inline">
      <label><input type="checkbox" checked={b.ownsBuilding} onChange={(e) => patch({ ownsBuilding: e.target.checked, buildingLimit: e.target.checked ? b.buildingLimit || suggestedBuildingLimit(b) : b.buildingLimit })} /> Insured owns the building</label>
      <label><input type="checkbox" checked={b.sprinklered} onChange={(e) => setB('sprinklered', e.target.checked)} /> Fully sprinklered</label>
      <label><input type="checkbox" checked={b.cyber} onChange={(e) => setB('cyber', e.target.checked)} /> Cyber &amp; data breach</label>
      <label><input type="checkbox" checked={b.epli} onChange={(e) => setB('epli', e.target.checked)} /> Employment practices</label>
      <label><input type="checkbox" checked={b.hiredNonOwnedAuto} onChange={(e) => setB('hiredNonOwnedAuto', e.target.checked)} /> Hired &amp; non-owned auto</label>
      <label><input type="checkbox" checked={b.equipmentBreakdown} onChange={(e) => setB('equipmentBreakdown', e.target.checked)} /> Equipment breakdown</label>
      <label><input type="checkbox" checked={b.employeeDishonesty} onChange={(e) => setB('employeeDishonesty', e.target.checked)} /> Employee dishonesty</label>
      <label><input type="checkbox" checked={b.terrorism !== false} onChange={(e) => setB('terrorism', e.target.checked)} /> Accept terrorism (TRIA) coverage</label>
    </div>
    <p className="px-muted">Includes Income Protection (12 months actual loss sustained), Extra Expense and Civil Authority. ISO BOP eligibility: up to {BOP_LIMITS.squareFeet.toLocaleString()} sq ft, {money(BOP_LIMITS.sales)} sales per location and {BOP_LIMITS.stories} stories.</p>
  </div>;
}

function ContractorsSection({ v, set, b, rated }: { v: ContractorsDetails; set: (v: ContractorsDetails) => void; b: BusinessDetails; rated: ErieQuoteResult }) {
  const s = <K extends keyof ContractorsDetails>(key: K, value: ContractorsDetails[K]) => set({ ...v, [key]: value });
  return <div className="coverage-group commercial-line">
    <h2><HardHat size={16} /> Fivestar Contractors Package <LinePremium rated={rated} lineKey="commercial:contractors" /></h2>
    <div className="px-grid3">
      <Field label="Trade" required className="span2"><select value={v.trade} onChange={(e) => s('trade', e.target.value)}><option value="">-- Select trade --</option>{contractorTrades.map((t) => <option key={t.code} value={t.code}>{t.label}{t.iso ? ` (ISO ${t.iso})` : ''}{t.appetite === 'no' ? ' — not eligible' : t.appetite === 'refer' ? ' — referral' : ''}</option>)}</select></Field>
      <Field label="GL premium basis"><input readOnly value={`Payroll ${money(b.payroll)} — per $1,000`} /></Field>
      <Field label="Work subcontracted (%)" hint={v.subcontractedPct > 50 ? 'Over 50% refers to underwriting' : 'Certificates of insurance required from subs'}><input type="number" min={0} max={100} value={v.subcontractedPct} onChange={(e) => s('subcontractedPct', Math.max(0, num(e.target.value)))} /></Field>
      <Field label="Contractors equipment floater"><input type="number" step={5000} value={v.equipmentFloater} onChange={(e) => s('equipmentFloater', Math.max(0, num(e.target.value)))} /></Field>
      <Field label="Installation floater (per job)"><input type="number" step={5000} value={v.installationFloater} onChange={(e) => s('installationFloater', Math.max(0, num(e.target.value)))} /></Field>
      <Field label="Tools & small equipment"><input type="number" step={1000} value={v.toolsLimit} onChange={(e) => s('toolsLimit', Math.max(0, num(e.target.value)))} /></Field>
    </div>
    <label className="px-checks"><input type="checkbox" checked={v.additionalInsuredBlanket} onChange={(e) => s('additionalInsuredBlanket', e.target.checked)} /> Blanket additional insured — owners, lessees or contractors</label>
  </div>;
}

function CommercialAutoSection({ v, set, rated }: { v: CommercialAutoDetails; set: (v: CommercialAutoDetails) => void; rated: ErieQuoteResult }) {
  const s = <K extends keyof CommercialAutoDetails>(key: K, value: CommercialAutoDetails[K]) => set({ ...v, [key]: value });
  const addVehicle = () => s('vehicles', [...v.vehicles, { id: `CV${Date.now()}`, year: new Date().getFullYear() - 2, make: 'Ford', model: 'Transit 250', bodyType: 'Light Truck', gvw: 9000, use: 'Service', vin: '', costNew: 48000, radius: 'Local (0–50 mi)' }]);
  const addDriver = () => s('drivers', [...v.drivers, { id: `CD${Date.now()}`, name: '', age: 35, violations: 0, accidents: 0, cdl: false, yearsLicensed: 10 }]);
  const needsCdl = v.vehicles.some((x) => (x.gvw ?? 0) >= CDL_GVW || x.bodyType === 'Truck-Tractor');
  return <div className="coverage-group commercial-line">
    <h2><Truck size={16} /> Commercial Auto <LinePremium rated={rated} lineKey="commercial:commercialAuto" /></h2>
    <div className="px-grid3">
      <Field label="Liability"><select value={v.liability} onChange={(e) => s('liability', e.target.value as CommercialAutoDetails['liability'])}><option>500,000 CSL</option><option>1,000,000 CSL</option></select></Field>
      <Field label="Uninsured / underinsured motorists"><select value={v.uninsuredMotorist ?? 'None'} onChange={(e) => s('uninsuredMotorist', e.target.value as CommercialAutoDetails['uninsuredMotorist'])}><option>None</option><option>500,000 CSL</option><option>1,000,000 CSL</option></select></Field>
      <Field label="Medical payments"><select value={v.medicalPayments ?? 0} onChange={(e) => s('medicalPayments', Number(e.target.value))}><option value={0}>None</option>{[5000, 10000].map((m) => <option key={m} value={m}>{money(m)} each person</option>)}</select></Field>
      <Field label="Physical damage deductible"><select value={v.physicalDamageDeductible} onChange={(e) => s('physicalDamageDeductible', Number(e.target.value))}>{[500, 1000, 2500].map((d) => <option key={d} value={d}>{money(d)}</option>)}</select></Field>
      {v.garagekeepers && <Field label="Garagekeepers limit"><input type="number" step={10000} value={v.garagekeepersLimit} onChange={(e) => s('garagekeepersLimit', Math.max(0, num(e.target.value)))} /></Field>}
    </div>
    <div className="px-checks inline"><label><input type="checkbox" checked={v.garagekeepers} onChange={(e) => s('garagekeepers', e.target.checked)} /> Garagekeepers liability (customers’ vehicles in your care)</label><label><input type="checkbox" checked={v.hiredNonOwned} onChange={(e) => s('hiredNonOwned', e.target.checked)} /> Hired &amp; non-owned auto</label></div>
    <h3 className="mini-h">Vehicles <button type="button" className="link-button" onClick={addVehicle}><Plus size={13} /> Add vehicle</button></h3>
    <p className="px-muted">ISO size class is set from gross vehicle weight: light up to 10,000 lb, medium 10,001–20,000, heavy 20,001–45,000, extra-heavy over 45,000. Truck-tractors are rated on gross combination weight.</p>
    {v.vehicles.length === 0 ? <p className="px-muted">No vehicles yet.</p> : <div className="table-scroll"><table className="px-table edit-table"><thead><tr><th>Year</th><th>Make</th><th>Model</th><th>VIN</th><th>GVW (lb)</th><th>Tractor</th><th>Size class</th><th>Use</th><th>Cost new</th><th>Radius</th><th /></tr></thead><tbody>{v.vehicles.map((x, i) => {
      const upd = (patch: Partial<typeof x>) => s('vehicles', v.vehicles.map((y, j) => {
        if (j !== i) return y;
        const next = { ...y, ...patch };
        // A weight change re-derives the ISO size class (private passenger types stay as chosen).
        return 'gvw' in patch && next.bodyType !== 'Private Passenger' ? { ...next, bodyType: sizeClass(next.gvw, next.bodyType === 'Truck-Tractor') } : next;
      }));
      return <tr key={x.id}>
        <td><input type="number" value={x.year} onChange={(e) => upd({ year: Math.max(0, num(e.target.value)) })} aria-label="Year" /></td>
        <td><input value={x.make} onChange={(e) => upd({ make: e.target.value })} aria-label="Make" /></td>
        <td><input value={x.model} onChange={(e) => upd({ model: e.target.value })} aria-label="Model" /></td>
        <td><input value={x.vin ?? ''} maxLength={17} onChange={(e) => upd({ vin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} aria-label="VIN" className="vin" /></td>
        <td><input type="number" step={500} value={x.gvw ?? 0} onChange={(e) => upd({ gvw: Math.max(0, num(e.target.value)) })} aria-label="GVW" /></td>
        <td><input type="checkbox" checked={x.bodyType === 'Truck-Tractor'} onChange={(e) => s('vehicles', v.vehicles.map((y, j) => (j === i ? { ...y, bodyType: sizeClass(y.gvw, e.target.checked) } : y)))} aria-label="Truck-tractor" /></td>
        <td><select value={x.bodyType} onChange={(e) => s('vehicles', v.vehicles.map((y, j) => (j === i ? { ...y, bodyType: e.target.value as typeof x.bodyType } : y)))} aria-label="Size class">{['Private Passenger', 'Light Truck', 'Medium Truck', 'Heavy Truck', 'Extra-Heavy Truck', 'Truck-Tractor'].map((o) => <option key={o}>{o}</option>)}</select></td>
        <td><select value={x.use ?? 'Service'} onChange={(e) => upd({ use: e.target.value as NonNullable<typeof x.use> })} aria-label="Use">{['Service', 'Retail', 'Commercial'].map((o) => <option key={o}>{o}</option>)}</select></td>
        <td><input type="number" step={1000} value={x.costNew} onChange={(e) => upd({ costNew: Math.max(0, num(e.target.value)) })} aria-label="Cost new" /></td>
        <td><select value={x.radius} onChange={(e) => upd({ radius: e.target.value as typeof x.radius })} aria-label="Radius">{['Local (0–50 mi)', 'Intermediate (51–200 mi)', 'Long Haul (200+ mi)'].map((o) => <option key={o}>{o}</option>)}</select></td>
        <td className="row-actions"><button type="button" onClick={() => s('vehicles', v.vehicles.filter((_, j) => j !== i))} aria-label="Remove vehicle"><Trash2 size={14} /></button></td>
      </tr>;
    })}</tbody></table></div>}
    <h3 className="mini-h">Drivers (MVR ordered at bind) <button type="button" className="link-button" onClick={addDriver}><Plus size={13} /> Add driver</button></h3>
    {needsCdl && <p className="px-muted">A unit is 26,001 lb or more — every listed driver must hold a commercial driver’s license (CDL).</p>}
    {v.drivers.length === 0 ? <p className="px-muted">No drivers yet.</p> : <table className="px-table edit-table"><thead><tr><th>Name</th><th>Age</th><th>Years licensed</th><th>CDL</th><th>Violations (3 yr)</th><th>At-fault accidents</th><th /></tr></thead><tbody>{v.drivers.map((x, i) => {
      const upd = (patch: Partial<typeof x>) => s('drivers', v.drivers.map((y, j) => (j === i ? { ...y, ...patch } : y)));
      return <tr key={x.id}><td><input value={x.name} onChange={(e) => upd({ name: e.target.value })} aria-label="Driver name" /></td><td><input type="number" value={x.age} onChange={(e) => upd({ age: Math.max(0, num(e.target.value)) })} aria-label="Age" /></td><td><input type="number" min={0} value={x.yearsLicensed ?? 10} onChange={(e) => upd({ yearsLicensed: Math.max(0, num(e.target.value)) })} aria-label="Years licensed" /></td><td><input type="checkbox" checked={!!x.cdl} onChange={(e) => upd({ cdl: e.target.checked })} aria-label="CDL" /></td><td><input type="number" min={0} value={x.violations} onChange={(e) => upd({ violations: Math.max(0, num(e.target.value)) })} aria-label="Violations" /></td><td><input type="number" min={0} value={x.accidents} onChange={(e) => upd({ accidents: Math.max(0, num(e.target.value)) })} aria-label="Accidents" /></td><td className="row-actions"><button type="button" onClick={() => s('drivers', v.drivers.filter((_, j) => j !== i))} aria-label="Remove driver"><Trash2 size={14} /></button></td></tr>;
    })}</tbody></table>}
  </div>;
}

function WorkersCompSection({ v, set, state, rated }: { v: WorkersCompDetails; set: (v: WorkersCompDetails) => void; state: string; rated: ErieQuoteResult }) {
  const s = <K extends keyof WorkersCompDetails>(key: K, value: WorkersCompDetails[K]) => set({ ...v, [key]: value });
  return <div className="coverage-group commercial-line">
    <h2><HardHat size={16} /> Workers’ Compensation <LinePremium rated={rated} lineKey="commercial:workersComp" /></h2>
    <p className="px-muted">{state === 'WI' ? `Wisconsin WCRB filed rates effective ${WC_RATES_EFFECTIVE}, $${WC_EXPENSE_CONSTANT} expense constant.` : `Rates shown for ${state} are illustrative — derived from Wisconsin filed rates; each state files its own.`} Premium discount is tiered on standard premium over $10,000.</p>
    <div className="px-grid3">
      <Field label="Experience modification (E-Mod)" hint={v.experienceMod > 1.25 ? 'E-Mod over 1.25 refers to underwriting' : undefined}><input type="number" step={0.01} min={0.5} max={2} value={v.experienceMod} onChange={(e) => s('experienceMod', Math.max(0, num(e.target.value)))} /></Field>
      <Field label="Employers liability"><select value={v.employersLiability} onChange={(e) => s('employersLiability', e.target.value as WorkersCompDetails['employersLiability'])}><option>100/500/100</option><option>500/500/500</option><option>1M/1M/1M</option></select></Field>
    </div>
    <h3 className="mini-h">Classifications <button type="button" className="link-button" onClick={() => s('classes', [...v.classes, { id: `WC${Date.now()}`, code: wcClasses.find((w) => !v.classes.some((x) => x.code === w.code))?.code ?? '8810', payroll: 50000 }])}><Plus size={13} /> Add class</button></h3>
    {v.classes.length === 0 ? <p className="px-muted">Add each class code with its estimated annual payroll.</p> : <table className="px-table edit-table"><thead><tr><th>Class code</th><th>Rate per $100</th><th>Estimated annual payroll</th><th /></tr></thead><tbody>{v.classes.map((x, i) => {
      const upd = (patch: Partial<typeof x>) => s('classes', v.classes.map((y, j) => (j === i ? { ...y, ...patch } : y)));
      return <tr key={x.id}><td><select value={x.code} onChange={(e) => upd({ code: e.target.value })} aria-label="Class code">{wcClasses.map((w) => <option key={w.code} value={w.code}>{w.code} — {w.label}</option>)}</select></td><td>{wcClasses.find((w) => w.code === x.code)?.rate.toFixed(3) ?? '—'}{state === 'WI' ? '' : '*'}</td><td><input type="number" step={5000} value={x.payroll} onChange={(e) => upd({ payroll: Math.max(0, num(e.target.value)) })} aria-label="Payroll" /></td><td className="row-actions"><button type="button" onClick={() => s('classes', v.classes.filter((_, j) => j !== i))} aria-label="Remove class"><Trash2 size={14} /></button></td></tr>;
    })}</tbody></table>}
  </div>;
}

function CommercialUmbrellaSection({ c, setC, rated }: { c: CommercialDetails; setC: (patch: Partial<CommercialDetails>) => void; rated: ErieQuoteResult }) {
  const limit = c.umbrella?.limit ?? 1000000;
  const hasGl = c.lines.includes('bop') || c.lines.includes('contractors');
  const Check = ({ ok, children }: { ok: boolean; children: ReactNode }) => <div className={`underlying ${ok ? 'ok' : 'bad'}`}>{ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}<span>{children}</span></div>;
  return <div className="coverage-group commercial-line">
    <h2><Umbrella size={16} /> {UMBRELLA_NAME} <LinePremium rated={rated} lineKey="commercial:umbrella" /></h2>
    <div className="plan-grid">{[1, 2, 3, 4, 5].map((m) => <label key={m} className={`plan ${limit === m * 1000000 ? 'on' : ''}`}><input type="radio" checked={limit === m * 1000000} onChange={() => setC({ umbrella: { limit: m * 1000000 } })} /><strong>${m},000,000</strong></label>)}</div>
    <h3 className="mini-h">Required underlying limits</h3>
    <Check ok={hasGl}>General liability $1M occurrence / $2M aggregate — {hasGl ? `${c.business.glLimit === '1M/2M' ? '$1M / $2M' : '$2M / $4M'} on this account` : 'add Ultrapack Plus or Fivestar Contractors'}</Check>
    {c.lines.includes('commercialAuto') && <Check ok={c.commercialAuto.liability === UMBRELLA_UNDERLYING.auto}>Commercial auto $1,000,000 CSL — currently {c.commercialAuto.liability}{c.commercialAuto.liability !== UMBRELLA_UNDERLYING.auto && <button type="button" className="px-btn small" onClick={() => setC({ commercialAuto: { ...c.commercialAuto, liability: '1,000,000 CSL' } })}>Raise to $1M CSL</button>}</Check>}
    {c.lines.includes('workersComp') && <Check ok={UMBRELLA_UNDERLYING.el.includes(c.workersComp.employersLiability)}>Employers liability 500/500/500 — currently {c.workersComp.employersLiability}{!UMBRELLA_UNDERLYING.el.includes(c.workersComp.employersLiability) && <button type="button" className="px-btn small" onClick={() => setC({ workersComp: { ...c.workersComp, employersLiability: '500/500/500' } })}>Raise to 500/500/500</button>}</Check>}
  </div>;
}
