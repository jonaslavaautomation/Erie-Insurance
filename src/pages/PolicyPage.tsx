import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Ban, CreditCard, Download, FileText, Landmark, Pencil, Printer, RotateCcw, Shield } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { Empty, Field, Modal, PageTitle, Panel, StatusBadge, Tabs } from '@/components/ui';
import { policyIcon, policyLabel } from '@/pages/CustomerPages';
import { addDays, fullName, isNonPaymentCancel, today, usePortal } from '@/data/store';
import { AGENT } from '@/data/seed';
import { money, payPlanLabel } from '@/lib/rating';
import { clampToTerm } from '@/lib/endorsements';
import { installmentSchedule } from '@/lib/billing';
import { billingStatementHtml, decPageHtml, downloadDocument, evidenceOfInsuranceHtml, idCardsHtml, openDocument } from '@/lib/documents';

// Split limits read as $250K / $500K; combined single limits as $500K CSL.
const limitText = (l: string) => (l.includes('CSL') ? `$${l.replace(' CSL', '')}K CSL` : `$${l.replace('/', 'K / $')}K`);
import type { Policy, PolicyDocument } from '@/data/types';

const allTabs = ['Overview', 'Coverages', 'Drivers & Vehicles', 'Property', 'Billing', 'Claims', 'Documents', 'History'] as const;
type PolicyTab = (typeof allTabs)[number];

export default function PolicyPage() {
  const { number = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { policies, customers, billing, claims, cancelPolicy, reinstatePolicy, notify } = usePortal();
  const policy = policies.find((p) => p.number === number);
  const [tab, setTab] = useState<PolicyTab>('Overview');
  const [modal, setModal] = useState<'cancel' | 'id' | null>(null);
  const [doc, setDoc] = useState<PolicyDocument | null>(null);

  useEffect(() => { if (params.get('doc') === 'id') { setModal('id'); setParams({}, { replace: true }); } }, [params, setParams]);

  if (!policy) return <PortalLayout><main className="px-page"><PageTitle crumbs={[{ label: 'Customers', to: '/customers' }]} title="Policy not found" /><Panel><Empty>No policy {number}. <Link to="/customers?by=policy">Search by policy number</Link></Empty></Panel></main></PortalLayout>;

  const customer = customers.find((c) => c.id === policy.customerId);
  const account = billing.find((b) => b.policyNumber === policy.number);
  const policyClaims = claims.filter((c) => c.policyNumber === policy.number);
  const tabs = allTabs.filter((t) => (t === 'Drivers & Vehicles' ? policy.type === 'Auto' : t === 'Property' ? policy.type === 'Home' : true));
  const Icon = policyIcon[policy.type];
  const canChange = policy.status !== 'Cancelled' && policy.type !== 'Life';
  const canClaim = policy.status !== 'Cancelled' && policy.type !== 'Life';
  const nonPayment = (policy.status === 'Cancelled' || policy.status === 'Pending Cancel') && isNonPaymentCancel(policy);
  const endorseLink = `/policies/${policy.number}/endorse`;
  const lenders = policy.mortgagees ?? [];
  const schedule = account ? installmentSchedule(policy, account) : [];
  const openDec = () => openDocument(decPageHtml(policy, customer), `declarations-${policy.number}`);
  const openIds = () => openDocument(idCardsHtml(policy, customer), `id-cards-${policy.number}`);
  const openStatement = () => account && openDocument(billingStatementHtml(policy, customer, account, schedule), `statement-${policy.number}`);
  const viewDocument = (d: PolicyDocument) => {
    if (d.kind === 'ID Card') return openIds();
    if (d.kind === 'Bill' && account) return openStatement();
    if (/Evidence/i.test(d.name) && lenders[0]) return openDocument(evidenceOfInsuranceHtml(policy, customer, lenders[lenders.length - 1]), `evidence-${policy.number}`);
    if (d.kind === 'Declarations' || d.kind === 'Endorsement' || d.kind === 'Application') return openDec();
    setDoc(d);
  };

  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: 'Customers', to: '/customers' }, ...(customer ? [{ label: fullName(customer), to: `/customers/${customer.id}` }] : []), { label: policy.number }]} title={`${policyLabel(policy)} — ${policy.number}`} subtitle={<><StatusBadge status={policy.status} /> {policy.description} · Term {policy.effective} – {policy.expiration}</>} actions={<>
      {canChange && <Link className="px-btn ghost" to={endorseLink}><Pencil size={14} /> Policy change</Link>}
      {policy.type === 'Auto' && <button type="button" className="px-btn ghost" onClick={openIds}><Printer size={14} /> ID cards</button>}
      <button type="button" className="px-btn ghost" onClick={openDec}><FileText size={14} /> Dec page</button>
      {canClaim && <Link className="px-btn ghost" to={`/claims/new?policy=${policy.number}`}><Shield size={14} /> Report claim</Link>}
      {nonPayment ? <Link className="px-btn" to={`/billing/reinstate/${policy.number}`}><RotateCcw size={14} /> Reinstate</Link> : <Link className="px-btn" to={`/billing/pay?policy=${policy.number}`}><CreditCard size={14} /> Make payment</Link>}
    </>} />
    {nonPayment && <div className="wizard-banner bad"><AlertTriangle size={16} /> {policy.status === 'Cancelled' ? 'Cancelled for non-payment.' : 'Pending cancellation for non-payment.'} <Link to={`/billing/reinstate/${policy.number}`}>Start reinstatement</Link></div>}
    <Tabs tabs={tabs} active={tab} onChange={setTab} />

    {tab === 'Overview' && <div className="px-cols">
      <div className="px-main-col">
        <Panel title={<><Icon size={16} /> Policy summary</>}><dl className="px-dl two"><dt>Named insured</dt><dd>{customer ? <Link to={`/customers/${customer.id}`}>{fullName(customer)}</Link> : '—'}</dd><dt>Mailing address</dt><dd>{customer ? `${customer.address}, ${customer.city}, ${customer.state} ${customer.zip}` : '—'}</dd><dt>Annual premium</dt><dd>{money(policy.premium)}</dd><dt>Payment plan</dt><dd>{payPlanLabel[policy.payPlan]}{policy.autoPay ? ' · EriePay AutoPay (fees waived)' : ''}</dd><dt>Producer</dt><dd>{AGENT.name} · {policy.agentNumber}</dd><dt>Underwriting company</dt><dd>{policy.type === 'Life' ? 'Erie Family Life Insurance Company' : 'Erie Insurance Exchange · NAIC 26271'}</dd>{policy.type === 'Auto' && <><dt>Rate Lock</dt><dd>{policy.autoCoverages?.rateLock ? 'ERIE Rate Lock® active' : 'Not elected'}</dd></>}</dl></Panel>
        {(lenders.length > 0 || canChange) && policy.type !== 'Life' && <Panel title={<><Landmark size={16} /> Mortgagees & loss payees</>} actions={canChange && <Link to={endorseLink}>Change</Link>}>{lenders.length === 0 ? <p className="px-muted">None on file.</p> : <table className="px-table"><tbody>{lenders.map((m) => <tr key={m.id}><td>{m.role}</td><td>{m.name}{m.clause !== 'None' ? `, ${m.clause}` : ''}<small className="cell-note">Loan {m.loanNumber} · {m.address}, {m.city}, {m.state} {m.zip}</small></td><td><button type="button" className="link-button" onClick={() => openDocument(evidenceOfInsuranceHtml(policy, customer, m), `evidence-${policy.number}`)}>Evidence of insurance</button></td></tr>)}</tbody></table>}</Panel>}
        {(policy.endorsements ?? []).length > 0 && <Panel title="Policy changes this term"><table className="px-table"><thead><tr><th>Effective</th><th>Change</th><th>Premium</th></tr></thead><tbody>{policy.endorsements!.map((e) => <tr key={e.id}><td>{e.effective}</td><td>{e.description}<small className="cell-note">{e.id} · processed {e.processed} by {e.by}</small></td><td className="num">{e.proRata >= 0 ? '+' : '−'}{money(Math.abs(e.proRata), true)}</td></tr>)}</tbody></table></Panel>}
        <Panel title="Recent activity" actions={<button type="button" className="link-button" onClick={() => setTab('History')}>Full history</button>}><ul className="px-timeline">{policy.history.slice(0, 4).map((h, i) => <li key={i}><strong>{h.date}</strong> {h.text} <small>— {h.by}</small></li>)}</ul></Panel>
      </div>
      <div className="px-side-col">
        <Panel title="Billing" actions={<button type="button" className="link-button" onClick={() => setTab('Billing')}>Details</button>}>{account ? <><div className="stat-pair"><div><span>Minimum due</span><strong>{money(account.minimumDue, true)}</strong></div><div><span>Due date</span><strong>{account.nextDueDate}</strong></div></div><Link className="px-btn wide" to={nonPayment ? `/billing/reinstate/${policy.number}` : `/billing/pay?policy=${policy.number}`}>{nonPayment ? 'Reinstate' : 'Pay now'}</Link></> : <Empty>No billing account.</Empty>}</Panel>
        <Panel title="Policy actions"><div className="px-action-list">
          {canChange && <Link to={endorseLink}><Pencil size={14} /> Request policy change</Link>}
          {policy.type === 'Auto' && <button type="button" onClick={openIds}><Printer size={14} /> Print ID cards</button>}
          <button type="button" onClick={openDec}><FileText size={14} /> Declarations page</button>
          <Link to={`/billing/autopay?policy=${policy.number}`}><CreditCard size={14} /> {policy.autoPay ? 'Manage AutoPay' : 'Enroll in AutoPay'}</Link>
          <Link to={`/billing/methods?customer=${policy.customerId}`}><CreditCard size={14} /> Payment methods</Link>
          <Link to={`/resources/certificates?policy=${policy.number}`}><FileText size={14} /> Certificate of insurance</Link>
          {policy.status === 'Active' && <button type="button" className="danger" onClick={() => setModal('cancel')}><Ban size={14} /> Cancel policy</button>}
          {nonPayment && <Link to={`/billing/reinstate/${policy.number}`}><RotateCcw size={14} /> Reinstate (non-payment)</Link>}
          {!nonPayment && (policy.status === 'Pending Cancel' || policy.status === 'Cancelled') && <button type="button" onClick={() => { reinstatePolicy(policy.number); notify(`Policy ${policy.number} reinstated.`); }}><RotateCcw size={14} /> Rescind cancellation</button>}
        </div></Panel>
      </div>
    </div>}

    {tab === 'Coverages' && <Panel title="Coverages & limits" actions={canChange && <Link to={endorseLink}>Change coverages</Link>}><CoverageTable policy={policy} /></Panel>}

    {tab === 'Drivers & Vehicles' && <><Panel title="Drivers" actions={canChange && <Link to={endorseLink}>Add / change / exclude driver</Link>}><table className="px-table"><thead><tr><th>Driver</th><th>Relationship</th><th>DOB</th><th>License</th><th>Violations</th><th>Accidents</th><th>Status</th></tr></thead><tbody>{policy.drivers.map((d) => <tr key={d.id}><td>{d.firstName} {d.lastName}</td><td>{d.relationship}</td><td>{d.dob}</td><td>{d.licenseState} {d.licenseNumber}</td><td>{d.violations}</td><td>{d.accidents}</td><td>{d.excluded ? <StatusBadge status="Excluded" /> : 'Rated'}</td></tr>)}</tbody></table></Panel>
      <Panel title="Vehicles" actions={canChange && <Link to={endorseLink}>Add / replace vehicle</Link>}><table className="px-table"><thead><tr><th>Vehicle</th><th>VIN</th><th>Use</th><th>Garaging ZIP</th><th>Lienholder</th></tr></thead><tbody>{policy.vehicles.map((v) => <tr key={v.id}><td>{v.year} {v.make} {v.model}</td><td className="mono">{v.vin}</td><td>{v.use}</td><td>{v.garagingZip}</td><td>{v.lienholder || '—'}</td></tr>)}</tbody></table></Panel></>}

    {tab === 'Property' && policy.property && <Panel title="Dwelling"><dl className="px-dl two"><dt>Dwelling type</dt><dd>{policy.property.dwellingType}</dd><dt>Year built</dt><dd>{policy.property.yearBuilt}</dd><dt>Square feet</dt><dd>{policy.property.squareFeet.toLocaleString()}</dd><dt>Construction</dt><dd>{policy.property.construction}</dd><dt>Roof</dt><dd>{policy.property.roofType}, installed {policy.property.roofYear}</dd><dt>Heating</dt><dd>{policy.property.heating}</dd><dt>Protection class</dt><dd>{policy.property.protectionClass}</dd><dt>Protective devices</dt><dd>{[policy.property.smokeAlarms && 'Smoke alarms', policy.property.burglarAlarm && 'Burglar alarm', policy.property.sprinklers && 'Sprinklers'].filter(Boolean).join(', ') || 'None'}</dd></dl></Panel>}

    {tab === 'Billing' && <Panel title="Billing account" actions={account && <><button type="button" className="link-button" onClick={openStatement}><FileText size={13} /> Statement</button><button type="button" className="link-button" onClick={() => downloadDocument(billingStatementHtml(policy, customer, account, schedule), `statement-${policy.number}`)}><Download size={13} /> Download</button><Link to={nonPayment ? `/billing/reinstate/${policy.number}` : `/billing/pay?policy=${policy.number}`}>{nonPayment ? 'Reinstate' : 'Make a payment'}</Link></>}>{account ? <>
      <div className="stat-row"><div><span>Remaining term balance</span><strong>{money(account.balance, true)}</strong></div><div><span>Minimum due</span><strong>{money(account.minimumDue, true)}</strong></div><div><span>Next due</span><strong>{account.nextDueDate}</strong></div><div><span>AutoPay</span><strong>{policy.autoPay ? 'Enrolled' : <Link to={`/billing/autopay?policy=${policy.number}`}>Enroll</Link>}</strong></div></div>
      <h3 className="section-h">Installment schedule — {payPlanLabel[policy.payPlan]}</h3>
      <table className="px-table"><thead><tr><th>#</th><th>Due</th><th className="num">Amount</th><th className="num">Paid</th><th>Status</th></tr></thead><tbody>{schedule.map((i) => <tr key={i.n}><td>{i.n}</td><td>{i.due}</td><td className="num">{money(i.amount, true)}</td><td className="num">{money(i.paid, true)}</td><td><StatusBadge status={i.status} /></td></tr>)}</tbody></table>
      {(account.scheduled ?? []).length > 0 && <><h3 className="section-h">Scheduled payments</h3><table className="px-table"><tbody>{account.scheduled!.map((p) => <tr key={p.id}><td>{p.date}</td><td>{p.method}</td><td className="mono">{p.confirmation}</td><td className="num">{money(p.amount, true)}</td><td><StatusBadge status="Scheduled" /></td></tr>)}</tbody></table></>}
      <h3 className="section-h">Payment history</h3>{account.payments.length === 0 ? <Empty>No payments received this term.</Empty> : <table className="px-table"><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Method</th><th>Confirmation</th></tr></thead><tbody>{account.payments.map((p) => <tr key={p.id}><td>{p.date}</td><td>{p.kind ?? 'Installment'}</td><td>{money(p.amount, true)}</td><td>{p.method}</td><td className="mono">{p.confirmation}</td></tr>)}</tbody></table>}
    </> : <Empty>No billing account.</Empty>}</Panel>}

    {tab === 'Claims' && <Panel title="Claims" actions={canClaim && <Link to={`/claims/new?policy=${policy.number}`}>Report a claim</Link>}>{policyClaims.length === 0 ? <Empty>No claims on this policy.</Empty> : <table className="px-table"><thead><tr><th>Claim #</th><th>Loss date</th><th>Type</th><th>Adjuster</th><th>Status</th></tr></thead><tbody>{policyClaims.map((c) => <tr key={c.number}><td><Link className="mono" to={`/claims/${c.number}`}>{c.number}</Link></td><td>{c.lossDate}</td><td>{c.lossType}</td><td>{c.adjuster.name}</td><td><StatusBadge status={c.status} /></td></tr>)}</tbody></table>}</Panel>}

    {tab === 'Documents' && <Panel title="Documents" actions={<button type="button" className="link-button" onClick={openDec}><FileText size={13} /> Current declarations</button>}>{policy.documents.length === 0 ? <Empty>No documents.</Empty> : <table className="px-table"><thead><tr><th>Document</th><th>Type</th><th>Date</th><th /></tr></thead><tbody>{policy.documents.map((d, i) => <tr key={`${d.name}-${i}`} className="clickable" onClick={() => viewDocument(d)}><td><FileText size={14} /> {d.name}</td><td>{d.kind}</td><td>{d.date}</td><td><button type="button" className="link-button">View</button></td></tr>)}</tbody></table>}</Panel>}

    {tab === 'History' && <Panel title="Transaction history"><ul className="px-timeline">{policy.history.map((h, i) => <li key={i}><strong>{h.date}</strong> {h.text} <small>— {h.by}</small></li>)}</ul></Panel>}

    {modal === 'cancel' && <CancelModal policy={policy} onClose={() => setModal(null)} onConfirm={(reason, date) => { cancelPolicy(policy.number, reason, date); notify(`Cancellation submitted for ${policy.number} effective ${date}.`, 'info'); setModal(null); }} />}
    {modal === 'id' && <IdCardModal policy={policy} insured={customer ? fullName(customer) : ''} onPrint={openIds} onClose={() => setModal(null)} />}
    {doc && <DocumentModal policy={policy} doc={doc} insured={customer ? `${fullName(customer)}, ${customer.address}, ${customer.city}, ${customer.state} ${customer.zip}` : ''} onClose={() => setDoc(null)} />}
  </main></PortalLayout>;
}

function CoverageTable({ policy }: { policy: Policy }) {
  const a = policy.autoCoverages;
  const h = policy.homeCoverages;
  if (a) return <table className="px-table"><thead><tr><th>Coverage</th><th>Limit / deductible</th></tr></thead><tbody>
    <tr><td>Bodily injury liability</td><td>{limitText(a.bodilyInjury)}</td></tr><tr><td>Property damage liability</td><td>${a.propertyDamage}</td></tr><tr><td>Uninsured / underinsured motorists</td><td>{limitText(a.uninsuredMotorist)}</td></tr><tr><td>Medical payments / first party benefits</td><td>{a.medicalPayments === 'None' ? 'Not elected' : `$${a.medicalPayments}`}</td></tr><tr><td>Comprehensive</td><td>${a.comprehensiveDeductible} deductible</td></tr><tr><td>Collision</td><td>${a.collisionDeductible} deductible</td></tr>
    <tr><td>ERIE Rate Lock®</td><td>{a.rateLock ? 'Included' : '—'}</td></tr><tr><td>ERIE Auto Plus®</td><td>{a.autoPlus ? 'Included — diminishing deductible active' : 'Not elected'}</td></tr><tr><td>Emergency road service</td><td>{a.emergencyRoadService ? 'Included' : 'Not elected'}</td></tr><tr><td>Transportation expenses</td><td>{a.transportationExpense ? 'Included' : 'Not elected'}</td></tr><tr><td>New Auto Security</td><td>{a.newAutoSecurity ? 'Included' : 'Not elected'}</td></tr>
  </tbody></table>;
  if (h && h.form && h.form !== 'HO-3') {
    const contents = h.contentsLimit ?? 0;
    const endorsements = <>{h.waterBackup && <tr><td>Water backup &amp; sump discharge</td><td>Included</td></tr>}{h.identityRecovery && <tr><td>Identity recovery</td><td>Included</td></tr>}{h.equipmentBreakdown && <tr><td>Equipment breakdown</td><td>Included</td></tr>}{h.serviceLine && <tr><td>Service line</td><td>Included</td></tr>}</>;
    return <table className="px-table"><thead><tr><th>Coverage ({h.form})</th><th>Limit</th></tr></thead><tbody>
      {h.form === 'HO-4' && <><tr><td>C — Personal property (replacement cost)</td><td>{money(contents)}</td></tr><tr><td>D — Loss of use</td><td>{money(contents * 0.3)}</td></tr></>}
      {h.form === 'HO-6' && <><tr><td>A — Building additions &amp; alterations</td><td>{money(h.dwelling)}</td></tr><tr><td>C — Personal property</td><td>{money(contents)}</td></tr><tr><td>D — Loss of use</td><td>{money(contents * 0.4)}</td></tr><tr><td>Loss assessment</td><td>$50,000</td></tr></>}
      {h.form === 'DP-3' && <><tr><td>A — Dwelling (rental)</td><td>{money(h.dwelling)} · replacement cost</td></tr><tr><td>B — Other structures</td><td>{money(h.dwelling * (h.otherStructuresPct ?? 10) / 100)}</td></tr>{contents > 0 && <tr><td>C — Landlord furnishings</td><td>{money(contents)}</td></tr>}<tr><td>D — Fair rental value</td><td>{money(h.dwelling * (h.lossOfUsePct ?? 10) / 100)}</td></tr></>}
      <tr><td>{h.form === 'DP-3' ? 'L — Premises liability' : 'E — Personal liability'}</td><td>{money(h.personalLiability)}</td></tr><tr><td>{h.form === 'DP-3' ? 'M' : 'F'} — Medical payments</td><td>{money(h.medicalPayments)}</td></tr><tr><td>Deductible</td><td>{money(h.deductible)}</td></tr>{endorsements}
    </tbody></table>;
  }
  if (h) return <table className="px-table"><thead><tr><th>Coverage</th><th>Limit</th></tr></thead><tbody>
    <tr><td>A — Dwelling</td><td>{money(h.dwelling)} · Guaranteed Replacement Cost</td></tr><tr><td>B — Other structures ({h.otherStructuresPct ?? 10}%)</td><td>{money(h.dwelling * (h.otherStructuresPct ?? 10) / 100)}</td></tr><tr><td>C — Personal property ({h.personalPropertyPct ?? 70}%)</td><td>{money(h.dwelling * (h.personalPropertyPct ?? 70) / 100)}</td></tr><tr><td>D — Loss of use ({h.lossOfUsePct ?? 20}%)</td><td>{money(h.dwelling * (h.lossOfUsePct ?? 20) / 100)}</td></tr><tr><td>E — Personal liability</td><td>{money(h.personalLiability)}</td></tr><tr><td>F — Medical payments</td><td>{money(h.medicalPayments)}</td></tr><tr><td>Deductible</td><td>{money(h.deductible)}</td></tr>
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
  const u = policy.umbrella;
  if (u) return <table className="px-table"><thead><tr><th>Coverage</th><th>Detail</th></tr></thead><tbody>
    <tr><td>Personal Catastrophe Liability limit</td><td>{money(u.limit)} per occurrence</td></tr><tr><td>Self-insured retention</td><td>$0 when underlying limits are maintained</td></tr><tr><td>Exposures</td><td>{u.autoExposures} auto · {u.residences} residence{u.residences === 1 ? '' : 's'} · {u.watercraft} watercraft · {u.recreationalVehicles} recreational · {u.youthfulOperators} youthful operator{u.youthfulOperators === 1 ? '' : 's'}</td></tr><tr><td>Required underlying</td><td>Auto 250/500/100 (or 500 CSL) · Home personal liability $300,000</td></tr>
  </tbody></table>;
  if (policy.contractors) { const c = policy.contractors; return <table className="px-table"><thead><tr><th>Coverage</th><th>Limit / detail</th></tr></thead><tbody>
    <tr><td>Contractors general liability</td><td>{policy.business?.glLimit === '2M/4M' ? '$2M / $4M' : '$1M / $2M'}</td></tr><tr><td>Contractors equipment floater</td><td>{money(c.equipmentFloater)}</td></tr><tr><td>Installation floater</td><td>{money(c.installationFloater)} per job</td></tr><tr><td>Tools &amp; small equipment</td><td>{money(c.toolsLimit)}</td></tr><tr><td>Blanket additional insured</td><td>{c.additionalInsuredBlanket ? 'Included' : 'Not elected'}</td></tr><tr><td>Subcontracted work</td><td>{c.subcontractedPct}% of receipts</td></tr>
  </tbody></table>; }
  if (policy.commercialAuto) { const ca = policy.commercialAuto; return <table className="px-table"><thead><tr><th>Unit / coverage</th><th>Detail</th></tr></thead><tbody>
    <tr><td>Liability</td><td>${ca.liability}</td></tr><tr><td>Physical damage deductible</td><td>{money(ca.physicalDamageDeductible)}</td></tr>{ca.garagekeepers && <tr><td>Garagekeepers</td><td>{money(ca.garagekeepersLimit)}</td></tr>}{ca.hiredNonOwned && <tr><td>Hired &amp; non-owned auto</td><td>Included</td></tr>}
    {ca.trucking && <><tr><td>USDOT / MC number</td><td>{ca.trucking.usdot} / {ca.trucking.mcNumber}</td></tr><tr><td>Motor truck cargo</td><td>{money(ca.trucking.cargoLimit)} · {ca.trucking.commodity}</td></tr><tr><td>Trailer interchange</td><td>{ca.trucking.trailerInterchange ? '$40,000' : 'Not elected'}</td></tr><tr><td>Owned trailers</td><td>{ca.trucking.trailers}</td></tr><tr><td>Federal filings</td><td>MCS-90 endorsement · BMC-91X</td></tr></>}
    {ca.vehicles.map((v) => <tr key={v.id}><td>{v.year} {v.make} {v.model}</td><td>{v.bodyType} · {v.radius} · cost new {money(v.costNew)}</td></tr>)}
    {ca.drivers.map((d) => <tr key={d.id}><td>Driver: {d.name}</td><td>Age {d.age} · {d.violations} violation{d.violations === 1 ? '' : 's'} · {d.accidents} accident{d.accidents === 1 ? '' : 's'}</td></tr>)}
  </tbody></table>; }
  if (policy.workersComp) { const w = policy.workersComp; return <table className="px-table"><thead><tr><th>Class</th><th>Estimated payroll</th></tr></thead><tbody>
    {w.classes.map((c) => <tr key={c.id}><td>{c.code}</td><td>{money(c.payroll)}</td></tr>)}<tr><td>Experience modification</td><td>{w.experienceMod.toFixed(2)}</td></tr><tr><td>Employers liability</td><td>{w.employersLiability}</td></tr><tr><td>Part One</td><td>Statutory — {policy.business?.state ?? ''}</td></tr>
  </tbody></table>; }
  const biz = policy.business;
  if (biz && policy.policyForm === 'Commercial Property') return <table className="px-table"><thead><tr><th>Coverage</th><th>Limit / detail</th></tr></thead><tbody>
    <tr><td>Named insured</td><td>{biz.businessName} ({biz.entity})</td></tr><tr><td>Location</td><td>{biz.address}, {biz.city}, {biz.state} {biz.zip} · {biz.squareFeet.toLocaleString()} sq ft {biz.construction}</td></tr>{biz.ownsBuilding && <tr><td>Building — replacement cost, 90% coinsurance</td><td>{money(biz.buildingLimit)}</td></tr>}<tr><td>Business personal property</td><td>{money(biz.bppLimit)}</td></tr><tr><td>Income Protection</td><td>12 months actual loss sustained</td></tr><tr><td>Extra Expense</td><td>Included</td></tr><tr><td>Property deductible</td><td>{money(biz.propertyDeductible)}</td></tr><tr><td>Protection</td><td>{biz.sprinklered ? 'Fully sprinklered' : 'Not sprinklered'} · {biz.alarm} alarm</td></tr>
    {biz.equipmentBreakdown && <tr><td>Equipment breakdown</td><td>Included</td></tr>}{biz.employeeDishonesty && <tr><td>Employee dishonesty</td><td>$25,000</td></tr>}<tr><td>Liability</td><td>Not included — written on a separate general liability policy</td></tr>
  </tbody></table>;
  if (biz) return <table className="px-table"><thead><tr><th>Coverage</th><th>Limit / detail</th></tr></thead><tbody>
    <tr><td>Named insured</td><td>{biz.businessName} ({biz.entity})</td></tr><tr><td>Location</td><td>{biz.address}, {biz.city}, {biz.state} {biz.zip}</td></tr>{biz.ownsBuilding && <tr><td>Building — Guaranteed Replacement Cost</td><td>{money(biz.buildingLimit)}</td></tr>}<tr><td>Business personal property</td><td>{money(biz.bppLimit)}</td></tr><tr><td>Income Protection</td><td>12 months actual loss sustained</td></tr><tr><td>Extra Expense</td><td>Included</td></tr><tr><td>Civil Authority</td><td>Included — access prohibited within 1 mile</td></tr><tr><td>General liability (occurrence / aggregate)</td><td>{biz.glLimit === '1M/2M' ? '$1,000,000 / $2,000,000' : '$2,000,000 / $4,000,000'}</td></tr><tr><td>Property deductible</td><td>{money(biz.propertyDeductible)}</td></tr>
    {biz.cyber && <tr><td>Cyber &amp; data breach</td><td>$100,000</td></tr>}{biz.epli && <tr><td>Employment practices liability</td><td>$100,000</td></tr>}{biz.hiredNonOwnedAuto && <tr><td>Hired &amp; non-owned auto</td><td>$1,000,000</td></tr>}{biz.equipmentBreakdown && <tr><td>Equipment breakdown</td><td>Included</td></tr>}{biz.employeeDishonesty && <tr><td>Employee dishonesty</td><td>$25,000</td></tr>}
  </tbody></table>;
  return <p className="px-muted">{policy.description}. Full coverage detail is available on the declarations page in Documents.</p>;
}

// Default dates must fall inside the policy term (a newly issued policy may start in the future).

function CancelModal({ policy, onClose, onConfirm }: { policy: Policy; onClose: () => void; onConfirm: (reason: string, date: string) => void }) {
  const [reason, setReason] = useState('Insured request — replaced coverage elsewhere');
  const [date, setDate] = useState(clampToTerm(addDays(today(), 1), policy));
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= policy.effective && date <= policy.expiration;
  const daysLeft = dateValid ? Math.max(0, (new Date(policy.expiration).getTime() - new Date(date).getTime()) / 86400000) : 0;
  const refund = Math.round((policy.premium * daysLeft) / 365 * 0.9);
  return <Modal title={`Cancel policy ${policy.number}`} onClose={onClose} footer={<><button type="button" className="px-btn ghost" onClick={onClose}>Keep policy</button><button type="button" className="px-btn danger" disabled={!dateValid} onClick={() => dateValid && onConfirm(reason, date)}>Submit cancellation</button></>}>
    <Field label="Reason"><select value={reason} onChange={(e) => setReason(e.target.value)}>{['Insured request — replaced coverage elsewhere', 'Insured request — sold vehicle/property', 'Insured request — moved out of state', 'Non-payment of premium', 'Underwriting — material misrepresentation'].map((r) => <option key={r}>{r}</option>)}</select></Field>
    <Field label="Cancellation effective date"><input type="date" value={date} min={policy.effective} max={policy.expiration} onChange={(e) => setDate(e.target.value)} /></Field>
    {!dateValid && <p className="needs">Choose a date within the policy term ({policy.effective} – {policy.expiration}).</p>}
    <div className="px-note">Estimated return premium: <strong>{money(refund)}</strong> (short-rate). A signed Policy Cancellation Request (CN-01) is required for insured-requested cancellations.</div>
  </Modal>;
}

function IdCardModal({ policy, insured, onPrint, onClose }: { policy: Policy; insured: string; onPrint: () => void; onClose: () => void }) {
  return <Modal title="Auto ID cards" wide onClose={onClose} footer={<button type="button" className="px-btn" onClick={onPrint}><Printer size={14} /> Print / Save as PDF</button>}>
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
