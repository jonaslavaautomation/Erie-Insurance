import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Ban, CreditCard, FileText, Pencil, Printer, RotateCcw, Shield } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { Empty, Field, Modal, PageTitle, Panel, StatusBadge, Tabs } from '@/components/ui';
import { DriverModal, VehicleModal } from '@/pages/QuoteWizard';
import { policyIcon } from '@/pages/CustomerPages';
import { addDays, fullName, today, usePortal } from '@/data/store';
import { AGENT } from '@/data/seed';
import { money, rateAuto, rateHome } from '@/lib/rating';
import type { AutoCoverages, Driver, HomeCoverages, Policy, PolicyDocument, Vehicle } from '@/data/types';

const allTabs = ['Overview', 'Coverages', 'Drivers & Vehicles', 'Property', 'Billing', 'Claims', 'Documents', 'History'] as const;
type PolicyTab = (typeof allTabs)[number];

function reRate(policy: Policy, state: string, multiPolicy: boolean) {
  if (policy.type === 'Auto' && policy.autoCoverages) return rateAuto(state, policy.drivers, policy.vehicles, policy.autoCoverages, { multiPolicy, payPlan: policy.payPlan, autoPay: policy.autoPay }).total;
  if (policy.type === 'Home' && policy.property && policy.homeCoverages) return rateHome(state, policy.property, policy.homeCoverages, { multiPolicy, earlyQuote: false, payPlan: policy.payPlan }).total;
  return policy.premium;
}

export default function PolicyPage() {
  const { number = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { policies, customers, billing, claims, cancelPolicy, reinstatePolicy, notify } = usePortal();
  const policy = policies.find((p) => p.number === number);
  const [tab, setTab] = useState<PolicyTab>('Overview');
  const [modal, setModal] = useState<'change' | 'cancel' | 'id' | null>(null);
  const [doc, setDoc] = useState<PolicyDocument | null>(null);

  useEffect(() => { if (params.get('doc') === 'id') { setModal('id'); setParams({}, { replace: true }); } }, [params, setParams]);

  if (!policy) return <PortalLayout><main className="px-page"><PageTitle crumbs={[{ label: 'Customers', to: '/customers' }]} title="Policy not found" /><Panel><Empty>No policy {number}. <Link to="/customers?by=policy">Search by policy number</Link></Empty></Panel></main></PortalLayout>;

  const customer = customers.find((c) => c.id === policy.customerId);
  const account = billing.find((b) => b.policyNumber === policy.number);
  const policyClaims = claims.filter((c) => c.policyNumber === policy.number);
  const tabs = allTabs.filter((t) => (t === 'Drivers & Vehicles' ? policy.type === 'Auto' : t === 'Property' ? policy.type === 'Home' : true));
  const Icon = policyIcon[policy.type];
  const canChange = policy.status !== 'Cancelled' && (policy.type === 'Auto' || policy.type === 'Home');

  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: 'Customers', to: '/customers' }, ...(customer ? [{ label: fullName(customer), to: `/customers/${customer.id}` }] : []), { label: policy.number }]} title={`${policy.type} Policy ${policy.number}`} subtitle={<><StatusBadge status={policy.status} /> {policy.description} · Term {policy.effective} – {policy.expiration}</>} actions={<>
      {canChange && <button type="button" className="px-btn ghost" onClick={() => setModal('change')}><Pencil size={14} /> Policy change</button>}
      {policy.type === 'Auto' && <button type="button" className="px-btn ghost" onClick={() => setModal('id')}><Printer size={14} /> ID cards</button>}
      <Link className="px-btn ghost" to={`/claims/new?policy=${policy.number}`}><Shield size={14} /> Report claim</Link>
      <Link className="px-btn" to={`/billing/pay?policy=${policy.number}`}><CreditCard size={14} /> Make payment</Link>
    </>} />
    <Tabs tabs={tabs} active={tab} onChange={setTab} />

    {tab === 'Overview' && <div className="px-cols">
      <div className="px-main-col">
        <Panel title={<><Icon size={16} /> Policy summary</>}><dl className="px-dl two"><dt>Named insured</dt><dd>{customer ? <Link to={`/customers/${customer.id}`}>{fullName(customer)}</Link> : '—'}</dd><dt>Mailing address</dt><dd>{customer ? `${customer.address}, ${customer.city}, ${customer.state} ${customer.zip}` : '—'}</dd><dt>Annual premium</dt><dd>{money(policy.premium)}</dd><dt>Payment plan</dt><dd>{policy.payPlan}{policy.autoPay ? ' · AutoPay (fees waived)' : ''}</dd><dt>Producer</dt><dd>{AGENT.name} · {policy.agentNumber}</dd><dt>Underwriting company</dt><dd>{policy.type === 'Life' ? 'Erie Family Life Insurance Company' : 'Erie Insurance Exchange'}</dd>{policy.type === 'Auto' && <><dt>Rate Lock</dt><dd>{policy.autoCoverages?.rateLock ? 'ERIE Rate Lock® active' : 'Not elected'}</dd></>}</dl></Panel>
        <Panel title="Recent activity" actions={<button type="button" className="link-button" onClick={() => setTab('History')}>Full history</button>}><ul className="px-timeline">{policy.history.slice(0, 4).map((h, i) => <li key={i}><strong>{h.date}</strong> {h.text} <small>— {h.by}</small></li>)}</ul></Panel>
      </div>
      <div className="px-side-col">
        <Panel title="Billing" actions={<button type="button" className="link-button" onClick={() => setTab('Billing')}>Details</button>}>{account ? <><div className="stat-pair"><div><span>Minimum due</span><strong>{money(account.minimumDue, true)}</strong></div><div><span>Due date</span><strong>{account.nextDueDate}</strong></div></div><Link className="px-btn wide" to={`/billing/pay?policy=${policy.number}`}>Pay now</Link></> : <Empty>No billing account.</Empty>}</Panel>
        <Panel title="Policy actions"><div className="px-action-list">
          {canChange && <button type="button" onClick={() => setModal('change')}><Pencil size={14} /> Request policy change</button>}
          {policy.type === 'Auto' && <button type="button" onClick={() => setModal('id')}><Printer size={14} /> Print ID cards</button>}
          <Link to={`/billing/autopay?policy=${policy.number}`}><CreditCard size={14} /> {policy.autoPay ? 'Manage AutoPay' : 'Enroll in AutoPay'}</Link>
          <Link to={`/resources/certificates?policy=${policy.number}`}><FileText size={14} /> Certificate of insurance</Link>
          {policy.status === 'Active' && <button type="button" className="danger" onClick={() => setModal('cancel')}><Ban size={14} /> Cancel policy</button>}
          {(policy.status === 'Pending Cancel' || policy.status === 'Cancelled') && <button type="button" onClick={() => { reinstatePolicy(policy.number); notify(`Policy ${policy.number} reinstated.`); }}><RotateCcw size={14} /> Reinstate policy</button>}
        </div></Panel>
      </div>
    </div>}

    {tab === 'Coverages' && <Panel title="Coverages & limits" actions={canChange && <button type="button" className="link-button" onClick={() => setModal('change')}>Change coverages</button>}><CoverageTable policy={policy} /></Panel>}

    {tab === 'Drivers & Vehicles' && <><Panel title="Drivers" actions={canChange && <button type="button" className="link-button" onClick={() => setModal('change')}>Add / change driver</button>}><table className="px-table"><thead><tr><th>Driver</th><th>Relationship</th><th>DOB</th><th>License</th><th>Violations</th><th>Accidents</th></tr></thead><tbody>{policy.drivers.map((d) => <tr key={d.id}><td>{d.firstName} {d.lastName}</td><td>{d.relationship}</td><td>{d.dob}</td><td>{d.licenseState} {d.licenseNumber}</td><td>{d.violations}</td><td>{d.accidents}</td></tr>)}</tbody></table></Panel>
      <Panel title="Vehicles" actions={canChange && <button type="button" className="link-button" onClick={() => setModal('change')}>Add / replace vehicle</button>}><table className="px-table"><thead><tr><th>Vehicle</th><th>VIN</th><th>Use</th><th>Garaging ZIP</th><th>Lienholder</th></tr></thead><tbody>{policy.vehicles.map((v) => <tr key={v.id}><td>{v.year} {v.make} {v.model}</td><td className="mono">{v.vin}</td><td>{v.use}</td><td>{v.garagingZip}</td><td>{v.lienholder || '—'}</td></tr>)}</tbody></table></Panel></>}

    {tab === 'Property' && policy.property && <Panel title="Dwelling"><dl className="px-dl two"><dt>Dwelling type</dt><dd>{policy.property.dwellingType}</dd><dt>Year built</dt><dd>{policy.property.yearBuilt}</dd><dt>Square feet</dt><dd>{policy.property.squareFeet.toLocaleString()}</dd><dt>Construction</dt><dd>{policy.property.construction}</dd><dt>Roof</dt><dd>{policy.property.roofType}, installed {policy.property.roofYear}</dd><dt>Heating</dt><dd>{policy.property.heating}</dd><dt>Protection class</dt><dd>{policy.property.protectionClass}</dd><dt>Protective devices</dt><dd>{[policy.property.smokeAlarms && 'Smoke alarms', policy.property.burglarAlarm && 'Burglar alarm', policy.property.sprinklers && 'Sprinklers'].filter(Boolean).join(', ') || 'None'}</dd></dl></Panel>}

    {tab === 'Billing' && <Panel title="Billing account" actions={<Link to={`/billing/pay?policy=${policy.number}`}>Make a payment</Link>}>{account ? <><div className="stat-row"><div><span>Remaining term balance</span><strong>{money(account.balance, true)}</strong></div><div><span>Minimum due</span><strong>{money(account.minimumDue, true)}</strong></div><div><span>Next due</span><strong>{account.nextDueDate}</strong></div><div><span>AutoPay</span><strong>{policy.autoPay ? 'Enrolled' : <Link to={`/billing/autopay?policy=${policy.number}`}>Enroll</Link>}</strong></div></div><h3 className="section-h">Payment history</h3>{account.payments.length === 0 ? <Empty>No payments received this term.</Empty> : <table className="px-table"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Confirmation</th></tr></thead><tbody>{account.payments.map((p) => <tr key={p.id}><td>{p.date}</td><td>{money(p.amount, true)}</td><td>{p.method}</td><td className="mono">{p.confirmation}</td></tr>)}</tbody></table>}</> : <Empty>No billing account.</Empty>}</Panel>}

    {tab === 'Claims' && <Panel title="Claims" actions={<Link to={`/claims/new?policy=${policy.number}`}>Report a claim</Link>}>{policyClaims.length === 0 ? <Empty>No claims on this policy.</Empty> : <table className="px-table"><thead><tr><th>Claim #</th><th>Loss date</th><th>Type</th><th>Adjuster</th><th>Status</th></tr></thead><tbody>{policyClaims.map((c) => <tr key={c.number}><td><Link className="mono" to={`/claims/${c.number}`}>{c.number}</Link></td><td>{c.lossDate}</td><td>{c.lossType}</td><td>{c.adjuster.name}</td><td><StatusBadge status={c.status} /></td></tr>)}</tbody></table>}</Panel>}

    {tab === 'Documents' && <Panel title="Documents">{policy.documents.length === 0 ? <Empty>No documents.</Empty> : <table className="px-table"><thead><tr><th>Document</th><th>Type</th><th>Date</th><th /></tr></thead><tbody>{policy.documents.map((d, i) => <tr key={`${d.name}-${i}`} className="clickable" onClick={() => (d.kind === 'ID Card' ? setModal('id') : setDoc(d))}><td><FileText size={14} /> {d.name}</td><td>{d.kind}</td><td>{d.date}</td><td><button type="button" className="link-button">View</button></td></tr>)}</tbody></table>}</Panel>}

    {tab === 'History' && <Panel title="Transaction history"><ul className="px-timeline">{policy.history.map((h, i) => <li key={i}><strong>{h.date}</strong> {h.text} <small>— {h.by}</small></li>)}</ul></Panel>}

    {modal === 'change' && <PolicyChangeModal policy={policy} state={customer?.state ?? 'WI'} onClose={() => setModal(null)} />}
    {modal === 'cancel' && <CancelModal policy={policy} onClose={() => setModal(null)} onConfirm={(reason, date) => { cancelPolicy(policy.number, reason, date); notify(`Cancellation submitted for ${policy.number} effective ${date}.`, 'info'); setModal(null); }} />}
    {modal === 'id' && <IdCardModal policy={policy} insured={customer ? fullName(customer) : ''} onClose={() => setModal(null)} />}
    {doc && <DocumentModal policy={policy} doc={doc} insured={customer ? `${fullName(customer)}, ${customer.address}, ${customer.city}, ${customer.state} ${customer.zip}` : ''} onClose={() => setDoc(null)} />}
  </main></PortalLayout>;
}

function CoverageTable({ policy }: { policy: Policy }) {
  const a = policy.autoCoverages;
  const h = policy.homeCoverages;
  if (a) return <table className="px-table"><thead><tr><th>Coverage</th><th>Limit / deductible</th></tr></thead><tbody>
    <tr><td>Bodily injury liability</td><td>${a.bodilyInjury.replace('/', 'K / $')}K</td></tr><tr><td>Property damage liability</td><td>${a.propertyDamage}</td></tr><tr><td>Uninsured / underinsured motorists</td><td>${a.uninsuredMotorist.replace('/', 'K / $')}K</td></tr><tr><td>Medical payments / first party benefits</td><td>{a.medicalPayments === 'None' ? 'Not elected' : `$${a.medicalPayments}`}</td></tr><tr><td>Comprehensive</td><td>${a.comprehensiveDeductible} deductible</td></tr><tr><td>Collision</td><td>${a.collisionDeductible} deductible</td></tr>
    <tr><td>ERIE Rate Lock®</td><td>{a.rateLock ? 'Included' : '—'}</td></tr><tr><td>ERIE Auto Plus®</td><td>{a.autoPlus ? 'Included — diminishing deductible active' : 'Not elected'}</td></tr><tr><td>Roadside & Rentals</td><td>{a.roadsideRentals ? 'Included' : 'Not elected'}</td></tr><tr><td>New Auto Security</td><td>{a.newAutoSecurity ? 'Included' : 'Not elected'}</td></tr>
  </tbody></table>;
  if (h) return <table className="px-table"><thead><tr><th>Coverage</th><th>Limit</th></tr></thead><tbody>
    <tr><td>A — Dwelling</td><td>{money(h.dwelling)} · Guaranteed Replacement Cost</td></tr><tr><td>B — Other structures</td><td>{money(h.dwelling * 0.1)}</td></tr><tr><td>C — Personal property</td><td>{money(h.dwelling * 0.7)}</td></tr><tr><td>D — Loss of use</td><td>Actual loss sustained</td></tr><tr><td>E — Personal liability</td><td>{money(h.personalLiability)}</td></tr><tr><td>F — Medical payments</td><td>{money(h.medicalPayments)}</td></tr><tr><td>Deductible</td><td>{money(h.deductible)}</td></tr>
    {h.waterBackup && <tr><td>Sewer/drain backup</td><td>Included</td></tr>}{h.identityRecovery && <tr><td>Identity recovery</td><td>Included</td></tr>}{h.equipmentBreakdown && <tr><td>Equipment breakdown</td><td>Included</td></tr>}{h.serviceLine && <tr><td>Service line</td><td>Included</td></tr>}{h.homeSharing && <tr><td>Home-sharing host</td><td>Included</td></tr>}{h.scheduledValuables > 0 && <tr><td>Scheduled valuables</td><td>{money(h.scheduledValuables)}</td></tr>}
  </tbody></table>;
  const b = policy.boat;
  if (b) return <table className="px-table"><thead><tr><th>Coverage</th><th>Limit / detail</th></tr></thead><tbody>
    <tr><td>Watercraft</td><td>{b.year} {b.make} {b.model} · {b.length} ft {b.hullType} · {b.horsepower} HP {b.engine}</td></tr><tr><td>Physical damage (agreed value)</td><td>{money(b.agreedValue)} · {money(b.deductible)} deductible</td></tr><tr><td>Watercraft liability</td><td>{money(b.liability)}</td></tr><tr><td>Medical payments</td><td>$5,000</td></tr><tr><td>Uninsured boaters</td><td>Included</td></tr>{b.trailerValue > 0 && <tr><td>Trailer</td><td>{money(b.trailerValue)}</td></tr>}{b.fishingEquipment > 0 && <tr><td>Fishing equipment</td><td>{money(b.fishingEquipment)}</td></tr>}{b.towing && <tr><td>On-water towing</td><td>Included</td></tr>}<tr><td>Navigation</td><td>{b.waters} · stored {b.storage.toLowerCase()}</td></tr>
  </tbody></table>;
  const l = policy.life;
  if (l) return <table className="px-table"><thead><tr><th>Coverage</th><th>Detail</th></tr></thead><tbody>
    <tr><td>Face amount</td><td>{money(l.faceAmount)}</td></tr><tr><td>Plan</td><td>ERIExpress Life · {l.term}-year level term</td></tr><tr><td>Rate class</td><td>{l.healthClass}{l.tobacco ? ' · tobacco' : ' · non-tobacco'}</td></tr><tr><td>Primary beneficiary</td><td>{l.beneficiary} ({l.beneficiaryRelation})</td></tr><tr><td>Riders</td><td>{[l.acceleratedBenefit && 'Accelerated death benefit', l.childRider && 'Children’s term', l.waiverOfPremium && 'Waiver of premium'].filter(Boolean).join(', ') || 'None'}</td></tr>
  </tbody></table>;
  const biz = policy.business;
  if (biz) return <table className="px-table"><thead><tr><th>Coverage</th><th>Limit / detail</th></tr></thead><tbody>
    <tr><td>Named insured</td><td>{biz.businessName} ({biz.entity})</td></tr><tr><td>Location</td><td>{biz.address}, {biz.city}, {biz.state} {biz.zip}</td></tr>{biz.ownsBuilding && <tr><td>Building — Guaranteed Replacement Cost</td><td>{money(biz.buildingLimit)}</td></tr>}<tr><td>Business personal property</td><td>{money(biz.bppLimit)}</td></tr><tr><td>Business income &amp; extra expense</td><td>12 months actual loss sustained</td></tr><tr><td>General liability (occurrence / aggregate)</td><td>{biz.glLimit === '1M/2M' ? '$1,000,000 / $2,000,000' : '$2,000,000 / $4,000,000'}</td></tr><tr><td>Property deductible</td><td>{money(biz.propertyDeductible)}</td></tr>
    {biz.cyber && <tr><td>Cyber &amp; data breach</td><td>$100,000</td></tr>}{biz.epli && <tr><td>Employment practices liability</td><td>$100,000</td></tr>}{biz.hiredNonOwnedAuto && <tr><td>Hired &amp; non-owned auto</td><td>$1,000,000</td></tr>}{biz.equipmentBreakdown && <tr><td>Equipment breakdown</td><td>Included</td></tr>}{biz.employeeDishonesty && <tr><td>Employee dishonesty</td><td>$25,000</td></tr>}
  </tbody></table>;
  return <p className="px-muted">{policy.description}. Full coverage detail is available on the declarations page in Documents.</p>;
}

type ChangeKind = 'add-vehicle' | 'replace-vehicle' | 'remove-vehicle' | 'add-driver' | 'remove-driver' | 'auto-coverage' | 'home-coverage';

function PolicyChangeModal({ policy, state, onClose }: { policy: Policy; state: string; onClose: () => void }) {
  const { updatePolicy, policies, notify, adjustBalance } = usePortal();
  const kinds: { id: ChangeKind; label: string }[] = policy.type === 'Auto'
    ? [{ id: 'add-vehicle', label: 'Add a vehicle' }, { id: 'replace-vehicle', label: 'Replace a vehicle' }, { id: 'remove-vehicle', label: 'Remove a vehicle' }, { id: 'add-driver', label: 'Add a driver' }, { id: 'remove-driver', label: 'Remove a driver' }, { id: 'auto-coverage', label: 'Change coverages / deductibles' }]
    : [{ id: 'home-coverage', label: 'Change coverages / deductible' }];
  const [kind, setKind] = useState<ChangeKind>(kinds[0].id);
  const [effective, setEffective] = useState(today());
  const [draft, setDraft] = useState<Policy>(policy);
  const [sub, setSub] = useState<'vehicle' | 'driver' | null>(null);
  const [targetId, setTargetId] = useState('');
  const multiPolicy = policies.filter((p) => p.customerId === policy.customerId && (p.type === 'Auto' || p.type === 'Home') && p.status !== 'Cancelled').length > 1;
  const newPremium = useMemo(() => reRate(draft, state, multiPolicy), [draft, state, multiPolicy]);
  const daysLeft = Math.max(0, (new Date(policy.expiration).getTime() - new Date(effective).getTime()) / 86400000);
  const proRata = Math.round(((newPremium - policy.premium) * daysLeft) / 365 * 100) / 100;

  useEffect(() => { setDraft(policy); setTargetId(''); }, [kind, policy]);

  const a = draft.autoCoverages;
  const h = draft.homeCoverages;
  const setA = (patch: Partial<AutoCoverages>) => setDraft({ ...draft, autoCoverages: { ...a!, ...patch } });
  const setH = (patch: Partial<HomeCoverages>) => setDraft({ ...draft, homeCoverages: { ...h!, ...patch } });
  const changed = JSON.stringify(draft) !== JSON.stringify(policy);

  const describe = () => {
    const label = kinds.find((k) => k.id === kind)?.label ?? 'Policy change';
    if (kind === 'add-vehicle' || kind === 'replace-vehicle') { const added = draft.vehicles.find((v) => !policy.vehicles.some((p) => p.id === v.id)); return `${label}: ${added ? `${added.year} ${added.make} ${added.model}` : ''}`; }
    if (kind === 'add-driver') { const added = draft.drivers.find((d) => !policy.drivers.some((p) => p.id === d.id)); return `${label}: ${added ? `${added.firstName} ${added.lastName}` : ''}`; }
    return label;
  };

  const submit = () => {
    if (!changed) return;
    updatePolicy(policy.number, { drivers: draft.drivers, vehicles: draft.vehicles, autoCoverages: draft.autoCoverages, homeCoverages: draft.homeCoverages, premium: newPremium, description: policy.type === 'Auto' ? `${draft.vehicles.length} vehicle${draft.vehicles.length === 1 ? '' : 's'} · ${draft.drivers.length} driver${draft.drivers.length === 1 ? '' : 's'}` : policy.description, documents: [{ name: `Amended Declarations — ${describe()}`, date: effective, kind: 'Endorsement' }, ...(policy.type === 'Auto' && kind.includes('vehicle') ? [{ name: 'Auto ID Cards (amended)', date: effective, kind: 'ID Card' as const }] : []), ...policy.documents] }, `${describe()} effective ${effective}. Premium ${proRata >= 0 ? '+' : '−'}${money(Math.abs(proRata), true)} pro rata`);
    adjustBalance(policy.number, proRata);
    notify(`Policy change processed. New annual premium ${money(newPremium)}.`);
    onClose();
  };

  return <Modal title={`Policy change — ${policy.number}`} wide onClose={onClose} footer={<><span className="modal-premium">New annual premium <strong>{money(newPremium)}</strong> · {proRata >= 0 ? 'Additional' : 'Return'} premium {money(Math.abs(proRata), true)}</span><button type="button" className="px-btn ghost" onClick={onClose}>Cancel</button><button type="button" className="px-btn" disabled={!changed} onClick={submit}>Process change</button></>}>
    <div className="px-grid2"><Field label="Type of change"><select value={kind} onChange={(e) => setKind(e.target.value as ChangeKind)}>{kinds.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></Field><Field label="Effective date"><input type="date" value={effective} min={policy.effective} max={policy.expiration} onChange={(e) => setEffective(e.target.value)} /></Field></div>
    {kind === 'add-vehicle' && <div className="change-box"><button type="button" className="px-btn ghost" onClick={() => setSub('vehicle')}>Enter vehicle details</button>{draft.vehicles.length > policy.vehicles.length && <p>Adding: {draft.vehicles[draft.vehicles.length - 1].year} {draft.vehicles[draft.vehicles.length - 1].make} {draft.vehicles[draft.vehicles.length - 1].model}</p>}</div>}
    {(kind === 'replace-vehicle' || kind === 'remove-vehicle') && <div className="change-box"><Field label="Vehicle"><select value={targetId} onChange={(e) => { setTargetId(e.target.value); if (kind === 'remove-vehicle') setDraft({ ...policy, vehicles: policy.vehicles.filter((v) => v.id !== e.target.value) }); }}><option value="">-- Select --</option>{policy.vehicles.map((v) => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>)}</select></Field>{kind === 'replace-vehicle' && targetId && <button type="button" className="px-btn ghost" onClick={() => setSub('vehicle')}>Enter replacement vehicle</button>}{kind === 'remove-vehicle' && policy.vehicles.length === 1 && <p className="needs">The last vehicle cannot be removed — cancel the policy instead.</p>}</div>}
    {kind === 'add-driver' && <div className="change-box"><button type="button" className="px-btn ghost" onClick={() => setSub('driver')}>Enter driver details</button>{draft.drivers.length > policy.drivers.length && <p>Adding: {draft.drivers[draft.drivers.length - 1].firstName} {draft.drivers[draft.drivers.length - 1].lastName}</p>}</div>}
    {kind === 'remove-driver' && <div className="change-box"><Field label="Driver"><select value={targetId} onChange={(e) => { setTargetId(e.target.value); setDraft({ ...policy, drivers: policy.drivers.filter((d) => d.id !== e.target.value) }); }}><option value="">-- Select --</option>{policy.drivers.filter((d) => d.relationship !== 'Named Insured').map((d) => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}</select></Field><p className="px-muted">Household members who remain licensed must be excluded with form AU-220.</p></div>}
    {kind === 'auto-coverage' && a && <div className="px-grid3"><Field label="Bodily injury"><select value={a.bodilyInjury} onChange={(e) => setA({ bodilyInjury: e.target.value })}>{['25/50', '50/100', '100/300', '250/500', '500/500'].map((o) => <option key={o}>{o}</option>)}</select></Field><Field label="Comprehensive deductible"><select value={a.comprehensiveDeductible} onChange={(e) => setA({ comprehensiveDeductible: Number(e.target.value) })}>{[0, 100, 250, 500, 1000].map((o) => <option key={o} value={o}>${o}</option>)}</select></Field><Field label="Collision deductible"><select value={a.collisionDeductible} onChange={(e) => setA({ collisionDeductible: Number(e.target.value) })}>{[250, 500, 1000, 2000].map((o) => <option key={o} value={o}>${o}</option>)}</select></Field><label className="px-checks"><input type="checkbox" checked={a.autoPlus} onChange={(e) => setA({ autoPlus: e.target.checked })} /> ERIE Auto Plus®</label><label className="px-checks"><input type="checkbox" checked={a.roadsideRentals} onChange={(e) => setA({ roadsideRentals: e.target.checked })} /> Roadside & Rentals</label><label className="px-checks"><input type="checkbox" checked={a.newAutoSecurity} onChange={(e) => setA({ newAutoSecurity: e.target.checked })} /> New Auto Security</label></div>}
    {kind === 'home-coverage' && h && <div className="px-grid3"><Field label="Coverage A — Dwelling"><input type="number" step={5000} value={h.dwelling} onChange={(e) => setH({ dwelling: Number(e.target.value) })} /></Field><Field label="Personal liability"><select value={h.personalLiability} onChange={(e) => setH({ personalLiability: Number(e.target.value) })}>{[100000, 300000, 500000, 1000000].map((o) => <option key={o} value={o}>{money(o)}</option>)}</select></Field><Field label="Deductible"><select value={h.deductible} onChange={(e) => setH({ deductible: Number(e.target.value) })}>{[500, 1000, 2500, 5000].map((o) => <option key={o} value={o}>{money(o)}</option>)}</select></Field><label className="px-checks"><input type="checkbox" checked={h.waterBackup} onChange={(e) => setH({ waterBackup: e.target.checked })} /> Water backup</label><label className="px-checks"><input type="checkbox" checked={h.equipmentBreakdown} onChange={(e) => setH({ equipmentBreakdown: e.target.checked })} /> Equipment breakdown</label><label className="px-checks"><input type="checkbox" checked={h.identityRecovery} onChange={(e) => setH({ identityRecovery: e.target.checked })} /> Identity recovery</label></div>}
    {sub === 'vehicle' && <VehicleModal vehicle={{ id: `V${Date.now()}`, year: new Date().getFullYear() - 2, make: 'Toyota', model: '', vin: '', use: 'Commute', annualMiles: 12000, garagingZip: policy.vehicles[0]?.garagingZip ?? '', antiTheft: true, airbags: true, antiLock: true, lienholder: '', reducedUsage: false }} onClose={() => setSub(null)} onSave={(v: Vehicle) => { setDraft({ ...policy, vehicles: kind === 'replace-vehicle' ? policy.vehicles.map((x) => (x.id === targetId ? v : x)) : [...policy.vehicles, v] }); setSub(null); }} />}
    {sub === 'driver' && <DriverModal driver={{ id: `D${Date.now()}`, firstName: '', lastName: policy.drivers[0]?.lastName ?? '', dob: '', gender: 'M', maritalStatus: 'Single', relationship: 'Other Household', licenseState: 'WI', licenseNumber: '', yearsLicensed: 0, violations: 0, accidents: 0, driverTraining: false, goodStudent: false }} onClose={() => setSub(null)} onSave={(d: Driver) => { setDraft({ ...policy, drivers: [...policy.drivers, d] }); setSub(null); }} />}
  </Modal>;
}

function CancelModal({ policy, onClose, onConfirm }: { policy: Policy; onClose: () => void; onConfirm: (reason: string, date: string) => void }) {
  const [reason, setReason] = useState('Insured request — replaced coverage elsewhere');
  const [date, setDate] = useState(addDays(today(), 1));
  const daysLeft = Math.max(0, (new Date(policy.expiration).getTime() - new Date(date).getTime()) / 86400000);
  const refund = Math.round((policy.premium * daysLeft) / 365 * 0.9);
  return <Modal title={`Cancel policy ${policy.number}`} onClose={onClose} footer={<><button type="button" className="px-btn ghost" onClick={onClose}>Keep policy</button><button type="button" className="px-btn danger" onClick={() => onConfirm(reason, date)}>Submit cancellation</button></>}>
    <Field label="Reason"><select value={reason} onChange={(e) => setReason(e.target.value)}>{['Insured request — replaced coverage elsewhere', 'Insured request — sold vehicle/property', 'Insured request — moved out of state', 'Non-payment of premium', 'Underwriting — material misrepresentation'].map((r) => <option key={r}>{r}</option>)}</select></Field>
    <Field label="Cancellation effective date"><input type="date" value={date} min={policy.effective} max={policy.expiration} onChange={(e) => setDate(e.target.value)} /></Field>
    <div className="px-note">Estimated return premium: <strong>{money(refund)}</strong> (short-rate). A signed Policy Cancellation Request (CN-01) is required for insured-requested cancellations.</div>
  </Modal>;
}

function IdCardModal({ policy, insured, onClose }: { policy: Policy; insured: string; onClose: () => void }) {
  return <Modal title="Auto ID cards" wide onClose={onClose} footer={<button type="button" className="px-btn" onClick={() => window.print()}><Printer size={14} /> Print</button>}>
    <div className="id-cards printable">{policy.vehicles.map((v) => <div className="id-card" key={v.id}><div className="id-card-head"><span className="quote-erie-mark small">⌂</span><strong>Erie Insurance Exchange</strong><em>{policy.drivers[0]?.licenseState ?? 'WI'} Insurance Identification Card</em></div><dl><dt>Policy number</dt><dd className="mono">{policy.number}</dd><dt>Effective</dt><dd>{policy.effective}</dd><dt>Expires</dt><dd>{policy.expiration}</dd><dt>Named insured</dt><dd>{insured}</dd><dt>Vehicle</dt><dd>{v.year} {v.make} {v.model}</dd><dt>VIN</dt><dd className="mono">{v.vin}</dd></dl><footer>Agent: {AGENT.agency} · {AGENT.phone} · Claims (800) 367-3743</footer></div>)}</div>
  </Modal>;
}

function DocumentModal({ policy, doc, insured, onClose }: { policy: Policy; doc: PolicyDocument; insured: string; onClose: () => void }) {
  return <Modal title={doc.name} wide onClose={onClose} footer={<button type="button" className="px-btn" onClick={() => window.print()}><Printer size={14} /> Print</button>}>
    <div className="doc-preview printable"><header><span className="quote-erie-mark small">⌂</span><div><strong>{policy.type === 'Life' ? 'Erie Family Life Insurance Company' : 'Erie Insurance Exchange'}</strong><small>{doc.kind} · {doc.date}</small></div></header>
      <dl className="px-dl two"><dt>Policy</dt><dd className="mono">{policy.number}</dd><dt>Policy period</dt><dd>{policy.effective} to {policy.expiration} 12:01 a.m.</dd><dt>Named insured</dt><dd>{insured}</dd><dt>Agent</dt><dd>{AGENT.agency} ({policy.agentNumber})</dd><dt>Total annual premium</dt><dd>{money(policy.premium)}</dd><dt>Payment plan</dt><dd>{policy.payPlan}</dd></dl>
      <CoverageTable policy={policy} />
      {policy.vehicles.length > 0 && <table className="px-table"><thead><tr><th>Vehicle</th><th>VIN</th></tr></thead><tbody>{policy.vehicles.map((v) => <tr key={v.id}><td>{v.year} {v.make} {v.model}</td><td className="mono">{v.vin}</td></tr>)}</tbody></table>}
      <p className="px-muted">This is a sample document generated by the demo portal.</p>
    </div>
  </Modal>;
}
