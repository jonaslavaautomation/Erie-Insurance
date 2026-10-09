import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Building2, Check, CheckCircle2, ShieldCheck, Store } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { Field, PageTitle, Panel, StatusBadge } from '@/components/ui';
import { businessClasses, rateBusiness, suggestedBuildingLimit } from '@/data/commercial';
import { STATES } from '@/data/content';
import { addDays, today, usePortal } from '@/data/store';
import { AGENT } from '@/data/seed';
import { installmentSchedule, money } from '@/lib/rating';
import type { BusinessDetails, PayPlan } from '@/data/types';

const steps = ['Business', 'Location & property', 'Coverages', 'Premium', 'Bind'] as const;

export default function CommercialQuotePage() {
  const [params] = useSearchParams();
  const { issueBusinessPolicy, notify } = usePortal();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [b, setB] = useState<BusinessDetails>({
    businessName: '', ownerFirst: params.get('first') ?? '', ownerLast: params.get('last') ?? '', entity: 'LLC', fein: '', yearsInBusiness: 3, classCode: '', description: '', revenue: 450000, payroll: 120000, employees: 4,
    address: '', city: '', state: AGENT.stateCode, zip: '', phone: '', email: '', ownsBuilding: false, construction: 'Joisted Masonry', yearBuilt: 1990, squareFeet: 2400, sprinklered: false, alarm: 'None',
    buildingLimit: 0, bppLimit: 75000, glLimit: '1M/2M', propertyDeductible: 1000, cyber: false, epli: false, hiredNonOwnedAuto: false, equipmentBreakdown: false, employeeDishonesty: false,
  });
  const [terms, setTerms] = useState({ effective: addDays(today(), 7), payPlan: 'Quarterly' as PayPlan, autoPay: true, agentNumber: AGENT.agentNumbers[0] });
  const [uw, setUw] = useState<'none' | 'requested' | 'approved'>('none');
  const [bind, setBind] = useState({ routing: '', account: '', verified: false, signed: false, disclosures: false });
  const [issued, setIssued] = useState('');

  const cls = businessClasses.find((c) => c.code === b.classCode);
  const breakdown = useMemo(() => rateBusiness(b), [b]);
  const set = <K extends keyof BusinessDetails>(key: K, value: BusinessDetails[K]) => setB((current) => ({ ...current, [key]: value }));
  const needsReferral = cls?.appetite === 'refer' || b.revenue > 5000000 || b.employees > 50;
  const blocked = cls?.appetite === 'no';

  const validate = () => {
    const p: string[] = [];
    if (step === 0) {
      if (!b.businessName.trim()) p.push('Enter the legal business name.');
      if (!b.ownerFirst.trim() || !b.ownerLast.trim()) p.push('Enter the owner’s first and last name.');
      if (!cls) p.push('Select a business class.');
      if (blocked) p.push(`${cls?.label} is outside ErieSecure Business appetite.`);
      if (b.revenue <= 0) p.push('Enter annual gross sales.');
      if (b.fein && !/^\d{2}-?\d{7}$/.test(b.fein)) p.push('FEIN must be 9 digits (12-3456789).');
    }
    if (step === 1) {
      if (!b.address.trim() || !b.city.trim() || !/^\d{5}$/.test(b.zip)) p.push('Enter the full location address with a 5-digit ZIP.');
      if (b.squareFeet < 100) p.push('Enter the occupied square footage.');
      if (b.ownsBuilding && b.buildingLimit < suggestedBuildingLimit(b) * 0.9) p.push(`Building limit must be at least 90% of the estimated replacement cost (${money(suggestedBuildingLimit(b))}).`);
    }
    if (step === 2 && b.bppLimit < 5000) p.push('Business personal property must be at least $5,000.');
    if (step === 4) {
      if (needsReferral && uw !== 'approved') p.push('Underwriter approval is required before binding.');
      if (!/^\(?\d{3}\)?[\s-]?\d{3}-?\d{4}$/.test(b.phone) || !/^\S+@\S+\.\S+$/.test(b.email)) p.push('Enter the business phone and email.');
      if (!bind.verified) p.push('Verify the ERIExpressPay® bank account.');
      if (!bind.signed || !bind.disclosures) p.push('Confirm the signed application and disclosures.');
      if (terms.effective < today()) p.push('Effective date cannot be in the past.');
    }
    return p;
  };

  const next = () => { const p = validate(); setErrors(p); if (!p.length) setStep(step + 1); };
  const requestApproval = () => {
    setUw('requested');
    notify('Submitted to Brian Kessler, Commercial Lines Underwriter.', 'info');
    window.setTimeout(() => { setUw('approved'); notify('Commercial underwriting approved the risk.'); }, 2200);
  };
  const issue = () => {
    const p = validate(); setErrors(p); if (p.length) return;
    const number = issueBusinessPolicy(b, { premium: breakdown.total, ...terms });
    setIssued(number);
    notify(`ErieSecure Business® policy ${number} issued.`);
  };

  if (issued) return <PortalLayout><main className="px-page narrow">
    <PageTitle crumbs={[{ label: 'Commercial', to: '/products/eriesecure-business' }, { label: 'Issued' }]} title="Policy issued" />
    <Panel><div className="issued-hero"><CheckCircle2 size={40} /><div><h2>{b.businessName} is covered</h2><p>ErieSecure Business® policy <Link className="mono" to={`/policies/${issued}`}>{issued}</Link> · effective {terms.effective} · {money(breakdown.total)}/yr</p></div></div>
      <div className="issued-actions"><Link className="continue-action" to={`/policies/${issued}`}>OPEN POLICY</Link><Link className="outline-action" to={`/resources/certificates?policy=${issued}`}>ISSUE CERTIFICATE</Link><Link className="outline-action" to="/billing">PAYMENT CENTER</Link><Link className="outline-action" to="/commercial/quote">ANOTHER COMMERCIAL QUOTE</Link></div></Panel>
  </main></PortalLayout>;

  const s = installmentSchedule(breakdown.total, terms.payPlan, terms.autoPay);
  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: 'Commercial', to: '/products/eriesecure-business' }, { label: 'ErieSecure Business quote' }]} title="ErieSecure Business® Quote" subtitle="Real-time quoting for eligible classes. Referral classes route to commercial underwriting." />
    <ol className="wizard-steps compact">{steps.map((label, i) => <li key={label} className={`${i === step ? 'current' : ''} ${i < step ? 'done' : ''}`}><button type="button" disabled={i > step} onClick={() => { setErrors([]); setStep(i); }}><span>{i < step ? <Check size={12} /> : i + 1}</span>{label}</button></li>)}</ol>
    {cls && <div className={`wizard-banner ${cls.appetite === 'yes' && !needsReferral ? 'good' : cls.appetite === 'no' ? 'bad' : 'warn'}`}>{cls.appetite === 'no' ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />} <strong>{cls.label}</strong> — {needsReferral && cls.appetite === 'yes' ? 'Size exceeds real-time limits; refers to underwriting.' : cls.note}{needsReferral && step >= 3 && (uw === 'none' ? <button type="button" onClick={requestApproval}>Submit to underwriter</button> : uw === 'requested' ? ' Awaiting underwriter…' : ' Approved.')}</div>}
    <div className="wizard-layout">
      <Panel>
        {step === 0 && <>
          <div className="px-grid3">
            <Field label="Legal business name" required className="span2"><input value={b.businessName} onChange={(e) => set('businessName', e.target.value)} /></Field>
            <Field label="Entity type"><select value={b.entity} onChange={(e) => set('entity', e.target.value as BusinessDetails['entity'])}><option>LLC</option><option>Corporation</option><option>Sole Proprietor</option><option>Partnership</option></select></Field>
            <Field label="Owner first name" required><input value={b.ownerFirst} onChange={(e) => set('ownerFirst', e.target.value)} /></Field>
            <Field label="Owner last name" required><input value={b.ownerLast} onChange={(e) => set('ownerLast', e.target.value)} /></Field>
            <Field label="FEIN"><input value={b.fein} onChange={(e) => set('fein', e.target.value)} placeholder="12-3456789" /></Field>
            <Field label="Business class" required className="span2"><select value={b.classCode} onChange={(e) => set('classCode', e.target.value)}><option value="">-- Select class --</option>{[...new Set(businessClasses.map((c) => c.group))].map((g) => <optgroup key={g} label={g}>{businessClasses.filter((c) => c.group === g).map((c) => <option key={c.code} value={c.code}>{c.label} ({c.code}){c.appetite === 'no' ? ' — not eligible' : c.appetite === 'refer' ? ' — referral' : ''}</option>)}</optgroup>)}</select></Field>
            <Field label="Years in business"><input type="number" min={0} value={b.yearsInBusiness} onChange={(e) => set('yearsInBusiness', Number(e.target.value))} /></Field>
            <Field label="Annual gross sales" required><input type="number" step={10000} value={b.revenue} onChange={(e) => set('revenue', Number(e.target.value))} /></Field>
            <Field label="Annual payroll"><input type="number" step={5000} value={b.payroll} onChange={(e) => set('payroll', Number(e.target.value))} /></Field>
            <Field label="Employees"><input type="number" min={0} value={b.employees} onChange={(e) => set('employees', Number(e.target.value))} /></Field>
            <Field label="Description of operations" className="span3"><textarea rows={2} value={b.description} onChange={(e) => set('description', e.target.value)} /></Field>
          </div>
        </>}
        {step === 1 && <>
          <div className="px-grid3">
            <Field label="Location address" required className="span2"><input value={b.address} onChange={(e) => set('address', e.target.value)} /></Field>
            <Field label="City" required><input value={b.city} onChange={(e) => set('city', e.target.value)} /></Field>
            <Field label="State"><select value={b.state} onChange={(e) => set('state', e.target.value)}>{STATES.map((st) => <option key={st}>{st}</option>)}</select></Field>
            <Field label="ZIP" required><input value={b.zip} onChange={(e) => set('zip', e.target.value.replace(/\D/g, '').slice(0, 5))} /></Field>
            <Field label="Occupied square feet" required><input type="number" step={100} value={b.squareFeet} onChange={(e) => set('squareFeet', Number(e.target.value))} /></Field>
            <Field label="Construction (ISO)"><select value={b.construction} onChange={(e) => set('construction', e.target.value as BusinessDetails['construction'])}>{['Frame', 'Joisted Masonry', 'Non-combustible', 'Masonry Non-combustible', 'Fire Resistive'].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Year built"><input type="number" value={b.yearBuilt} onChange={(e) => set('yearBuilt', Number(e.target.value))} /></Field>
            <Field label="Fire alarm"><select value={b.alarm} onChange={(e) => set('alarm', e.target.value as BusinessDetails['alarm'])}><option>None</option><option>Local</option><option>Central Station</option></select></Field>
          </div>
          <div className="px-checks inline"><label><input type="checkbox" checked={b.sprinklered} onChange={(e) => set('sprinklered', e.target.checked)} /> Fully sprinklered</label><label><input type="checkbox" checked={b.ownsBuilding} onChange={(e) => setB({ ...b, ownsBuilding: e.target.checked, buildingLimit: e.target.checked ? suggestedBuildingLimit(b) : 0 })} /> Insured owns the building</label></div>
          {b.ownsBuilding && <div className="estimate-card"><div><strong>Building valuation</strong><span>Estimated replacement cost: <b>{money(suggestedBuildingLimit(b))}</b></span></div><Field label="Building limit"><input type="number" step={5000} value={b.buildingLimit} onChange={(e) => set('buildingLimit', Number(e.target.value))} /></Field></div>}
        </>}
        {step === 2 && <>
          <div className="px-grid3">
            <Field label="Business personal property" required><input type="number" step={5000} value={b.bppLimit} onChange={(e) => set('bppLimit', Number(e.target.value))} /></Field>
            <Field label="General liability"><select value={b.glLimit} onChange={(e) => set('glLimit', e.target.value as BusinessDetails['glLimit'])}><option value="1M/2M">$1M occurrence / $2M aggregate</option><option value="2M/4M">$2M occurrence / $4M aggregate</option></select></Field>
            <Field label="Property deductible"><select value={b.propertyDeductible} onChange={(e) => set('propertyDeductible', Number(e.target.value))}>{[500, 1000, 2500, 5000].map((d) => <option key={d} value={d}>{money(d)}</option>)}</select></Field>
          </div>
          <div className="endorsements">
            {([['cyber', 'Cyber & data breach', 'Notification costs, forensics and liability after a data breach — $100,000.'], ['epli', 'Employment practices liability', 'Wrongful termination, discrimination and harassment claims — $100,000.'], ['hiredNonOwnedAuto', 'Hired & non-owned auto', 'Liability when employees drive personal or rented vehicles for business.'], ['equipmentBreakdown', 'Equipment breakdown', 'Mechanical and electrical breakdown of HVAC, refrigeration and equipment.'], ['employeeDishonesty', 'Employee dishonesty', 'Theft of money or property by employees — $25,000.']] as const).map(([key, title, text]) => <label key={key} className={`endorsement ${b[key] ? 'on' : ''}`}><input type="checkbox" checked={b[key]} onChange={(e) => set(key, e.target.checked)} /><span><strong>{title}</strong><small>{text}</small></span></label>)}
          </div>
        </>}
        {step === 3 && <>
          <table className="px-table breakdown"><tbody>{breakdown.lines.map((l) => <tr key={l.label}><td>{l.label}</td><td className="num">{money(l.amount)}</td></tr>)}{breakdown.discounts.map((l) => <tr key={l.label} className="discount"><td>{l.label}</td><td className="num">−{money(-l.amount)}</td></tr>)}<tr className="total"><td>Annual premium{breakdown.total === 500 ? ' (minimum premium)' : ''}</td><td className="num">{money(breakdown.total)}</td></tr></tbody></table>
          <h2 className="section-h">Payment plan</h2>
          <div className="plan-grid">{(['Annual', 'Quarterly', '9 Month', 'Monthly'] as PayPlan[]).map((plan) => { const sch = installmentSchedule(breakdown.total, plan, terms.autoPay); return <label key={plan} className={`plan ${terms.payPlan === plan ? 'on' : ''}`}><input type="radio" checked={terms.payPlan === plan} onChange={() => setTerms({ ...terms, payPlan: plan })} /><strong>{plan}</strong><span>{sch.count} × {money(sch.perPayment, true)}</span></label>; })}</div>
          <label className="px-checks autopay"><input type="checkbox" checked={terms.autoPay} onChange={(e) => setTerms({ ...terms, autoPay: e.target.checked })} /> ERIExpressPay® automatic payments — installment fees waived</label>
        </>}
        {step === 4 && <>
          <div className="px-grid3">
            <Field label="Effective date" required><input type="date" min={today()} value={terms.effective} onChange={(e) => setTerms({ ...terms, effective: e.target.value })} /></Field>
            <Field label="Agent number"><select value={terms.agentNumber} onChange={(e) => setTerms({ ...terms, agentNumber: e.target.value })}>{AGENT.agentNumbers.map((a) => <option key={a}>{a}</option>)}</select></Field>
            <div />
            <Field label="Business phone" required><input value={b.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(608) 555-0100" /></Field>
            <Field label="Business email" required><input value={b.email} onChange={(e) => set('email', e.target.value)} /></Field>
          </div>
          <h2 className="section-h">ERIExpressPay® — initial payment {money(s.perPayment, true)}</h2>
          <div className="px-grid3"><Field label="Routing number"><input value={bind.routing} inputMode="numeric" onChange={(e) => setBind({ ...bind, routing: e.target.value.replace(/\D/g, '').slice(0, 9), verified: false })} /></Field><Field label="Account number"><input value={bind.account} inputMode="numeric" onChange={(e) => setBind({ ...bind, account: e.target.value.replace(/\D/g, '').slice(0, 17), verified: false })} /></Field><button type="button" className="px-btn ghost align-end" onClick={() => setBind({ ...bind, verified: /^\d{9}$/.test(bind.routing) && bind.account.length >= 4 })}>Verify account</button></div>
          {bind.verified ? <div className="px-note good"><CheckCircle2 size={14} /> Account verified: Checking ••{bind.account.slice(-4)}</div> : <p className="px-muted">Test routing number: 075000022.</p>}
          <div className="px-checks"><label><input type="checkbox" checked={bind.signed} onChange={(e) => setBind({ ...bind, signed: e.target.checked })} /> Commercial application signed by an authorized officer of {b.businessName || 'the business'}</label><label><input type="checkbox" checked={bind.disclosures} onChange={(e) => setBind({ ...bind, disclosures: e.target.checked })} /> Terrorism (TRIA) disclosure and privacy notice provided</label></div>
        </>}
        {errors.length > 0 && <ul className="quote-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        <div className="px-form-actions"><button type="button" className="px-btn ghost" onClick={() => (step === 0 ? window.history.back() : setStep(step - 1))}>{step === 0 ? 'Cancel' : 'Previous'}</button>{step < 4 ? <button type="button" className="px-btn" onClick={next}>Continue</button> : <button type="button" className="px-btn" onClick={issue}>Bind &amp; issue</button>}</div>
      </Panel>
      <aside className="wizard-aside">
        <div className="product-card aside-card"><h3>Applicant</h3><strong><Store size={13} /> {b.businessName || 'New business'}</strong><span>{[b.ownerFirst, b.ownerLast].filter(Boolean).join(' ') || 'Owner'}</span>{cls && <span>{cls.label}</span>}{b.city && <span><Building2 size={12} /> {b.city}, {b.state}</span>}{cls && (cls.appetite === 'yes' && !needsReferral ? <span className="px-badge good">In appetite</span> : <StatusBadge status={cls.appetite === 'no' ? 'Declined' : uw === 'approved' ? 'Approved' : 'Referred'} />)}</div>
        <div className="product-card aside-card premium-card"><h3>Estimated annual premium</h3><div className="premium-total">{cls && !blocked ? money(breakdown.total) : '—'}</div><small>Illustrative rating — not ERIE filed rates.</small></div>
      </aside>
    </div>
  </main></PortalLayout>;
}
