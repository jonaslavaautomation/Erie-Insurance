import { useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { decodeVin, defaultVehicleCoverage, Errors, isValidVin, mailingLine, personName, vehicleUseLabel, vehicleErrors } from '@/lib/personalLines';
import type { Vehicle } from '@/data/types';
import { usePl } from '@/pages/pl/PersonalQuote';
import { ErrorBanner, PlModal, Row, StatusIcon, YesNo } from '@/pages/pl/PlUi';

export const ANTI_THEFT = ['Active Disabling', 'Active Non-Disabling & VIN Etching', 'Alarm', 'No', 'Passive Disabling', 'Passive Non-Disabling'];

export default function VehiclesStep() {
  const { quote, update, go, busy, saveExit } = usePl();
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [banner, setBanner] = useState(false);
  const [partTime, setPartTime] = useState(false);
  const [removeId, setRemoveId] = useState('');
  const { vehicles, drivers } = quote;
  const operators = drivers.filter((d) => d.driverType !== 'Non-Driver' && d.driverType !== 'Excluded Driver');

  const status = (v: Vehicle): 'ok' | 'warn' | 'error' => {
    const invalid = Object.keys(vehicleErrors(v, drivers)).length > 0;
    if (invalid && failed.includes(v.id)) return 'error';
    return v.reviewed && !invalid ? 'ok' : 'warn';
  };
  const open = (v: Vehicle) => { setEditing({ ...v }); setPartTime(!!v.partTimeOperatorId); setShowErrors(failed.includes(v.id)); };
  const errors: Errors = editing ? vehicleErrors(editing, drivers) : {};
  const err = (k: string) => (showErrors ? errors[k] : undefined);
  const set = <K extends keyof Vehicle>(k: K, v: Vehicle[K]) => setEditing((x) => (x ? { ...x, [k]: v } : x));
  const commit = (v: Vehicle) => update((q) => ({ vehicles: q.vehicles.some((x) => x.id === v.id) ? q.vehicles.map((x) => (x.id === v.id ? v : x)) : [...q.vehicles, v], pl: { ...q.pl!, rated: false } }));

  const changeVin = (raw: string) => {
    const vin = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17);
    const decoded = vin.length === 17 ? decodeVin(vin) : null;
    setEditing((x) => (x ? { ...x, vin, ...(decoded ? { year: decoded.year, make: decoded.make, model: decoded.model, modelDetails: decoded.modelDetails } : {}) } : x));
    if (vin.length === 17) setShowErrors(true);
  };

  const save = () => {
    if (!editing) return;
    if (Object.keys(errors).length) { setShowErrors(true); setBanner(true); setFailed((f) => [...new Set([...f, editing.id])]); return; }
    const v: Vehicle = { ...editing, reviewed: true, antiTheft: editing.antiTheftDevice !== 'No', partTimeOperatorId: partTime ? editing.partTimeOperatorId : '' };
    busy(`Saving Vehicle: ${v.year} ${v.make} ${v.model}`, () => { commit(v); setFailed((f) => f.filter((x) => x !== v.id)); setEditing(null); setBanner(false); }, 900);
  };

  const submit = () => {
    if (editing) { save(); return; }
    const bad = vehicles.filter((v) => Object.keys(vehicleErrors(v, drivers)).length);
    update((q) => ({ vehicles: q.vehicles.map((v) => (Object.keys(vehicleErrors(v, q.drivers)).length ? v : { ...v, reviewed: true })) }));
    if (!vehicles.length) { setBanner(true); return; }
    if (bad.length) { setFailed(bad.map((v) => v.id)); setBanner(true); open(bad[0]); setShowErrors(true); window.scrollTo(0, 0); return; }
    busy('One Moment Please...', () => go(quote.products.includes('home') ? 'dwelling' : 'reports', true), 600);
  };

  const unassigned = operators.filter((d) => !vehicles.some((v) => v.primaryOperatorId === d.id || v.partTimeOperatorId === d.id));
  const blank = (): Vehicle => ({ id: `V${Date.now()}`, year: 0, make: '', model: '', modelDetails: '', vin: '', use: 'Commute', annualMiles: 0, garagingZip: quote.applicant.zip, antiTheft: false, airbags: true, antiLock: true, lienholder: '', reducedUsage: false, vehicleType: 'Private Passenger', antiTheftDevice: '', primaryOperatorId: '', daysPerWeek: 5, milesToWork: 10, drivenYearRound: true, garagingAddress: mailingLine(quote), registeredOwner: `${quote.applicant.firstName} ${quote.applicant.lastName}`.toUpperCase(), reviewed: false, coverage: defaultVehicleCoverage(quote.autoCoverages) });

  return <>
    <h1 className="pl-title">Vehicles</h1>
    <ErrorBanner show={banner} />
    <section className="pl-card pl-table-card">
      <table className="pl-table">
        <thead><tr><th aria-label="Status" /><th>Vehicle</th><th>VIN</th><th>Type</th><th>Use</th><th>Days / Miles</th><th>Annual</th><th>Primary Operator</th><th aria-label="Delete" /></tr></thead>
        <tbody>{vehicles.map((v) => { const op = drivers.find((d) => d.id === v.primaryOperatorId); return <tr key={v.id} className={editing?.id === v.id ? 'selected' : ''}>
          <td><StatusIcon state={status(v)} /></td>
          <td><button type="button" className="pl-link" onClick={() => open(v)}>{v.year ? `${v.year} ${v.make} ${v.model}` : 'New vehicle'}</button></td>
          <td>{v.vin ? `...${v.vin.slice(-4)}` : '--'}</td>
          <td>{v.vehicleType ?? 'Private Passenger'}</td>
          <td>{vehicleUseLabel(v)}</td>
          <td>{v.daysPerWeek ?? '--'} / {v.use === 'Commute' ? v.milesToWork ?? '--' : '--'}</td>
          <td>{v.annualMiles ? v.annualMiles.toLocaleString() : '--'}</td>
          <td>{op ? personName(op) : '--'}</td>
          <td><button type="button" className="pl-trash" aria-label={`Delete ${v.year} ${v.make} ${v.model}`} onClick={() => setRemoveId(v.id)}><Trash2 size={14} /></button></td>
        </tr>; })}</tbody>
      </table>
      {!editing && <button type="button" className="pl-btn outline add" onClick={() => open(blank())}><Plus size={13} /> ADD VEHICLE</button>}

      {editing && <div className="pl-editor">
        <h2 className="pl-subtitle">Vehicle Information</h2>
        <div className="pl-card pl-two inner">
          <div className="pl-col">
            <Row label="Vehicle Type"><select aria-label="Vehicle Type" value={editing.vehicleType ?? 'Private Passenger'} onChange={(e) => set('vehicleType', e.target.value as Vehicle['vehicleType'])}><option>Private Passenger</option><option>Motorcycle</option><option>Motorhome</option><option>Trailer</option></select></Row>
            <Row label="VIN" appReq error={err('vin')} tip="17-character Vehicle Identification Number. Year, make and model fill in automatically."><input aria-label="VIN" className="mono" value={editing.vin} maxLength={17} onChange={(e) => changeVin(e.target.value)} onBlur={() => editing.vin && setShowErrors(true)} /></Row>
            <div className="pl-decoded">
              <Row label="Year"><strong>{editing.year || ''}</strong></Row>
              <Row label="Make"><strong>{editing.make}</strong></Row>
              <Row label="Model"><strong>{editing.model}</strong></Row>
              <Row label="Model Details"><strong>{editing.modelDetails}</strong></Row>
              {editing.vin.length === 17 && isValidVin(editing.vin) && editing.make === 'UNKNOWN MAKE' && <p className="pl-muted small">Manufacturer not in the mock VIN table — confirm the vehicle with the customer.</p>}
            </div>
            <Row label="Anti-Theft" required error={err('antiTheftDevice')}><select aria-label="Anti-Theft" value={editing.antiTheftDevice ?? ''} onChange={(e) => set('antiTheftDevice', e.target.value)}><option value="">-- Select --</option>{ANTI_THEFT.map((a) => <option key={a}>{a}</option>)}</select></Row>
            <Row label="Primary Operator" required error={err('primaryOperatorId') ?? err('partTimeOperatorId')}><span className="pl-stack"><select aria-label="Primary Operator" value={editing.primaryOperatorId ?? ''} onChange={(e) => set('primaryOperatorId', e.target.value)}><option value="">-- Select --</option>{operators.map((d) => <option key={d.id} value={d.id}>{personName(d)}</option>)}</select>{!partTime ? <button type="button" className="pl-link" onClick={() => setPartTime(true)}>Add Part-Time Operator</button> : <span className="pl-inline"><select aria-label="Part-Time Operator" value={editing.partTimeOperatorId ?? ''} onChange={(e) => set('partTimeOperatorId', e.target.value)}><option value="">-- Select --</option>{operators.filter((d) => d.id !== editing.primaryOperatorId).map((d) => <option key={d.id} value={d.id}>{personName(d)}</option>)}</select><button type="button" className="pl-link" onClick={() => { setPartTime(false); set('partTimeOperatorId', ''); }}>Remove</button></span>}</span></Row>
          </div>
          <div className="pl-col">
            <Row label="Primary Use" required error={err('use')}><select aria-label="Primary Use" value={editing.use} onChange={(e) => set('use', e.target.value as Vehicle['use'])}><option value="Pleasure">Pleasure</option><option value="Commute">Work/School</option><option value="Business">Business</option><option value="Farm">Farm</option></select></Row>
            <Row label="Days Driven per Week" required error={err('daysPerWeek')}><select aria-label="Days Driven per Week" value={editing.daysPerWeek ?? ''} onChange={(e) => set('daysPerWeek', Number(e.target.value))}><option value="">-- Select --</option>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}</select></Row>
            {editing.use === 'Commute' && <Row label="Miles Driven to Work" required error={err('milesToWork')}><span className="pl-inline"><input aria-label="Miles Driven to Work" className="tiny" inputMode="numeric" value={editing.milesToWork ?? ''} onChange={(e) => set('milesToWork', Number(e.target.value.replace(/\D/g, '').slice(0, 3)))} /><small className="pl-muted">One Way</small></span></Row>}
            <Row label="Annual Miles" required error={err('annualMiles')}><span className="pl-inline"><input aria-label="Annual Miles" className="tiny" inputMode="numeric" value={editing.annualMiles ? editing.annualMiles / 1000 : ''} onChange={(e) => set('annualMiles', Number(e.target.value.replace(/\D/g, '').slice(0, 3)) * 1000)} /><span>,000</span></span></Row>
            <Row label="Force Multi-Car Discount" tip="Apply the multi-car discount when the household's other vehicle is insured elsewhere."><input type="checkbox" aria-label="Force Multi-Car Discount" checked={!!editing.forceMultiCar} onChange={(e) => set('forceMultiCar', e.target.checked)} /></Row>
            <Row label="Driven Year-Round" required error={err('drivenYearRound')}><YesNo label="Driven Year-Round" name="yearRound" value={editing.drivenYearRound} onChange={(v) => set('drivenYearRound', v)} /></Row>
            <Row label="Garaging Address" required error={err('garagingAddress')}><select aria-label="Garaging Address" value={editing.garagingAddress ?? ''} onChange={(e) => set('garagingAddress', e.target.value)}><option value="">-- Select --</option><option value={mailingLine(quote)}>{mailingLine(quote)}</option></select></Row>
            <Row label="Registered Owner" tip="From the state registration record."><span>{editing.registeredOwner || '--'}</span></Row>
          </div>
          <div className="pl-editor-actions wide"><button type="button" className="pl-btn outline" onClick={() => { setEditing(null); setShowErrors(false); }}>CANCEL</button><button type="button" className="pl-btn" onClick={save}>SAVE VEHICLE</button></div>
        </div>
      </div>}
      {!editing && unassigned.length > 0 && vehicles.length > 0 && <div className="pl-warn-line"><AlertTriangle size={14} /> Not assigned to a vehicle: {unassigned.map(personName).join(', ')}. Assign each driver as a primary or part-time operator.</div>}
    </section>
    <div className="pl-footer"><button type="button" className="pl-btn outline" onClick={saveExit}>SAVE &amp; EXIT</button><div><button type="button" className="pl-btn outline" onClick={() => go('drivers')}>PREVIOUS</button><button type="button" className="pl-btn" onClick={submit}>CONTINUE</button></div></div>
    {removeId && <PlModal title="Delete Vehicle" warn onCancel={() => setRemoveId('')} onContinue={() => { update((q) => ({ vehicles: q.vehicles.filter((v) => v.id !== removeId), pl: { ...q.pl!, rated: false } })); if (editing?.id === removeId) setEditing(null); setRemoveId(''); }} continueLabel="DELETE">Remove this vehicle from the quote?</PlModal>}
  </>;
}
