import { useMemo, useState } from 'react';
import { Info, Plus, Trash2 } from 'lucide-react';
import { STATES } from '@/data/content';
import { ageFrom } from '@/lib/rating';
import { driverErrors, driverFromPerson, Errors, householdFor, maskDob, maskLicense, needsStudentQuestion, personName, relationshipLabel } from '@/lib/personalLines';
import type { Driver } from '@/data/types';
import { usePl } from '@/pages/pl/PersonalQuote';
import { DateInput, ErrorBanner, PlModal, Row, StatusIcon, YesNo } from '@/pages/pl/PlUi';

const YEARS_IN_STATE: NonNullable<Driver['yearsInState']>[] = ['Less than 1 year', '1 Year or more', '3 Years or more', '5 Years or more'];

export default function DriversStep() {
  const { quote, update, go, busy, saveExit } = usePl();
  const [editing, setEditing] = useState<Driver | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [banner, setBanner] = useState(false);
  const [replaceId, setReplaceId] = useState('');
  const [removeId, setRemoveId] = useState('');
  const drivers = quote.drivers;
  const household = useMemo(() => householdFor(quote), [quote.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = (d: Driver, i: number): 'ok' | 'warn' | 'error' => {
    const invalid = Object.keys(driverErrors(d, i === 0)).length > 0;
    if (invalid && (failed.includes(d.id) || i === 0)) return 'error';
    return d.reviewed && !invalid ? 'ok' : invalid && d.reviewed ? 'error' : 'warn';
  };
  const open = (d: Driver, fresh = false) => { setEditing({ ...d }); setIsNew(fresh); setShowErrors(failed.includes(d.id)); };
  const editErrors: Errors = editing ? driverErrors(editing, drivers[0]?.id === editing.id) : {};
  const err = (k: string) => (showErrors ? editErrors[k] : undefined);
  const set = <K extends keyof Driver>(k: K, v: Driver[K]) => setEditing((d) => (d ? { ...d, [k]: v } : d));

  // The first named insured is the quote's applicant: keep name and date of birth in sync.
  const commit = (d: Driver) => update((q) => ({ drivers: q.drivers.some((x) => x.id === d.id) ? q.drivers.map((x) => (x.id === d.id ? d : x)) : [...q.drivers, d], applicant: q.drivers[0]?.id === d.id ? { ...q.applicant, firstName: d.firstName, middleName: d.middleName ?? q.applicant.middleName, lastName: d.lastName, dob: d.dob || q.applicant.dob } : q.applicant, pl: { ...q.pl!, rated: false } }));

  const save = () => {
    if (!editing) return;
    if (Object.keys(editErrors).length) { setShowErrors(true); setBanner(true); setFailed((f) => [...new Set([...f, editing.id])]); return; }
    const d = { ...editing, reviewed: true, excluded: editing.driverType === 'Excluded Driver' };
    busy(`Saving Driver: ${personName(d)}`, () => {
      commit(d);
      setFailed((f) => f.filter((x) => x !== d.id));
      setEditing(null);
      setBanner(false);
    }, 900);
  };

  const submit = () => {
    if (editing) { save(); return; }
    // Valid drivers are accepted; the first incomplete driver opens with its errors.
    const bad = drivers.filter((d, i) => Object.keys(driverErrors(d, i === 0)).length);
    update((q) => ({ drivers: q.drivers.map((d, i) => (Object.keys(driverErrors(d, i === 0)).length ? d : { ...d, reviewed: true })) }));
    if (bad.length) { setFailed(bad.map((d) => d.id)); setBanner(true); open(bad[0]); setShowErrors(true); window.scrollTo(0, 0); return; }
    if (!drivers.length) { setBanner(true); return; }
    busy('One Moment Please...', () => go('vehicles', true), 600);
  };

  const replaceWith = (personId: string) => {
    const p = household.people.find((x) => x.id === personId);
    const target = drivers.find((d) => d.id === replaceId);
    if (!p || !target) return;
    const fresh = { ...driverFromPerson(p, quote, false), id: target.id, relationship: target.relationship === 'Named Insured' ? target.relationship : '' as const };
    commit(fresh);
    setReplaceId('');
    open(fresh);
  };

  const remove = () => {
    update((q) => ({ drivers: q.drivers.filter((d) => d.id !== removeId), vehicles: q.vehicles.map((v) => ({ ...v, primaryOperatorId: v.primaryOperatorId === removeId ? '' : v.primaryOperatorId, partTimeOperatorId: v.partTimeOperatorId === removeId ? '' : v.partTimeOperatorId, reviewed: v.primaryOperatorId === removeId ? false : v.reviewed })), pl: { ...q.pl!, rated: false, secondNamedInsuredId: q.pl!.secondNamedInsuredId === removeId ? '' : q.pl!.secondNamedInsuredId } }));
    if (editing?.id === removeId) setEditing(null);
    setRemoveId('');
  };

  // Household record this driver may match (prefill data with license history).
  const matchFor = (d: Driver) => household.people.find((p) => p.id !== 'HH1' && p.licenseNumber && `${p.firstName} ${p.lastName}`.toLowerCase() === personName(d).toLowerCase());
  const onQuote = new Set(drivers.map((d) => personName(d).toLowerCase()));
  const first = editing && drivers[0]?.id === editing.id;

  return <>
    <h1 className="pl-title">Drivers</h1>
    <ErrorBanner show={banner} />
    <section className="pl-card pl-table-card">
      <table className="pl-table">
        <thead><tr><th aria-label="Status" /><th>Name</th><th>Birth Year</th><th>License</th><th>Tax ID</th><th>Relationship</th><th>Driver Type</th><th aria-label="Actions" /></tr></thead>
        <tbody>{drivers.map((d, i) => <tr key={d.id} className={editing?.id === d.id ? 'selected' : ''}>
          <td><StatusIcon state={status(d, i)} /></td>
          <td>{personName(d)}{d.suffix ? ` ${d.suffix}` : ''}</td>
          <td>{d.dob ? d.dob.slice(0, 4) : '--'}</td>
          <td>{maskLicense(d.licenseState, d.licenseNumber)}</td>
          <td>{d.taxId ? `***-**-${d.taxId.slice(-4)}` : '--'}</td>
          <td>{relationshipLabel(d)}</td>
          <td>{d.driverType ?? 'Insured Driver'}</td>
          <td className="pl-row-actions"><button type="button" className="pl-btn outline tiny" onClick={() => open(d)}>View/Edit</button><button type="button" className="pl-btn outline tiny" onClick={() => setReplaceId(d.id)}>Replace</button>{i > 0 && <button type="button" className="pl-trash" aria-label={`Delete ${personName(d)}`} onClick={() => setRemoveId(d.id)}><Trash2 size={14} /></button>}</td>
        </tr>)}</tbody>
      </table>
      {!editing && <button type="button" className="pl-btn outline add" onClick={() => open({ ...driverFromPerson({ id: `N${Date.now()}`, firstName: '', lastName: quote.applicant.lastName, gender: '', dob: '', taxId: '', licenseState: quote.applicant.state, licenseNumber: '' }, quote, false), id: `D${Date.now()}`, firstName: '', dateFirstLicensed: '' }, true)}><Plus size={13} /> ADD DRIVER</button>}

      {editing && <div className="pl-editor">
        <h2 className="pl-subtitle">Driver Information</h2>
        <div className="pl-card pl-two inner">
          <div className="pl-col">
            <Row label="Driver/Non-Driver Type" required error={err('driverType')}><select aria-label="Driver/Non-Driver Type" value={editing.driverType ?? ''} onChange={(e) => set('driverType', e.target.value as Driver['driverType'])}><option value="">-- Select --</option><option>Insured Driver</option><option>Excluded Driver</option><option>Non-Driver</option></select></Row>
            <Row label="Legal First Name" required error={err('firstName')} tip="Enter the name exactly as it appears on the driver's license."><input aria-label="Legal First Name" value={editing.firstName} onChange={(e) => set('firstName', e.target.value)} /></Row>
            <Row label="Preferred First Name"><input aria-label="Preferred First Name" value={editing.preferredName ?? ''} onChange={(e) => set('preferredName', e.target.value)} /></Row>
            <Row label="Legal Middle Name"><input aria-label="Legal Middle Name" value={editing.middleName ?? ''} onChange={(e) => set('middleName', e.target.value)} /></Row>
            <Row label="Legal Last Name" required error={err('lastName')}><input aria-label="Legal Last Name" value={editing.lastName} onChange={(e) => set('lastName', e.target.value)} /></Row>
            <Row label="Suffix"><select aria-label="Suffix" value={editing.suffix ?? ''} onChange={(e) => set('suffix', e.target.value)}><option value="">-- Select --</option>{['Jr', 'Sr', 'II', 'III', 'IV'].map((s) => <option key={s}>{s}</option>)}</select></Row>
            <Row label=""><label className="pl-inline-check"><input type="checkbox" checked={!!editing.differentNameOnLicense} onChange={(e) => set('differentNameOnLicense', e.target.checked)} /> Different Name on License</label></Row>
            <Row label="Date Of Birth" required error={err('dob')}><DateInput label="Date Of Birth" value={editing.dob} onChange={(iso) => set('dob', iso)} invalid={!!err('dob')} /></Row>
            <Row label="Tax ID Number" error={err('taxId')} tip="Optional. Used to verify identity and order reports."><span className="pl-stack"><span className="pl-inline"><input aria-label="Tax ID Number" value={editing.taxId ?? ''} onChange={(e) => set('taxId', e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="" /><select aria-label="Tax ID type" value={editing.taxIdType ?? 'SSN'} onChange={(e) => set('taxIdType', e.target.value as Driver['taxIdType'])}><option>SSN</option><option>ITIN</option></select></span><small className="pl-muted">(Optional)</small><button type="button" className="pl-btn outline small" onClick={() => busy('Verifying Tax ID Number...', () => set('taxIdVerified', /^\d{9}$/.test(editing.taxId ?? '')), 800)}>VERIFY TAX ID NUMBER</button>{editing.taxIdVerified && <span className="pl-ok">Verified</span>}</span></Row>
          </div>
          <div className="pl-col">
            <Row label="Gender" required error={err('gender')}><select aria-label="Gender" value={editing.gender} onChange={(e) => set('gender', e.target.value as Driver['gender'])}><option value="">-- Select --</option><option value="M">Male</option><option value="F">Female</option><option value="X">Non-Binary</option></select></Row>
            <Row label="Relationship" required={!first} error={err('relationship')}>{first ? <span>Insured</span> : <select aria-label="Relationship" value={editing.relationship} onChange={(e) => set('relationship', e.target.value as Driver['relationship'])}><option value="">-- Select --</option><option>Spouse</option><option>Child</option><option>Parent</option><option>Other Relative</option><option value="Other Household">Other</option></select>}</Row>
            <Row label="Marital Status" required error={err('maritalStatus')}><select aria-label="Marital Status" value={editing.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value as Driver['maritalStatus'])}><option value="">-- Select --</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option></select></Row>
            {editing.driverType !== 'Non-Driver' && <>
              <Row label="Date First Licensed" required error={err('dateFirstLicensed')} tip="Month and year the driver was first licensed in any state."><span className="pl-stack"><input aria-label="Date First Licensed" className="short" value={editing.dateFirstLicensed ?? ''} placeholder="mm/yyyy" onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 6); set('dateFirstLicensed', d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d); }} /><small className="pl-muted">(mm/yyyy)</small></span></Row>
              <Row label="License State" required error={err('licenseState')}><select aria-label="License State" value={editing.licenseState} onChange={(e) => set('licenseState', e.target.value)}><option value="">-- Select --</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></Row>
              <Row label="License Number" appReq tip="Verifying the license orders the motor vehicle record."><span className="pl-stack"><input aria-label="License Number" value={editing.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} /><button type="button" className="pl-btn outline small" onClick={() => busy('Verifying Driver License...', () => set('dlnVerified', editing.licenseState === 'WI' ? /^[A-Z]\d{13}$/.test(editing.licenseNumber) : editing.licenseNumber.length >= 5), 800)}>VERIFY DLN</button>{editing.dlnVerified !== undefined && <span className={editing.dlnVerified ? 'pl-ok' : 'pl-bad'}>{editing.dlnVerified ? 'Verified' : 'License could not be verified'}</span>}</span></Row>
              <Row label="Years Licensed in State" required error={err('yearsInState')}><select aria-label="Years Licensed in State" value={editing.yearsInState ?? ''} onChange={(e) => set('yearsInState', e.target.value as Driver['yearsInState'])}><option value="">-- Select --</option>{YEARS_IN_STATE.map((y) => <option key={y}>{y}</option>)}</select></Row>
            </>}
            <Row label="YourTurn Rewards Program" tip="Telematics-free safe driving rewards — enrollment is optional."><input type="checkbox" aria-label="YourTurn Rewards Program" checked={!!editing.yourTurn} onChange={(e) => set('yourTurn', e.target.checked)} /></Row>
          </div>
          {needsStudentQuestion(editing) && <Row wide label="Full-Time Student Living at College Without Use of a Vehicle" required error={err('collegeStudentAway')} className="question"><YesNo label="Full-Time Student Living at College Without Use of a Vehicle" name="student" value={editing.collegeStudentAway === '' || !editing.collegeStudentAway ? undefined : editing.collegeStudentAway === 'yes'} onChange={(v) => set('collegeStudentAway', v ? 'yes' : 'no')} /></Row>}
          {(() => { const m = matchFor(editing); return m && !first ? <div className="pl-match wide"><div className="pl-info-line"><Info size={14} /> The customer information you provided possibly matches an existing customer record.</div><p><strong>The information in bold matches your customer.</strong></p><div className="pl-match-row"><button type="button" className="pl-btn outline" onClick={() => setEditing((d) => (d ? { ...d, gender: d.gender || m.gender, licenseState: m.licenseState, licenseNumber: m.licenseNumber, dateFirstLicensed: d.dateFirstLicensed || `0${(Number(m.dob.slice(5, 7)) % 9) + 1}/${Number(m.dob.slice(0, 4)) + 16}`, yearsInState: d.yearsInState || (ageFrom(m.dob) - 16 >= 5 ? '5 Years or more' : ageFrom(m.dob) - 16 >= 3 ? '3 Years or more' : '1 Year or more') } : d))}>SELECT CUSTOMER</button><div><strong>{m.firstName} {m.lastName}</strong><span><strong>{`${quote.applicant.address}, ${quote.applicant.city}, ${quote.applicant.state} ${quote.applicant.zip}`.toUpperCase()}</strong></span><span>Date of birth: <strong>{maskDob(m.dob)}</strong> ({ageFrom(m.dob)})</span><span>License Number: <strong>{m.licenseState}{m.licenseNumber.slice(0, 9)}****</strong></span></div></div></div> : <div className="pl-info-line wide"><Info size={14} /> No existing ERIE customer records found. If this is an existing customer, please check what you entered.</div>; })()}
          <div className="pl-editor-actions wide"><button type="button" className="pl-btn outline" onClick={() => { setEditing(null); setShowErrors(false); if (isNew) setIsNew(false); }}>CANCEL</button><button type="button" className="pl-btn" onClick={save}>SAVE DRIVER</button></div>
        </div>
      </div>}
    </section>
    <div className="pl-footer"><button type="button" className="pl-btn outline" onClick={saveExit}>SAVE &amp; EXIT</button><div><button type="button" className="pl-btn outline" onClick={() => go('customer')}>PREVIOUS</button><button type="button" className="pl-btn" onClick={submit}>CONTINUE</button></div></div>

    {replaceId && <PlModal title="Replace Driver" onCancel={() => setReplaceId('')}>
      <p>Replace <strong>{personName(drivers.find((d) => d.id === replaceId)!)}</strong> with a household member from prefill:</p>
      <div className="pl-pick">{household.people.filter((p) => p.id !== 'HH1' && !onQuote.has(`${p.firstName} ${p.lastName}`.toLowerCase())).map((p) => <button type="button" key={p.id} className="pl-btn outline" onClick={() => replaceWith(p.id)}>{p.lastName}, {p.firstName}</button>)}</div>
      {household.people.filter((p) => p.id !== 'HH1' && !onQuote.has(`${p.firstName} ${p.lastName}`.toLowerCase())).length === 0 && <p className="pl-muted">Every household member is already on this quote. Edit the driver instead.</p>}
    </PlModal>}
    {removeId && <PlModal title="Delete Driver" warn onCancel={() => setRemoveId('')} onContinue={remove} continueLabel="DELETE">Remove <strong>{personName(drivers.find((d) => d.id === removeId)!)}</strong> from this quote? Vehicles assigned to this driver will need a new primary operator.</PlModal>}
  </>;
}
