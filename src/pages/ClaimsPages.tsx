import { ChangeEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Car, Check, CheckCircle2, Mail, Paperclip, Phone, Plus, Shield } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { Empty, Field, PageTitle, Panel, StatusBadge } from '@/components/ui';
import { fullName, today, usePortal } from '@/data/store';
import { money } from '@/lib/rating';
import type { ClaimStatus } from '@/data/types';

const lifecycle: ClaimStatus[] = ['Reported', 'Assigned', 'Inspection', 'Estimate Review', 'Repair In Progress', 'Payment Issued', 'Closed'];
const autoLossTypes = ['Auto — Collision', 'Auto — Comprehensive (Glass)', 'Auto — Comprehensive (Theft)', 'Auto — Comprehensive (Animal)', 'Auto — Comprehensive (Weather)', 'Auto — Liability (other party)'];
const homeLossTypes = ['Home — Wind/Hail', 'Home — Water Damage', 'Home — Fire/Smoke', 'Home — Theft/Burglary', 'Home — Liability (injury on premises)', 'Home — Lightning/Power Surge'];
const DRP_SHOPS = ['Crawford County Collision (Direct Repair Program)', 'Madison Auto Body (Direct Repair Program)', 'Waukesha Collision Center (Direct Repair Program)', "Customer's choice of shop"];

export function ClaimsListPage() {
  const { claims, customers } = usePortal();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'all';
  const [query, setQuery] = useState(params.get('q') ?? '');
  const rows = claims.filter((c) => {
    if (status === 'open' && c.status === 'Closed') return false;
    if (status === 'closed' && c.status !== 'Closed') return false;
    const customer = customers.find((x) => x.id === c.customerId);
    return `${c.number} ${c.policyNumber} ${customer ? fullName(customer) : ''} ${c.lossType}`.toLowerCase().includes(query.toLowerCase().trim());
  });
  const exact = claims.find((c) => c.number.toLowerCase() === query.trim().toLowerCase());
  const open = claims.filter((c) => c.status !== 'Closed');
  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: 'Claims' }]} title="Claims Center" subtitle="Claims can be reported 24/7 here or at (800) 367-3743." actions={<Link className="px-btn" to="/claims/new"><Plus size={14} /> Report a claim</Link>} />
    <div className="stat-row cards"><div><span>Open claims</span><strong>{open.length}</strong></div><div><span>Reserves outstanding</span><strong>{money(open.reduce((t, c) => t + Math.max(0, c.reserve - c.paid), 0))}</strong></div><div><span>Paid this year</span><strong>{money(claims.reduce((t, c) => t + c.paid, 0))}</strong></div><div><span>Awaiting inspection</span><strong>{claims.filter((c) => c.status === 'Inspection').length}</strong></div></div>
    <Panel>
      <div className="px-toolbar"><input className="px-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Claim #, policy #, insured name" aria-label="Search claims" /><div className="px-chips">{[['all', 'All'], ['open', 'Open'], ['closed', 'Closed']].map(([id, label]) => <button key={id} type="button" className={status === id ? 'on' : ''} onClick={() => setParams(id === 'all' ? {} : { status: id })}>{label}</button>)}</div></div>
      {exact && <div className="px-note">Exact match: <Link to={`/claims/${exact.number}`}>{exact.number}</Link></div>}
      {rows.length === 0 ? <Empty>No claims found.</Empty> : <div className="px-table-wrap"><table className="px-table"><thead><tr><th>Claim #</th><th>Insured</th><th>Policy</th><th>Loss date</th><th>Type</th><th>Adjuster</th><th>Paid</th><th>Status</th></tr></thead><tbody>{rows.map((c) => { const customer = customers.find((x) => x.id === c.customerId); return <tr key={c.number} className="clickable" onClick={() => navigate(`/claims/${c.number}`)}><td><Link className="mono" to={`/claims/${c.number}`} onClick={(e) => e.stopPropagation()}>{c.number}</Link></td><td>{customer ? fullName(customer) : '—'}</td><td><Link className="mono" to={`/policies/${c.policyNumber}`} onClick={(e) => e.stopPropagation()}>{c.policyNumber}</Link></td><td>{c.lossDate}</td><td>{c.lossType}</td><td>{c.adjuster.name}</td><td>{money(c.paid)}</td><td><StatusBadge status={c.status} /></td></tr>; })}</tbody></table></div>}
    </Panel>
  </main></PortalLayout>;
}

export function ClaimReportPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { policies, customers, addClaim, notify } = usePortal();
  const [step, setStep] = useState(0);
  const [policyNumber, setPolicyNumber] = useState(params.get('policy') ?? '');
  const [lookup, setLookup] = useState('');
  const preselected = policies.find((p) => p.number === params.get('policy'));
  const [form, setForm] = useState({ lossDate: today(), lossTime: '12:00', lossType: '', location: '', description: '', injuries: false, policeReport: '', otherParty: '', vehicleId: preselected?.vehicles[0]?.id ?? '', drivable: true, repairShop: DRP_SHOPS[0], rental: true, mitigation: false, contactPhone: customers.find((c) => c.id === preselected?.customerId)?.phone ?? '' });
  const [attachments, setAttachments] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const customerFilter = params.get('customer');
  const eligible = policies.filter((p) => p.status !== 'Cancelled' && p.type !== 'Life' && (!customerFilter || p.customerId === customerFilter) && `${p.number} ${fullName(customers.find((c) => c.id === p.customerId) ?? { firstName: '', lastName: '' })}`.toLowerCase().includes(lookup.toLowerCase()));
  const policy = policies.find((p) => p.number === policyNumber);
  const customer = policy ? customers.find((c) => c.id === policy.customerId) : undefined;
  const isAuto = policy?.type === 'Auto';
  const lossTypes = isAuto ? autoLossTypes : homeLossTypes;
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm({ ...form, [key]: value });
  const steps = ['Policy', 'Loss details', isAuto ? 'Vehicle & repair' : 'Damage & mitigation', 'Review & submit'];

  const validate = () => {
    const problems: string[] = [];
    if (step === 0 && !policy) problems.push('Select the policy the loss is reported under.');
    if (step === 1) {
      if (!form.lossType) problems.push('Select the type of loss.');
      if (form.lossDate > today()) problems.push('Loss date cannot be in the future.');
      if (!form.location.trim()) problems.push('Enter where the loss occurred.');
      if (form.description.trim().length < 15) problems.push('Describe what happened (at least 15 characters).');
    }
    if (step === 2 && isAuto && !form.vehicleId) problems.push('Select the involved vehicle.');
    return problems;
  };
  const next = () => {
    const problems = validate();
    setErrors(problems);
    if (problems.length) return;
    // A loss outside the policy period can still be reported; coverage is decided by the adjuster.
    if (step === 1 && policy && (form.lossDate < policy.effective || form.lossDate > policy.expiration)) notify(`Loss date is outside the policy period (${policy.effective} – ${policy.expiration}). Coverage will be reviewed.`, 'info');
    setStep(step + 1);
  };
  const submit = () => {
    if (!policy) return;
    const vehicle = policy.vehicles.find((v) => v.id === form.vehicleId);
    const number = addClaim({ policyNumber: policy.number, customerId: policy.customerId, lossDate: form.lossDate, lossType: form.lossType, location: form.location, description: `${form.description}${vehicle ? ` Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}${form.drivable ? '' : ' (not drivable)'}.` : ''}${form.otherParty ? ` Other party: ${form.otherParty}.` : ''}`, injuries: form.injuries, policeReport: form.policeReport, repairShop: isAuto ? form.repairShop : form.mitigation ? 'Mitigation vendor requested' : '', rental: isAuto && form.rental ? 'Rental requested — Roadside & Rentals / transportation expense' : '', deductible: isAuto ? (form.lossType.includes('Collision') ? policy.autoCoverages?.collisionDeductible ?? 500 : policy.autoCoverages?.comprehensiveDeductible ?? 250) : policy.homeCoverages?.deductible ?? 1000, attachments });
    notify(`Claim ${number} reported. An adjuster will contact the customer within 24 hours.`);
    navigate(`/claims/${number}?new=1`);
  };
  const onFiles = (event: ChangeEvent<HTMLInputElement>) => setAttachments([...attachments, ...Array.from(event.target.files ?? []).map((f) => f.name)]);

  return <PortalLayout><main className="px-page narrow">
    <PageTitle crumbs={[{ label: 'Claims', to: '/claims' }, { label: 'Report a claim' }]} title="First Notice of Loss" subtitle="Report the loss as soon as possible. Emergency? Advise the customer to call 911 first." />
    <ol className="wizard-steps compact">{steps.map((s, i) => <li key={s} className={`${i === step ? 'current' : ''} ${i < step ? 'done' : ''}`}><button type="button" disabled={i > step} onClick={() => setStep(i)}><span>{i < step ? <Check size={12} /> : i + 1}</span>{s}</button></li>)}</ol>
    <Panel>
      {step === 0 && <><Field label="Find policy"><input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="Policy number or insured name" /></Field><div className="select-list">{eligible.map((p) => { const c = customers.find((x) => x.id === p.customerId); return <label key={p.number} className={policyNumber === p.number ? 'on' : ''}><input type="radio" name="policy" checked={policyNumber === p.number} onChange={() => { setPolicyNumber(p.number); setForm({ ...form, lossType: '', vehicleId: p.vehicles[0]?.id ?? '', contactPhone: c?.phone ?? '' }); }} /><span><strong>{p.type} · {p.number}</strong><small>{c ? fullName(c) : ''} · {p.description}</small></span><StatusBadge status={p.status} /></label>; })}{eligible.length === 0 && <Empty>No matching policies.</Empty>}</div></>}
      {step === 1 && <div className="px-grid3">
        <Field label="Date of loss" required><input type="date" value={form.lossDate} max={today()} onChange={(e) => set('lossDate', e.target.value)} /></Field>
        <Field label="Approximate time"><input type="time" value={form.lossTime} onChange={(e) => set('lossTime', e.target.value)} /></Field>
        <Field label="Type of loss" required><select value={form.lossType} onChange={(e) => set('lossType', e.target.value)}><option value="">-- Select --</option>{lossTypes.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Location of loss" required className="span3"><input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder={isAuto ? 'Street / intersection, city' : customer?.address} /></Field>
        <Field label="What happened?" required className="span3"><textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Police / fire report #"><input value={form.policeReport} onChange={(e) => set('policeReport', e.target.value)} /></Field>
        <Field label="Other party (name, carrier)" className="span2"><input value={form.otherParty} onChange={(e) => set('otherParty', e.target.value)} /></Field>
        <label className="px-checks span3"><input type="checkbox" checked={form.injuries} onChange={(e) => set('injuries', e.target.checked)} /> Anyone injured?</label>
      </div>}
      {step === 2 && (isAuto ? <div className="px-grid2">
        <Field label="Involved vehicle" required><select value={form.vehicleId} onChange={(e) => set('vehicleId', e.target.value)}><option value="">-- Select --</option>{policy?.vehicles.map((v) => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>)}</select></Field>
        <Field label="Repair shop"><select value={form.repairShop} onChange={(e) => set('repairShop', e.target.value)}>{DRP_SHOPS.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <label className="px-checks"><input type="checkbox" checked={form.drivable} onChange={(e) => set('drivable', e.target.checked)} /> Vehicle is drivable</label>
        <label className="px-checks"><input type="checkbox" checked={form.rental} onChange={(e) => set('rental', e.target.checked)} /> Customer needs a rental{policy?.autoCoverages?.transportationExpense ? ' (transportation expenses on policy)' : ' (verify transportation expense coverage)'}</label>
        <div className="px-note span2"><Car size={14} /> Direct Repair Program shops estimate, share with ERIE and start repairs once approved — the fastest path for most collision claims.</div>
      </div> : <div className="px-grid2">
        <label className="px-checks span2"><input type="checkbox" checked={form.mitigation} onChange={(e) => set('mitigation', e.target.checked)} /> Request emergency mitigation (water extraction, board-up, tarping)</label>
        <div className="px-note span2">Remind the customer to prevent further damage and keep receipts — reasonable mitigation expenses are covered.</div>
      </div>)}
      {step === 2 && <div className="attach"><label className="px-btn ghost"><Paperclip size={14} /> Attach photos / documents<input type="file" multiple hidden onChange={onFiles} /></label>{attachments.map((a) => <span key={a} className="policy-pill">{a}</span>)}</div>}
      {step === 3 && policy && <dl className="px-dl two"><dt>Policy</dt><dd>{policy.type} {policy.number}</dd><dt>Insured</dt><dd>{customer ? fullName(customer) : ''}</dd><dt>Loss</dt><dd>{form.lossType} on {form.lossDate} at {form.lossTime}</dd><dt>Location</dt><dd>{form.location}</dd><dt>Description</dt><dd>{form.description}</dd><dt>Injuries</dt><dd>{form.injuries ? 'Yes — bodily injury adjuster will be assigned' : 'No'}</dd>{isAuto && <><dt>Vehicle</dt><dd>{policy.vehicles.find((v) => v.id === form.vehicleId)?.model}</dd><dt>Repair</dt><dd>{form.repairShop}</dd><dt>Rental</dt><dd>{form.rental ? 'Requested' : 'Not needed'}</dd></>}<dt>Attachments</dt><dd>{attachments.join(', ') || 'None'}</dd><dt>Deductible</dt><dd>{money(isAuto ? (form.lossType.includes('Collision') ? policy.autoCoverages?.collisionDeductible ?? 500 : policy.autoCoverages?.comprehensiveDeductible ?? 250) : policy.homeCoverages?.deductible ?? 1000)}</dd></dl>}
      {errors.length > 0 && <ul className="quote-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      <div className="px-form-actions"><button type="button" className="px-btn ghost" onClick={() => (step === 0 ? navigate('/claims') : setStep(step - 1))}>{step === 0 ? 'Cancel' : 'Previous'}</button>{step < 3 ? <button type="button" className="px-btn" onClick={next}>Continue</button> : <button type="button" className="px-btn" onClick={submit}><Shield size={14} /> Submit claim</button>}</div>
    </Panel>
  </main></PortalLayout>;
}

export function ClaimDetailPage() {
  const { number = '' } = useParams();
  const [params] = useSearchParams();
  const { claims, customers, updateClaim, notify } = usePortal();
  const claim = claims.find((c) => c.number === number);
  const [note, setNote] = useState('');
  const customer = useMemo(() => customers.find((c) => c.id === claim?.customerId), [customers, claim]);
  if (!claim) return <PortalLayout><main className="px-page"><PageTitle crumbs={[{ label: 'Claims', to: '/claims' }]} title="Claim not found" /><Panel><Empty><Link to="/claims">Back to Claims Center</Link></Empty></Panel></main></PortalLayout>;
  const stage = lifecycle.indexOf(claim.status);
  const advance = () => {
    const nextStatus = lifecycle[Math.min(lifecycle.length - 1, stage + 1)];
    const patch: Partial<typeof claim> = { status: nextStatus };
    let text = `Status updated to ${nextStatus}.`;
    if (nextStatus === 'Inspection') text = 'Inspection scheduled with the customer.';
    if (nextStatus === 'Estimate Review') { patch.reserve = claim.reserve || 4800; text = `Estimate received. Reserve set at ${money(patch.reserve)}.`; }
    if (nextStatus === 'Repair In Progress') text = `Repairs authorized at ${claim.repairShop || 'selected vendor'}.`;
    if (nextStatus === 'Payment Issued') { const amount = Math.max(0, (claim.reserve || 4800) - claim.deductible - claim.paid); patch.paid = claim.paid + amount; patch.payments = [...claim.payments, { date: today(), payee: claim.repairShop || (customer ? fullName(customer) : 'Insured'), amount, type: 'Settlement (less deductible)' }]; text = `Payment of ${money(amount)} issued via ERIEpay.`; }
    if (nextStatus === 'Closed') text = 'Claim closed. Subrogation reviewed.';
    updateClaim(claim.number, { ...patch, notes: [...claim.notes, { date: today(), author: claim.adjuster.name, text }] });
    notify(`Adjuster update: ${text}`, 'info');
  };
  const addNote = () => { if (!note.trim()) return; updateClaim(claim.number, {}, note.trim()); setNote(''); notify('Note added to claim file.'); };
  const onFiles = (event: ChangeEvent<HTMLInputElement>) => { const names = Array.from(event.target.files ?? []).map((f) => f.name); if (!names.length) return; updateClaim(claim.number, { attachments: [...claim.attachments, ...names] }, `Uploaded ${names.join(', ')}`); notify(`${names.length} file(s) uploaded.`); };

  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: 'Claims', to: '/claims' }, { label: claim.number }]} title={`Claim ${claim.number}`} subtitle={<><StatusBadge status={claim.status} /> {claim.lossType} · Loss {claim.lossDate} · Reported {claim.reportedDate}</>} actions={claim.status !== 'Closed' && <button type="button" className="px-btn ghost" onClick={advance} title="Simulates the next adjuster action in this demo">Request adjuster update</button>} />
    {params.get('new') && <div className="wizard-banner good"><CheckCircle2 size={16} /> Claim reported. {claim.adjuster.name} has been assigned and will contact the customer within 24 hours.</div>}
    <Panel><ol className="claim-track">{lifecycle.map((s, i) => <li key={s} className={i < stage ? 'done' : i === stage ? 'current' : ''}><span>{i < stage ? <Check size={12} /> : i + 1}</span>{s}</li>)}</ol></Panel>
    <div className="px-cols">
      <div className="px-main-col">
        <Panel title="Loss details"><dl className="px-dl two"><dt>Insured</dt><dd>{customer ? <Link to={`/customers/${customer.id}`}>{fullName(customer)}</Link> : '—'}</dd><dt>Policy</dt><dd><Link className="mono" to={`/policies/${claim.policyNumber}`}>{claim.policyNumber}</Link></dd><dt>Location</dt><dd>{claim.location}</dd><dt>Description</dt><dd>{claim.description}</dd><dt>Injuries</dt><dd>{claim.injuries ? 'Yes' : 'No'}</dd><dt>Police report</dt><dd>{claim.policeReport || '—'}</dd><dt>Repair / vendor</dt><dd>{claim.repairShop || '—'}</dd><dt>Rental</dt><dd>{claim.rental || '—'}</dd></dl></Panel>
        <Panel title="Claim notes"><ul className="px-timeline">{claim.notes.map((n, i) => <li key={i}><strong>{n.date}</strong> {n.text} <small>— {n.author}</small></li>)}</ul><div className="note-box"><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the adjuster (visible in the claim file)" aria-label="New note" /><button type="button" className="px-btn" onClick={addNote}>Add note</button></div></Panel>
        <Panel title="Payments">{claim.payments.length === 0 ? <Empty>No payments issued yet.</Empty> : <table className="px-table"><thead><tr><th>Date</th><th>Payee</th><th>Type</th><th>Amount</th></tr></thead><tbody>{claim.payments.map((p, i) => <tr key={i}><td>{p.date}</td><td>{p.payee}</td><td>{p.type}</td><td>{money(p.amount)}</td></tr>)}</tbody></table>}</Panel>
      </div>
      <div className="px-side-col">
        <Panel title="Claims representative"><div className="adjuster"><strong>{claim.adjuster.name}</strong><a href={`tel:${claim.adjuster.phone.replace(/\D/g, '').slice(0, 11)}`}><Phone size={13} /> {claim.adjuster.phone}</a><a href={`mailto:${claim.adjuster.email}?subject=${encodeURIComponent(`Claim ${claim.number}`)}`}><Mail size={13} /> {claim.adjuster.email}</a></div></Panel>
        <Panel title="Financials"><div className="stat-pair"><div><span>Reserve</span><strong>{money(claim.reserve)}</strong></div><div><span>Paid to date</span><strong>{money(claim.paid)}</strong></div></div><p className="px-muted">Deductible: {money(claim.deductible)}</p></Panel>
        <Panel title="Attachments"><ul className="px-list">{claim.attachments.map((a) => <li key={a}><Paperclip size={12} /> {a}</li>)}{claim.attachments.length === 0 && <li className="px-muted">None</li>}</ul><label className="px-btn ghost wide"><Paperclip size={14} /> Upload files<input type="file" multiple hidden onChange={onFiles} /></label></Panel>
      </div>
    </div>
  </main></PortalLayout>;
}
