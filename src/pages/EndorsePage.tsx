import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Car, CheckCircle2, FileText, Home, Landmark, MapPin, Pencil, Plus, Printer, ShieldOff, Trash2, UserPlus, Users } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { Empty, Field, PageTitle, Panel, StatusBadge } from '@/components/ui';
import { DriverModal, VehicleModal } from '@/pages/QuoteWizard';
import { policyLabel } from '@/pages/CustomerPages';
import { fullName, today, usePortal } from '@/data/store';
import { STATES } from '@/data/content';
import { BI_OPTIONS, money, PD_OPTIONS, UM_OPTIONS } from '@/lib/rating';
import { clampToTerm, dateInTerm, endorsedPremium, hasMultiPolicy, proRataChange } from '@/lib/endorsements';
import { decPageHtml, evidenceOfInsuranceHtml, idCardsHtml, openDocument } from '@/lib/documents';
import type { AutoCoverages, Driver, EndorsementType, HomeCoverages, Mortgagee, Policy, PolicyDocument, PolicyEndorsement, Vehicle } from '@/data/types';

type ChangeOption = { type: EndorsementType; icon: JSX.Element; hint: string };

function optionsFor(p: Policy): ChangeOption[] {
  const lender: ChangeOption = { type: 'Mortgagee / loss payee', icon: <Landmark size={16} />, hint: p.type === 'Auto' ? 'Add or change a lienholder / loss payee on a vehicle' : 'Add, change or remove a mortgagee (ISAOA/ATIMA)' };
  if (p.type === 'Auto') return [
    { type: 'Add driver', icon: <UserPlus size={16} />, hint: 'New licensed household member, with MVR history' },
    { type: 'Change driver', icon: <Pencil size={16} />, hint: 'Marital status, license, violations or accidents' },
    { type: 'Exclude driver', icon: <ShieldOff size={16} />, hint: 'Named driver exclusion (AU-220) — or remove an exclusion' },
    { type: 'Remove driver', icon: <Users size={16} />, hint: 'Driver moved out of the household' },
    { type: 'Add vehicle', icon: <Plus size={16} />, hint: 'Newly acquired vehicle' },
    { type: 'Replace vehicle', icon: <Car size={16} />, hint: 'Trade-in or replacement' },
    { type: 'Remove vehicle', icon: <Trash2 size={16} />, hint: 'Sold or no longer owned' },
    { type: 'Garaging address', icon: <MapPin size={16} />, hint: 'Where vehicles are kept overnight' },
    { type: 'Coverage change', icon: <FileText size={16} />, hint: 'Liability limits and comp / collision deductibles' },
    lender,
  ];
  if (p.type === 'Home') return [{ type: 'Coverage change', icon: <Home size={16} />, hint: 'Limits, deductible and endorsements' }, lender];
  return [lender];
}

const blankLender = (vehicleId?: string): Mortgagee => ({ id: `MG${Date.now()}`, role: vehicleId ? 'Loss payee' : 'First mortgagee', name: '', clause: 'ISAOA/ATIMA', loanNumber: '', address: '', city: '', state: 'WI', zip: '', vehicleId });

export default function EndorsePage() {
  const { number = '' } = useParams();
  const { policies, customers, endorsePolicy, notify } = usePortal();
  const policy = policies.find((p) => p.number === number);
  const [type, setType] = useState<EndorsementType | null>(null);
  const [draft, setDraft] = useState<Policy | null>(null);
  const [effective, setEffective] = useState('');
  const [targetId, setTargetId] = useState('');
  const [modal, setModal] = useState<'driver' | 'vehicle' | null>(null);
  const [lender, setLender] = useState<Mortgagee | null>(null);
  const [garaging, setGaraging] = useState('');
  const [done, setDone] = useState<PolicyEndorsement | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const customer = customers.find((c) => c.id === policy?.customerId);
  const state = customer?.state ?? 'WI';
  const multiPolicy = policy ? hasMultiPolicy(policy, policies) : false;
  const newPremium = useMemo(() => (policy && draft ? endorsedPremium(policy, draft, state, multiPolicy) : policy?.premium ?? 0), [policy, draft, state, multiPolicy]);

  if (!policy) return <PortalLayout><main className="px-page"><PageTitle crumbs={[{ label: 'Customers', to: '/customers' }]} title="Policy not found" /><Panel><Empty><Link to="/customers?by=policy">Search by policy number</Link></Empty></Panel></main></PortalLayout>;
  if (policy.status === 'Cancelled') return <PortalLayout><main className="px-page narrow"><PageTitle crumbs={[{ label: policy.number, to: `/policies/${policy.number}` }, { label: 'Policy change' }]} title="Policy is cancelled" subtitle="Cancelled policies can't be endorsed." /><Panel><p className="px-body">Reinstate the policy first if it was cancelled for non-payment.</p><Link className="px-btn" to={`/billing/reinstate/${policy.number}`}>Reinstatement</Link></Panel></main></PortalLayout>;

  const options = optionsFor(policy);
  const working = draft ?? policy;
  const validDate = dateInTerm(effective, policy);
  const proRata = validDate ? proRataChange(policy, newPremium, effective) : 0;
  const changed = !!draft && JSON.stringify(draft) !== JSON.stringify(policy);
  const set = (patch: Partial<Policy>) => setDraft({ ...working, ...patch });
  const nonNamed = working.drivers.filter((d) => d.relationship !== 'Named Insured');

  const start = (t: EndorsementType) => {
    setType(t); setDraft(null); setTargetId(''); setLender(null); setGaraging(''); setErrors([]); setDone(null);
    setEffective(clampToTerm(today(), policy));
    if (t === 'Add driver') setModal('driver');
    if (t === 'Add vehicle') setModal('vehicle');
  };

  const describe = (): string => {
    const added = <T extends { id: string }>(a: T[], b: T[]) => a.find((x) => !b.some((y) => y.id === x.id));
    const target = policy.drivers.find((d) => d.id === targetId);
    switch (type) {
      case 'Add driver': { const d = added(working.drivers, policy.drivers); return d ? `Added driver ${d.firstName} ${d.lastName} (${d.relationship}, ${d.violations} violation(s), ${d.accidents} accident(s))` : 'Add driver'; }
      case 'Change driver': return target ? `Updated driver ${target.firstName} ${target.lastName}` : 'Change driver';
      case 'Exclude driver': { const d = working.drivers.find((x) => x.id === targetId); return d ? `${d.excluded ? 'Excluded' : 'Removed exclusion for'} driver ${d.firstName} ${d.lastName}${d.excluded ? ' — Named Driver Exclusion AU-220' : ''}` : 'Exclude driver'; }
      case 'Remove driver': return target ? `Removed driver ${target.firstName} ${target.lastName}` : 'Remove driver';
      case 'Add vehicle': { const v = added(working.vehicles, policy.vehicles); return v ? `Added ${v.year} ${v.make} ${v.model} (VIN ${v.vin})` : 'Add vehicle'; }
      case 'Replace vehicle': { const old = policy.vehicles.find((v) => v.id === targetId); const v = added(working.vehicles, policy.vehicles); return old && v ? `Replaced ${old.year} ${old.make} ${old.model} with ${v.year} ${v.make} ${v.model}` : 'Replace vehicle'; }
      case 'Remove vehicle': { const v = policy.vehicles.find((x) => x.id === targetId); return v ? `Removed ${v.year} ${v.make} ${v.model}` : 'Remove vehicle'; }
      case 'Garaging address': return `Garaging ZIP changed to ${garaging}`;
      case 'Coverage change': return 'Coverage limits / deductibles changed';
      case 'Mortgagee / loss payee': { const prev = policy.mortgagees ?? []; const now = working.mortgagees ?? []; const m = now.find((x) => !prev.some((y) => JSON.stringify(y) === JSON.stringify(x))); const removed = prev.find((x) => !now.some((y) => y.id === x.id)); return m ? `${prev.some((x) => x.id === m.id) ? 'Updated' : 'Added'} ${m.role.toLowerCase()} ${m.name}, ${m.clause}` : removed ? `Removed ${removed.role.toLowerCase()} ${removed.name}` : 'Mortgagee change'; }
      default: return '';
    }
  };

  const submit = () => {
    const problems: string[] = [];
    if (!changed) problems.push('Make a change before submitting.');
    if (!validDate) problems.push(`Effective date must be within the policy term (${policy.effective} – ${policy.expiration}).`);
    if (policy.type === 'Auto' && working.vehicles.length === 0) problems.push('The last vehicle can’t be removed — cancel the policy instead.');
    if (policy.type === 'Auto' && working.drivers.every((d) => d.excluded)) problems.push('At least one rated driver is required.');
    setErrors(problems);
    if (problems.length || !type || !draft) return;
    const lenderChange = type === 'Mortgagee / loss payee';
    const vehicleChange = /vehicle|driver|Garaging/i.test(type);
    const docs: PolicyDocument[] = [{ name: `Amended Declarations — ${type}`, date: effective, kind: 'Endorsement' }];
    if (policy.type === 'Auto' && vehicleChange) docs.push({ name: 'Auto ID Cards (amended)', date: effective, kind: 'ID Card' });
    if (lenderChange) docs.push({ name: 'Evidence of Insurance — additional interest', date: today(), kind: 'Notice' });
    // Keep the vehicle's lienholder field in sync with its loss payee.
    const vehicles = lenderChange && policy.type === 'Auto' ? working.vehicles.map((v) => ({ ...v, lienholder: working.mortgagees?.find((m) => m.vehicleId === v.id)?.name ?? v.lienholder })) : working.vehicles;
    const description = policy.type === 'Auto' ? `${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'} · ${working.drivers.filter((d) => !d.excluded).length} driver${working.drivers.filter((d) => !d.excluded).length === 1 ? '' : 's'}${working.drivers.some((d) => d.excluded) ? ' · excluded driver on file' : ''}` : policy.description;
    const result = endorsePolicy(policy.number, { drivers: working.drivers, vehicles, autoCoverages: working.autoCoverages, homeCoverages: working.homeCoverages, mortgagees: working.mortgagees, premium: newPremium, description }, { type, description: describe(), effective, premiumBefore: policy.premium, premiumAfter: newPremium, proRata }, docs);
    setDone(result);
    notify(`${type} processed — ${proRata >= 0 ? 'additional' : 'return'} premium ${money(Math.abs(proRata), true)}.`);
  };

  if (done) {
    const updated = policies.find((p) => p.number === policy.number) ?? policy;
    const updatedLenders = updated.mortgagees ?? [];
    const latestLender = updatedLenders[updatedLenders.length - 1];
    return <PortalLayout><main className="px-page narrow">
      <PageTitle crumbs={[{ label: fullName(customer ?? { firstName: '', lastName: '' }), to: `/customers/${policy.customerId}` }, { label: policy.number, to: `/policies/${policy.number}` }, { label: 'Policy change' }]} title="Policy change processed" />
      <Panel><div className="issued-hero"><CheckCircle2 size={40} /><div><h2>{done.type}</h2><p>{done.description}</p><p>Effective {done.effective} · endorsement {done.id} · new annual premium {money(done.premiumAfter)} · {done.proRata >= 0 ? 'additional' : 'return'} premium {money(Math.abs(done.proRata), true)}</p></div></div>
        <div className="issued-actions">
          <button type="button" className="outline-action" onClick={() => openDocument(decPageHtml(updated, customer), `declarations-${policy.number}`)}><FileText size={13} /> AMENDED DEC PAGE</button>
          {policy.type === 'Auto' && <button type="button" className="outline-action" onClick={() => openDocument(idCardsHtml(updated, customer), `id-cards-${policy.number}`)}><Printer size={13} /> ID CARDS</button>}
          {done.type === 'Mortgagee / loss payee' && latestLender && <button type="button" className="outline-action" onClick={() => openDocument(evidenceOfInsuranceHtml(updated, customer, latestLender), `evidence-${policy.number}`)}><Landmark size={13} /> EVIDENCE OF INSURANCE</button>}
          <button type="button" className="outline-action" onClick={() => start(done.type)}>ANOTHER CHANGE</button>
          <Link className="continue-action" to={`/policies/${policy.number}`}>BACK TO POLICY</Link>
        </div></Panel>
    </main></PortalLayout>;
  }

  const a = working.autoCoverages;
  const h = working.homeCoverages;
  const setA = (patch: Partial<AutoCoverages>) => set({ autoCoverages: { ...a!, ...patch } });
  const setH = (patch: Partial<HomeCoverages>) => set({ homeCoverages: { ...h!, ...patch } });
  const lenders = working.mortgagees ?? [];

  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: fullName(customer ?? { firstName: '', lastName: '' }), to: `/customers/${policy.customerId}` }, { label: policy.number, to: `/policies/${policy.number}` }, { label: 'Policy change' }]} title={`Policy change — ${policyLabel(policy)}`} subtitle={<><StatusBadge status={policy.status} /> {policy.number} · term {policy.effective} – {policy.expiration} · current premium {money(policy.premium)}</>} actions={<Link className="px-btn ghost" to={`/policies/${policy.number}`}><ArrowLeft size={14} /> Back to policy</Link>} />
    <div className="px-cols">
      <div className="px-main-col">
        <Panel title="What’s changing?"><div className="change-grid">{options.map((o) => <button type="button" key={o.type} className={`change-option ${type === o.type ? 'on' : ''}`} onClick={() => start(o.type)}>{o.icon}<strong>{o.type}</strong><small>{o.hint}</small></button>)}</div></Panel>

        {type && <Panel title={type}>
          {(type === 'Add driver' || type === 'Add vehicle') && <div className="change-box">
            <button type="button" className="px-btn ghost" onClick={() => setModal(type === 'Add driver' ? 'driver' : 'vehicle')}>{type === 'Add driver' ? 'Enter driver & MVR history' : 'Enter vehicle details'}</button>
            {changed && <p>{describe()}</p>}
          </div>}

          {(type === 'Change driver' || type === 'Exclude driver' || type === 'Remove driver') && <div className="change-box">
            <Field label="Driver"><select value={targetId} onChange={(e) => { setTargetId(e.target.value); setDraft(null); }}><option value="">-- Select --</option>{(type === 'Change driver' ? policy.drivers : policy.drivers.filter((d) => d.relationship !== 'Named Insured')).map((d) => <option key={d.id} value={d.id}>{d.firstName} {d.lastName} · {d.relationship}{d.excluded ? ' (excluded)' : ''}</option>)}</select></Field>
            {type === 'Change driver' && targetId && <button type="button" className="px-btn ghost" onClick={() => setModal('driver')}>Edit driver</button>}
            {type === 'Exclude driver' && targetId && (() => { const d = working.drivers.find((x) => x.id === targetId)!; return <label className="px-checks"><input type="checkbox" checked={!!d.excluded} onChange={(e) => set({ drivers: working.drivers.map((x) => (x.id === targetId ? { ...x, excluded: e.target.checked } : x)) })} /> Exclude {d.firstName} from all coverage under this policy (requires signed AU-220). Excluded drivers are not rated.</label>; })()}
            {type === 'Remove driver' && targetId && <label className="px-checks"><input type="checkbox" checked={!working.drivers.some((d) => d.id === targetId)} onChange={(e) => set({ drivers: e.target.checked ? policy.drivers.filter((d) => d.id !== targetId) : policy.drivers })} /> Confirm the driver no longer lives in the household or has their own insurance.</label>}
            {!nonNamed.length && type !== 'Change driver' && <p className="px-muted">Only the named insured is on this policy.</p>}
          </div>}

          {(type === 'Replace vehicle' || type === 'Remove vehicle') && <div className="change-box">
            <Field label="Vehicle"><select value={targetId} onChange={(e) => { setTargetId(e.target.value); setDraft(type === 'Remove vehicle' && e.target.value ? { ...policy, vehicles: policy.vehicles.filter((v) => v.id !== e.target.value), mortgagees: (policy.mortgagees ?? []).filter((m) => m.vehicleId !== e.target.value) } : null); }}><option value="">-- Select --</option>{policy.vehicles.map((v) => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>)}</select></Field>
            {type === 'Replace vehicle' && targetId && <button type="button" className="px-btn ghost" onClick={() => setModal('vehicle')}>Enter replacement vehicle</button>}
            {type === 'Remove vehicle' && policy.vehicles.length === 1 && <p className="needs">This is the only vehicle — it can’t be removed. Cancel the policy instead.</p>}
          </div>}

          {type === 'Garaging address' && <div className="px-grid3">
            <Field label="New garaging ZIP" required><input value={garaging} onChange={(e) => { const zip = e.target.value.replace(/\D/g, '').slice(0, 5); setGaraging(zip); setDraft(zip.length === 5 ? { ...policy, vehicles: policy.vehicles.map((v) => ({ ...v, garagingZip: zip })) } : null); }} /></Field>
            <p className="px-muted span2">Applies to all {policy.vehicles.length} vehicles. ERIE Rate Lock® premiums can change when the garaging address changes.</p>
          </div>}

          {type === 'Coverage change' && a && <div className="px-grid3">
            <Field label="Bodily injury"><select value={a.bodilyInjury} onChange={(e) => setA({ bodilyInjury: e.target.value })}>{BI_OPTIONS.map((o) => <option key={o}>{o}</option>)}</select></Field>
            <Field label="Property damage"><select value={a.propertyDamage} onChange={(e) => setA({ propertyDamage: e.target.value })}>{PD_OPTIONS.map((o) => <option key={o} value={o}>${o}</option>)}</select></Field>
            <Field label="Uninsured / underinsured"><select value={a.uninsuredMotorist} onChange={(e) => setA({ uninsuredMotorist: e.target.value })}>{UM_OPTIONS.map((o) => <option key={o}>{o}</option>)}</select></Field>
            <Field label="Comprehensive deductible"><select value={a.comprehensiveDeductible} onChange={(e) => setA({ comprehensiveDeductible: Number(e.target.value) })}>{[0, 100, 250, 500, 1000].map((o) => <option key={o} value={o}>${o}</option>)}</select></Field>
            <Field label="Collision deductible"><select value={a.collisionDeductible} onChange={(e) => setA({ collisionDeductible: Number(e.target.value) })}>{[100, 250, 500, 1000, 2000].map((o) => <option key={o} value={o}>${o}</option>)}</select></Field>
            <div className="px-checks span3 inline"><label><input type="checkbox" checked={a.autoPlus} onChange={(e) => setA({ autoPlus: e.target.checked })} /> ERIE Auto Plus®</label><label><input type="checkbox" checked={a.emergencyRoadService} onChange={(e) => setA({ emergencyRoadService: e.target.checked })} /> Emergency road service</label><label><input type="checkbox" checked={a.transportationExpense} onChange={(e) => setA({ transportationExpense: e.target.checked })} /> Transportation expenses</label><label><input type="checkbox" checked={a.newAutoSecurity} onChange={(e) => setA({ newAutoSecurity: e.target.checked })} /> New Auto Security</label></div>
          </div>}

          {type === 'Coverage change' && h && <div className="px-grid3">
            {h.form !== 'HO-4' && <Field label={h.form === 'HO-6' ? 'Coverage A — Additions & alterations' : 'Coverage A — Dwelling'}><input type="number" min={0} step={5000} value={h.dwelling} onChange={(e) => setH({ dwelling: Math.max(0, Number(e.target.value) || 0) })} /></Field>}
            {(h.form === 'HO-4' || h.form === 'HO-6' || h.form === 'DP-3') && <Field label={h.form === 'DP-3' ? 'Coverage C — Landlord furnishings' : 'Coverage C — Personal property'}><input type="number" min={0} step={1000} value={h.contentsLimit ?? 0} onChange={(e) => setH({ contentsLimit: Math.max(0, Number(e.target.value) || 0) })} /></Field>}
            <Field label={h.form === 'DP-3' ? 'Premises liability' : 'Personal liability'}><select value={h.personalLiability} onChange={(e) => setH({ personalLiability: Number(e.target.value) })}>{[100000, 300000, 500000, 1000000].map((o) => <option key={o} value={o}>{money(o)}</option>)}</select></Field>
            <Field label="Deductible"><select value={h.deductible} onChange={(e) => setH({ deductible: Number(e.target.value) })}>{[500, 1000, 2500, 5000].map((o) => <option key={o} value={o}>{money(o)}</option>)}</select></Field>
            <div className="px-checks span3 inline"><label><input type="checkbox" checked={h.waterBackup} onChange={(e) => setH({ waterBackup: e.target.checked })} /> Water backup</label><label><input type="checkbox" checked={h.equipmentBreakdown} onChange={(e) => setH({ equipmentBreakdown: e.target.checked })} /> Equipment breakdown</label><label><input type="checkbox" checked={h.identityRecovery} onChange={(e) => setH({ identityRecovery: e.target.checked })} /> Identity recovery</label><label><input type="checkbox" checked={h.serviceLine} onChange={(e) => setH({ serviceLine: e.target.checked })} /> Service line</label></div>
          </div>}

          {type === 'Mortgagee / loss payee' && <>
            {lenders.length === 0 ? <p className="px-muted">No mortgagees or loss payees on file.</p> : <table className="px-table"><thead><tr><th>Interest</th><th>Name & clause</th><th>Loan #</th><th>Address</th><th /></tr></thead><tbody>{lenders.map((m) => <tr key={m.id}><td>{m.role}{m.vehicleId ? <small className="cell-note">{working.vehicles.find((v) => v.id === m.vehicleId)?.model}</small> : null}</td><td>{m.name}{m.clause !== 'None' ? `, ${m.clause}` : ''}</td><td className="mono">{m.loanNumber}</td><td>{m.address}, {m.city}, {m.state} {m.zip}</td><td className="row-actions"><button type="button" onClick={() => setLender(m)} aria-label={`Edit ${m.name}`}><Pencil size={14} /></button><button type="button" onClick={() => set({ mortgagees: lenders.filter((x) => x.id !== m.id) })} aria-label={`Remove ${m.name}`}><Trash2 size={14} /></button></td></tr>)}</tbody></table>}
            {!lender && <button type="button" className="px-btn ghost" onClick={() => setLender(blankLender(policy.type === 'Auto' ? policy.vehicles[0]?.id : undefined))}><Plus size={14} /> Add {policy.type === 'Auto' ? 'loss payee' : 'mortgagee'}</button>}
            {lender && <LenderForm value={lender} vehicles={policy.type === 'Auto' ? policy.vehicles : []} onCancel={() => setLender(null)} onSave={(m) => { set({ mortgagees: lenders.some((x) => x.id === m.id) ? lenders.map((x) => (x.id === m.id ? m : x)) : [...lenders, m] }); setLender(null); }} />}
          </>}
        </Panel>}
        {errors.length > 0 && <ul className="quote-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      </div>

      <div className="px-side-col">
        <Panel title="Premium impact">
          <Field label="Effective date" required><input type="date" value={effective} min={policy.effective} max={policy.expiration} onChange={(e) => setEffective(e.target.value)} disabled={!type} /></Field>
          {type && !validDate && <p className="needs">Choose a date in the policy term.</p>}
          <dl className="px-dl"><dt>Current premium</dt><dd>{money(policy.premium)}</dd><dt>New annual premium</dt><dd><strong>{money(newPremium)}</strong></dd><dt>{proRata >= 0 ? 'Additional premium' : 'Return premium'}</dt><dd className={proRata < 0 ? 'credit-text' : ''}>{money(Math.abs(proRata), true)} pro rata</dd></dl>
          <button type="button" className="px-btn wide" disabled={!type || !changed} onClick={submit}>Submit policy change</button>
          <p className="px-muted">Pro rata over the days remaining in the term. Additional premium is added to the next bill; return premium is credited.</p>
        </Panel>
        <Panel title="Recent changes">{(policy.endorsements ?? []).length === 0 ? <p className="px-muted">No changes this term.</p> : <ul className="px-list">{policy.endorsements!.slice(0, 5).map((e) => <li key={e.id}><strong>{e.effective}</strong> {e.description} <small>({e.proRata >= 0 ? '+' : '−'}{money(Math.abs(e.proRata), true)})</small></li>)}</ul>}</Panel>
      </div>
    </div>

    {modal === 'driver' && <DriverModal driver={type === 'Change driver' ? working.drivers.find((d) => d.id === targetId)! : { id: `D${Date.now()}`, firstName: '', lastName: customer?.lastName ?? '', dob: '', gender: 'M', maritalStatus: 'Single', relationship: 'Other Household', licenseState: state, licenseNumber: '', yearsLicensed: 0, violations: 0, accidents: 0, driverTraining: false, goodStudent: false }} onClose={() => setModal(null)} onSave={(d: Driver) => { set({ drivers: working.drivers.some((x) => x.id === d.id) ? working.drivers.map((x) => (x.id === d.id ? d : x)) : [...working.drivers, d] }); setModal(null); }} />}
    {modal === 'vehicle' && <VehicleModal vehicle={{ id: `V${Date.now()}`, year: new Date().getFullYear() - 2, make: 'Toyota', model: '', vin: '', use: 'Commute', annualMiles: 12000, garagingZip: policy.vehicles[0]?.garagingZip ?? customer?.zip ?? '', antiTheft: true, airbags: true, antiLock: true, lienholder: '', reducedUsage: false }} onClose={() => setModal(null)} onSave={(v: Vehicle) => { set(type === 'Replace vehicle' ? { vehicles: policy.vehicles.map((x) => (x.id === targetId ? v : x)), mortgagees: (policy.mortgagees ?? []).map((m) => (m.vehicleId === targetId ? { ...m, vehicleId: v.id } : m)) } : { vehicles: [...working.vehicles, v] }); setModal(null); }} />}
  </main></PortalLayout>;
}

function LenderForm({ value, vehicles, onCancel, onSave }: { value: Mortgagee; vehicles: Vehicle[]; onCancel: () => void; onSave: (m: Mortgagee) => void }) {
  const [m, setM] = useState(value);
  const [error, setError] = useState('');
  const s = <K extends keyof Mortgagee>(k: K, v: Mortgagee[K]) => setM({ ...m, [k]: v });
  const save = () => {
    if (!m.name.trim() || !m.loanNumber.trim() || !m.address.trim() || !m.city.trim() || !/^\d{5}$/.test(m.zip)) return setError('Lender name, loan number and full mailing address (5-digit ZIP) are required.');
    onSave({ ...m, name: m.name.trim(), loanNumber: m.loanNumber.trim() });
  };
  return <div className="change-box">
    <div className="px-grid3">
      <Field label="Interest"><select value={m.role} onChange={(e) => s('role', e.target.value as Mortgagee['role'])}>{(vehicles.length ? ['Loss payee', 'Lienholder'] : ['First mortgagee', 'Second mortgagee', 'Loss payee']).map((r) => <option key={r}>{r}</option>)}</select></Field>
      {vehicles.length > 0 && <Field label="Vehicle"><select value={m.vehicleId} onChange={(e) => s('vehicleId', e.target.value)}>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>)}</select></Field>}
      <Field label="Clause"><select value={m.clause} onChange={(e) => s('clause', e.target.value as Mortgagee['clause'])}><option value="ISAOA/ATIMA">ISAOA/ATIMA</option><option value="ISAOA">ISAOA</option><option value="ATIMA">ATIMA</option><option value="None">None</option></select></Field>
      <Field label="Lender / servicer name" required className="span2"><input value={m.name} onChange={(e) => s('name', e.target.value)} placeholder="Legal entity name" /></Field>
      <Field label="Loan number" required><input value={m.loanNumber} onChange={(e) => s('loanNumber', e.target.value)} /></Field>
      <Field label="Mailing address" required className="span3"><input value={m.address} onChange={(e) => s('address', e.target.value)} placeholder="Street or PO Box" /></Field>
      <Field label="City" required><input value={m.city} onChange={(e) => s('city', e.target.value)} /></Field>
      <Field label="State"><select value={m.state} onChange={(e) => s('state', e.target.value)}>{[...new Set([...STATES, m.state])].map((st) => <option key={st}>{st}</option>)}</select></Field>
      <Field label="ZIP" required><input value={m.zip} onChange={(e) => s('zip', e.target.value.replace(/\D/g, '').slice(0, 5))} /></Field>
    </div>
    <p className="px-muted">ISAOA = its successors and/or assigns · ATIMA = as their interests may appear. Use the clause exactly as the lender’s instructions show.</p>
    {error && <div className="agent-error block">{error}</div>}
    <div className="px-form-actions"><button type="button" className="px-btn ghost" onClick={onCancel}>Cancel</button><button type="button" className="px-btn" onClick={save}>Save interest</button></div>
  </div>;
}
