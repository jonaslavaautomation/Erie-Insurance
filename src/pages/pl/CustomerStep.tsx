import { useMemo, useState } from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import { fullName, usePortal } from '@/data/store';
import { STATES } from '@/data/content';
import { escapeHtml as h, openDocument, simpleDocument } from '@/lib/documents';
import { ageFrom } from '@/lib/rating';
import { customerErrors, driverFromPerson, Errors, householdFor, mailingLine, maskDob, maskTail, personName, vehicleFromHousehold } from '@/lib/personalLines';
import type { Driver } from '@/data/types';
import { usePl } from '@/pages/pl/PersonalQuote';
import { DateInput, ErrorBanner, PlModal, Row, YesNo } from '@/pages/pl/PlUi';

const WI_COUNTIES = ['Adams', 'Ashland', 'Barron', 'Bayfield', 'Brown', 'Buffalo', 'Burnett', 'Calumet', 'Chippewa', 'Clark', 'Columbia', 'Crawford', 'Dane', 'Dodge', 'Door', 'Douglas', 'Dunn', 'Eau Claire', 'Florence', 'Fond du Lac', 'Forest', 'Grant', 'Green', 'Green Lake', 'Iowa', 'Iron', 'Jackson', 'Jefferson', 'Juneau', 'Kenosha', 'Kewaunee', 'La Crosse', 'Lafayette', 'Langlade', 'Lincoln', 'Manitowoc', 'Marathon', 'Marinette', 'Marquette', 'Menominee', 'Milwaukee', 'Monroe', 'Oconto', 'Oneida', 'Outagamie', 'Ozaukee', 'Pepin', 'Pierce', 'Polk', 'Portage', 'Price', 'Racine', 'Richland', 'Rock', 'Rusk', 'St. Croix', 'Sauk', 'Sawyer', 'Shawano', 'Sheboygan', 'Taylor', 'Trempealeau', 'Vernon', 'Vilas', 'Walworth', 'Washburn', 'Washington', 'Waukesha', 'Waupaca', 'Waushara', 'Winnebago', 'Wood'];
export const CARRIERS = ['American Family', 'Allstate', 'Auto-Owners', 'Farmers', 'GEICO', 'Liberty Mutual', 'Nationwide', 'Progressive', 'Secura', 'State Farm', 'Travelers', 'West Bend', 'Other', 'No Prior Insurance'];
const ADDITIONAL = ['Boat', 'Life', 'Personal Umbrella', 'Commercial Auto', 'Business', 'Personal Home - Owner', 'Personal Home - Condo', 'Personal Home - Tenant'];

export default function CustomerStep() {
  const { quote, pl, update, setPl, go, busy, saveExit } = usePl();
  const { customers, notify } = usePortal();
  const [errors, setErrors] = useState<Errors>({});
  const [editName, setEditName] = useState(false);
  const [editAddress, setEditAddress] = useState(false);
  const [replace, setReplace] = useState<'' | 'first' | 'second'>('');
  const [verifyMsg, setVerifyMsg] = useState<Record<string, string>>({});
  const a = quote.applicant;
  const first = quote.drivers[0];
  const second = quote.drivers.find((d) => d.id === pl.secondNamedInsuredId);
  const setDriver = (id: string, patch: Partial<Driver>) => update((q) => ({ drivers: q.drivers.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
  const setApplicant = (patch: Partial<typeof a>) => update((q) => ({ applicant: { ...q.applicant, ...patch } }));

  // Possible match to an existing customer record (same name, or same DOB and ZIP).
  const match = useMemo(() => customers.find((c) => c.id !== quote.customerId && ((c.lastName.toLowerCase() === a.lastName.toLowerCase() && c.firstName.toLowerCase() === a.firstName.toLowerCase()) || (c.dob === a.dob && c.zip === a.zip))), [customers, quote.customerId, a]);

  const verify = (kind: 'tax' | 'dln', d: Driver) => {
    busy(kind === 'tax' ? 'Verifying Tax ID Number...' : 'Verifying Driver License...', () => {
      const ok = kind === 'tax' ? /^\d{9}$/.test(d.taxId ?? '') : d.licenseState === 'WI' ? /^[A-Z]\d{13}$/.test(d.licenseNumber) : d.licenseNumber.length >= 5;
      setDriver(d.id, kind === 'tax' ? { taxIdVerified: ok } : { dlnVerified: ok });
      setVerifyMsg((m) => ({ ...m, [`${kind}-${d.id}`]: ok ? 'Verified' : kind === 'tax' ? 'Tax ID Number could not be verified' : 'License could not be verified — check state and number' }));
    }, 900);
  };

  const submit = () => {
    const e = customerErrors(quote);
    setErrors(e);
    if (Object.keys(e).length) { window.scrollTo(0, 0); return; }
    setPl({ completed: [...new Set([...pl.completed, 'customer'])] });
    busy('One Moment Please...', () => go(quote.products.includes('auto') ? 'drivers' : 'dwelling', true));
  };

  const insuredColumn = (d: Driver | undefined, which: 'first' | 'second') => {
    if (!d) return <div className="pl-col"><Row label="Second Named Insured"><select aria-label="Second Named Insured" value="" onChange={(e) => { if (e.target.value) { setPl({ secondNamedInsuredId: e.target.value }); setDriver(e.target.value, { relationship: 'Spouse' }); } }}><option value="">-- None --</option>{quote.drivers.slice(1).map((x) => <option key={x.id} value={x.id}>{personName(x).toUpperCase()}</option>)}</select></Row></div>;
    const n = which === 'first' ? '1' : '2';
    return <div className="pl-col">
      <Row label={which === 'first' ? 'First Named Insured' : 'Second Named Insured'} required={which === 'first'}>
        <span className="pl-ni"><strong>{personName(d)}</strong><span className="pl-ni-actions"><button type="button" className="pl-btn outline small" onClick={() => setEditName((v) => !v)}>{editName ? 'DONE' : 'EDIT'}</button><button type="button" className="pl-btn outline small" onClick={() => setReplace(which)}>REPLACE</button>{which === 'second' && <button type="button" className="pl-link" onClick={() => setPl({ secondNamedInsuredId: '' })}>Remove</button>}</span></span>
      </Row>
      {editName && <>
        <Row label="Legal First Name" required><input aria-label={`Legal First Name ${n}`} value={d.firstName} onChange={(e) => { setDriver(d.id, { firstName: e.target.value }); if (which === 'first') setApplicant({ firstName: e.target.value }); }} /></Row>
        <Row label="Preferred First Name"><input aria-label={`Preferred First Name ${n}`} value={d.preferredName ?? ''} onChange={(e) => setDriver(d.id, { preferredName: e.target.value })} /></Row>
        <Row label="Legal Middle Name"><input aria-label={`Legal Middle Name ${n}`} value={d.middleName ?? ''} onChange={(e) => setDriver(d.id, { middleName: e.target.value })} /></Row>
        <Row label="Legal Last Name" required><input aria-label={`Legal Last Name ${n}`} value={d.lastName} onChange={(e) => { setDriver(d.id, { lastName: e.target.value }); if (which === 'first') setApplicant({ lastName: e.target.value }); }} /></Row>
        <Row label="Suffix"><select aria-label={`Suffix ${n}`} value={d.suffix ?? ''} onChange={(e) => setDriver(d.id, { suffix: e.target.value })}><option value="">-- Select --</option>{['Jr', 'Sr', 'II', 'III', 'IV'].map((s) => <option key={s}>{s}</option>)}</select></Row>
      </>}
      <Row label="Deceased"><input type="checkbox" aria-label={`Deceased ${n}`} checked={!!d.deceased} onChange={(e) => setDriver(d.id, { deceased: e.target.checked })} /></Row>
      <Row label="Life Tenant" tip="A person with the right to live in the dwelling for life, while the title is held by someone else."><input type="checkbox" aria-label={`Life Tenant ${n}`} checked={!!d.lifeTenant} onChange={(e) => setDriver(d.id, { lifeTenant: e.target.checked })} /></Row>
      <Row label="Gender" required error={errors[`gender${n}`]}><select aria-label={`Gender ${n}`} value={d.gender} onChange={(e) => setDriver(d.id, { gender: e.target.value as Driver['gender'] })}><option value="">-- Select --</option><option value="M">Male</option><option value="F">Female</option><option value="X">Non-Binary</option></select></Row>
      <Row label="Date of Birth" required error={errors[`dob${n}`]}><DateInput label={`Date of Birth ${n}`} value={d.dob} onChange={(iso) => { setDriver(d.id, { dob: iso }); if (which === 'first') setApplicant({ dob: iso }); }} /></Row>
      <Row label="Tax ID Number"><span className="pl-stack"><input aria-label={`Tax ID Number ${n}`} value={d.taxId ? `***-**-${d.taxId.slice(-4)}` : ''} placeholder="Optional" onFocus={(e) => { e.target.value = d.taxId ?? ''; }} onChange={(e) => setDriver(d.id, { taxId: e.target.value.replace(/\D/g, '').slice(0, 9), taxIdVerified: false })} /><button type="button" className="pl-btn outline small" onClick={() => verify('tax', d)}>VERIFY TAX ID NUMBER</button>{verifyMsg[`tax-${d.id}`] && <span className={d.taxIdVerified ? 'pl-ok' : 'pl-bad'}>{d.taxIdVerified && <CheckCircle2 size={12} />} {verifyMsg[`tax-${d.id}`]}</span>}</span></Row>
      <Row label="License State"><select aria-label={`License State ${n}`} value={d.licenseState} onChange={(e) => setDriver(d.id, { licenseState: e.target.value })}><option value="">-- Select --</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></Row>
      <Row label="License Number" appReq><span className="pl-stack"><input aria-label={`License Number ${n}`} value={d.licenseNumber} onChange={(e) => setDriver(d.id, { licenseNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''), dlnVerified: false })} /><button type="button" className="pl-btn outline small" onClick={() => verify('dln', d)}>VERIFY DLN</button>{verifyMsg[`dln-${d.id}`] && <span className={d.dlnVerified ? 'pl-ok' : 'pl-bad'}>{d.dlnVerified && <CheckCircle2 size={12} />} {verifyMsg[`dln-${d.id}`]}</span>}</span></Row>
      {which === 'first' && <>
        <Row label="Primary Phone Number" required error={errors.phone}><input aria-label="Primary Phone Number" value={a.phone} onChange={(e) => setApplicant({ phone: formatPhone(e.target.value) })} placeholder="(xxx) xxx-xxxx" /></Row>
        <Row label="Primary Email" error={errors.email}><input aria-label="Primary Email" type="email" value={a.email} onChange={(e) => setApplicant({ email: e.target.value })} /></Row>
      </>}
    </div>;
  };

  return <>
    <h1 className="pl-title">Named Insured</h1>
    <ErrorBanner show={Object.keys(errors).length > 0} />
    <section className="pl-card pl-two">
      {insuredColumn(first, 'first')}
      {insuredColumn(second, 'second')}
    </section>
    {match && <div className="pl-match"><div className="pl-info-line"><Info size={14} /> The customer information you provided possibly matches an existing customer record.</div><p><strong>The information in bold matches your customer.</strong></p><div className="pl-match-row"><button type="button" className="pl-btn outline" onClick={() => { update({ customerId: match.id }); notify(`Quote linked to existing customer ${match.id}.`); }}>SELECT CUSTOMER</button><div><strong>{fullName(match).toUpperCase()}</strong><span><strong>{`${match.address}, ${match.city}, ${match.state} ${match.zip}`.toUpperCase()}</strong></span><span>Date of birth: <strong>{maskDob(match.dob)}</strong> ({ageFrom(match.dob)})</span></div></div></div>}
    {quote.customerId && <div className="pl-info-line good"><CheckCircle2 size={14} /> Linked to existing customer record {quote.customerId}.</div>}

    <section className="pl-two-sections">
      <div>
        <h2 className="pl-subtitle">Address Information</h2>
        <div className="pl-card">
          <Row label="Current Mailing Address">{editAddress ? <span className="pl-stack"><input aria-label="Mailing street" value={a.address} onChange={(e) => setApplicant({ address: e.target.value })} /><span className="pl-inline"><input aria-label="Mailing city" value={a.city} onChange={(e) => setApplicant({ city: e.target.value })} /><select aria-label="Mailing state" value={a.state} onChange={(e) => setApplicant({ state: e.target.value })}>{STATES.map((s) => <option key={s}>{s}</option>)}</select><input aria-label="Mailing ZIP" value={a.zip} onChange={(e) => setApplicant({ zip: e.target.value.replace(/\D/g, '').slice(0, 5) })} /></span><button type="button" className="pl-link" onClick={() => setEditAddress(false)}>Done</button></span> : <span className="pl-stack"><strong>{mailingLine(quote)}</strong><button type="button" className="pl-link" onClick={() => setEditAddress(true)}>Edit Address</button></span>}</Row>
          <Row label="Has this been the mailing address for 3+ years?" required error={errors.mailing3Years} className="question"><YesNo name="mailing3" value={pl.mailing3Years === '' ? undefined : pl.mailing3Years === 'yes'} onChange={(v) => setPl({ mailing3Years: v ? 'yes' : 'no' })} /></Row>
          <Row label="Is the current mailing address where the named insured lives?" required error={errors.livesAtMailing} className="question"><YesNo name="lives" value={pl.livesAtMailing === '' ? undefined : pl.livesAtMailing === 'yes'} onChange={(v) => setPl({ livesAtMailing: v ? 'yes' : 'no' })} /></Row>
          <Row label="County" required error={errors.county}>{a.state === 'WI' ? <select aria-label="County" value={pl.county} onChange={(e) => setPl({ county: e.target.value })}><option value="">-- Select --</option>{WI_COUNTIES.map((c) => <option key={c}>{c}</option>)}</select> : <input aria-label="County" value={pl.county} onChange={(e) => setPl({ county: e.target.value })} />}</Row>
          <Row label="Township"><input aria-label="Township" value={pl.township} onChange={(e) => setPl({ township: e.target.value })} /></Row>
          {quote.products.includes('home') && <Row label="Is the current mailing address the location of the property being insured?" required error={errors.isPropertyLocation} className="question"><YesNo name="propLoc" value={pl.isPropertyLocation === '' ? undefined : pl.isPropertyLocation === 'yes'} onChange={(v) => setPl({ isPropertyLocation: v ? 'yes' : 'no' })} /></Row>}
        </div>
      </div>
      <div>
        <h2 className="pl-subtitle">Current Insurance Coverage</h2>
        <div className="pl-card">
          {quote.products.includes('auto') && <>
            <Row label="Current Auto Carrier" required error={errors.autoCarrier}><select aria-label="Current Auto Carrier" value={pl.autoCarrier} onChange={(e) => setPl({ autoCarrier: e.target.value })}><option value="">-- Select --</option>{CARRIERS.map((c) => <option key={c}>{c}</option>)}</select></Row>
            {pl.autoCarrier && pl.autoCarrier !== 'No Prior Insurance' && <><Row label="Years with Carrier" required error={errors.autoYears}><select aria-label="Years with Carrier" value={pl.autoYears} onChange={(e) => setPl({ autoYears: e.target.value })}><option value="">-- Select --</option>{['Less than 1 year', '1 year', '2 years', '3 years', '4 years', '5 years or more'].map((c) => <option key={c}>{c}</option>)}</select></Row>
            <Row label="Prior Bodily Injury Limits"><select aria-label="Prior Bodily Injury Limits" value={pl.priorBodilyInjury} onChange={(e) => setPl({ priorBodilyInjury: e.target.value })}><option value="">-- Select --</option>{['25,000 / 50,000', '50,000 / 100,000', '100,000 / 300,000', '250,000 / 500,000', '500,000 / 500,000 or higher'].map((c) => <option key={c}>{c}</option>)}</select></Row></>}
          </>}
          {quote.products.includes('home') && <Row label="Current Home Carrier" required error={errors.homeCarrier}><select aria-label="Current Home Carrier" value={pl.homeCarrier} onChange={(e) => setPl({ homeCarrier: e.target.value })}><option value="">-- Select --</option>{[...CARRIERS.filter((c) => c !== 'GEICO' && c !== 'Progressive'), 'New Purchase'].map((c) => <option key={c}>{c}</option>)}</select></Row>}
          <Row label="Additional ERIE Policies" tip="Policies the household already has with ERIE. They count toward multi-policy discounts."><span className="pl-check-grid">{ADDITIONAL.map((p) => <label key={p}><input type="checkbox" checked={pl.additionalPolicies.includes(p)} onChange={(e) => setPl({ additionalPolicies: e.target.checked ? [...pl.additionalPolicies, p] : pl.additionalPolicies.filter((x) => x !== p) })} /> {p}</label>)}</span></Row>
        </div>
      </div>
    </section>

    <div className="pl-footer"><button type="button" className="pl-btn outline" onClick={saveExit}>SAVE &amp; EXIT</button><button type="button" className="pl-btn" onClick={submit}>CONTINUE</button></div>
    {!pl.prefillDone && <PrefillModal />}
    {replace && <PlModal title={`Replace ${replace === 'first' ? 'First' : 'Second'} Named Insured`} onCancel={() => setReplace('')}>
      <p>Select a household member to become the {replace === 'first' ? 'first' : 'second'} named insured.</p>
      <div className="pl-pick">{quote.drivers.filter((d) => d.id !== (replace === 'first' ? first?.id : second?.id) && d.id !== (replace === 'first' ? second?.id : first?.id)).map((d) => <button type="button" key={d.id} className="pl-btn outline" onClick={() => {
        if (replace === 'second') { setPl({ secondNamedInsuredId: d.id }); setDriver(d.id, { relationship: 'Spouse' }); }
        else { update((q) => { const others = q.drivers.filter((x) => x.id !== d.id).map((x) => (x.relationship === 'Named Insured' ? { ...x, relationship: '' as const, reviewed: false } : x)); return { drivers: [{ ...d, relationship: 'Named Insured', reviewed: false }, ...others], applicant: { ...q.applicant, firstName: d.firstName, lastName: d.lastName, dob: d.dob } }; }); }
        setReplace('');
      }}>{personName(d).toUpperCase()}</button>)}{quote.drivers.length < 2 && <span className="pl-muted">No other household members on this quote.</span>}</div>
    </PlModal>}
  </>;
}

const formatPhone = (raw: string) => { const d = raw.replace(/\D/g, '').slice(0, 10); return d.length > 6 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : d; };

function PrefillModal() {
  const { quote, update, setPl, busy } = usePl();
  const { notify } = usePortal();
  const hh = useMemo(() => householdFor(quote), [quote.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [people, setPeople] = useState<Record<string, boolean>>({});
  const [named, setNamed] = useState<Record<string, boolean>>({});
  const [vehicles, setVehicles] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const a = quote.applicant;
  const hasAuto = quote.products.includes('auto');
  const allPeople = hh.people.every((p) => people[p.id]);
  const allVehicles = hh.vehicles.every((v) => vehicles[v.id]);

  const print = () => openDocument(simpleDocument('Prefill Results', `${a.lastName}, ${a.firstName} · ${mailingLine(quote)}`, `<h2>Drivers / Non-Drivers</h2><table><thead><tr><th>Name</th><th>Gender</th><th>Date of birth</th><th>License</th></tr></thead><tbody>${hh.people.map((p) => `<tr><td>${h(p.lastName)}, ${h(p.firstName)}</td><td>${p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : '--'}</td><td>${maskDob(p.dob)}</td><td>${p.licenseNumber ? `${p.licenseState} ${maskTail(p.licenseNumber, 4)}` : '--'}</td></tr>`).join('')}</tbody></table>${hasAuto ? `<h2>Vehicles</h2><table><thead><tr><th>Year</th><th>Make</th><th>Model</th><th>Registered owner</th><th>VIN</th></tr></thead><tbody>${hh.vehicles.map((v) => `<tr><td>${v.year}</td><td>${v.make}</td><td>${v.model}</td><td>${h(v.registeredOwner)}</td><td>${v.vin}</td></tr>`).join('')}</tbody></table>` : ''}<p class="note">Mock prefill service — fictional household.</p>`), `prefill-${quote.id}`);

  const apply = () => {
    const ni = hh.people.filter((p) => named[p.id] && p.id !== 'HH1');
    if (ni.length > 1) { setError('Only one additional named insured can be selected.'); return; }
    if (ni.some((p) => !people[p.id])) { setError('Select the person before marking them as a named insured.'); return; }
    const client = hh.people[0];
    const clientDriver = { ...driverFromPerson(client, quote, true), firstName: a.firstName, middleName: a.middleName, lastName: a.lastName, dob: a.dob, id: 'D-HH1' };
    const others = hh.people.filter((p) => people[p.id] && p.id !== 'HH1').map((p) => driverFromPerson(p, quote, !!named[p.id]));
    const drivers = [clientDriver, ...others];
    const vs = hasAuto ? hh.vehicles.filter((v) => vehicles[v.id]).map((v) => vehicleFromHousehold(v, quote)) : [];
    busy('One Moment Please...', () => {
      update({ drivers, vehicles: vs });
      setPl({ prefillDone: true, secondNamedInsuredId: ni[0] ? `D-${ni[0].id}` : '' });
      notify(`Prefill applied: ${drivers.length} household member${drivers.length === 1 ? '' : 's'}${hasAuto ? `, ${vs.length} vehicle${vs.length === 1 ? '' : 's'}` : ''}.`);
    }, 700);
  };

  return <PlModal title="Prefill" wide extraLeft={<button type="button" className="pl-btn outline" onClick={print}>PRINT</button>} onContinue={apply}>
    <h3 className="pl-modal-h">Select Drivers/Non-Drivers <small>(Include all Household Occupants)</small></h3>
    <table className="pl-table compact">
      <thead><tr><th><input type="checkbox" aria-label="Select all household members" checked={allPeople} onChange={(e) => setPeople(Object.fromEntries(hh.people.map((p) => [p.id, e.target.checked])))} /></th><th>Name</th><th>Named Insured(s)</th><th>Gender</th><th>Date of Birth</th><th>Tax ID Number</th><th>License Info</th></tr></thead>
      <tbody>{hh.people.map((p) => <tr key={p.id}><td><input type="checkbox" aria-label={`Select ${p.lastName}, ${p.firstName}`} checked={!!people[p.id]} onChange={(e) => setPeople({ ...people, [p.id]: e.target.checked })} /></td><td>{p.lastName}, {p.firstName}</td><td><input type="checkbox" aria-label={`Named insured ${p.lastName}, ${p.firstName}`} checked={!!named[p.id]} onChange={(e) => setNamed({ ...named, [p.id]: e.target.checked })} /></td><td>{p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : '--'}</td><td>{maskDob(p.dob)}</td><td>{p.taxId ? `***-**-${p.taxId.slice(-4)}` : '--'}</td><td>{p.licenseNumber ? `${p.licenseState} ${p.licenseNumber.slice(0, 9)}****` : '--'}</td></tr>)}</tbody>
    </table>
    <div className="pl-prefill-note">Client Name listed below is from the previous screen. If name is not listed, select to include them as a Named Insured or Driver</div>
    <table className="pl-table compact"><tbody><tr><td><input type="checkbox" checked readOnly aria-label="Client" /></td><td>{a.lastName}, {a.firstName}</td><td><input type="checkbox" checked readOnly aria-label="Client is named insured" /></td><td>--</td><td>{maskDob(a.dob)}</td><td>--</td><td>--</td></tr></tbody></table>
    {hasAuto && <>
      <h3 className="pl-modal-h">Select Vehicles</h3>
      <table className="pl-table compact">
        <thead><tr><th><input type="checkbox" aria-label="Select all vehicles" checked={allVehicles} onChange={(e) => setVehicles(Object.fromEntries(hh.vehicles.map((v) => [v.id, e.target.checked])))} /></th><th>Year</th><th>Make</th><th>Model</th><th>Registered Owner</th><th>VIN</th></tr></thead>
        <tbody>{hh.vehicles.map((v) => <tr key={v.id}><td><input type="checkbox" aria-label={`Select ${v.year} ${v.make} ${v.model}`} checked={!!vehicles[v.id]} onChange={(e) => setVehicles({ ...vehicles, [v.id]: e.target.checked })} /></td><td>{v.year}</td><td>{v.make}</td><td>{v.model.split(' ')[0]}</td><td>{v.registeredOwner}</td><td className="mono">{v.vin}</td></tr>)}</tbody>
      </table>
    </>}
    {error && <div className="pl-err-text">{error}</div>}
    <p className="pl-muted small">Public records are from a mock prefill service. All people and vehicles are fictional.</p>
  </PlModal>;
}
