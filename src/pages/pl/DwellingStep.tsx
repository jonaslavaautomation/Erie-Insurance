import { useState } from 'react';
import { STATES } from '@/data/content';
import { money } from '@/lib/rating';
import { dwellingErrors, estimateDwelling, Errors } from '@/lib/personalLines';
import type { Property } from '@/data/types';
import { usePl } from '@/pages/pl/PersonalQuote';
import { ErrorBanner, PlModal, Row, YesNo } from '@/pages/pl/PlUi';

export const HOME_POLICY_TYPES: { label: string; form: 'HO-3' | 'HO-4' | 'HO-6' }[] = [
  { label: 'Home - Primary Residence', form: 'HO-3' },
  { label: 'Home - Secondary/Seasonal Residence', form: 'HO-3' },
  { label: 'Condominium', form: 'HO-6' },
  { label: 'Tenant', form: 'HO-4' },
];
const STYLES = ['Ranch', 'Colonial', 'Cape Cod', 'Bi-Level', 'Tri-Level', 'Split Level', 'Contemporary'];
const ROOFS = ['Architectural Composition Shingle', '3-Tab Composition Shingle', 'Metal', 'Slate', 'Tile', 'Wood Shake'];
const roofTypeFor = (m: string): Property['roofType'] => (m === 'Metal' || m === 'Slate' || m === 'Tile' ? m : 'Asphalt Shingle');

export default function DwellingStep() {
  const { quote, pl, update, setPl, go, busy, saveExit } = usePl();
  const [show, setShow] = useState(false);
  const [estimator, setEstimator] = useState('Pull Dwelling Value');
  const [aerial, setAerial] = useState(false);
  const [editLoc, setEditLoc] = useState(false);
  const p = quote.property;
  const h = quote.homeCoverages;
  const loc = pl.location ?? { address: quote.applicant.address, city: quote.applicant.city, state: quote.applicant.state, zip: quote.applicant.zip };
  const errors: Errors = dwellingErrors(p, h, quote.homePolicyType);
  const err = (k: string) => (show ? errors[k] : undefined);
  const setP = (patch: Partial<Property>) => update((q) => ({ property: { ...q.property, ...patch }, pl: { ...q.pl!, rated: false } }));
  const setH = (patch: Partial<typeof h>) => update((q) => ({ homeCoverages: { ...q.homeCoverages, ...patch }, pl: { ...q.pl!, rated: false } }));
  const num = (v: string, max: number) => Number(v.replace(/\D/g, '').slice(0, max));
  // Homeowners (HO-3) rate the dwelling; condominium (HO-6) and tenant (HO-4) rate contents and unit improvements.
  const ho3 = (h.form ?? 'HO-3') === 'HO-3';
  const amount = (pct: number) => (h.dwelling && pct ? Math.round((h.dwelling * pct) / 100) : 0);

  const pull = () => {
    if (estimator === 'Enter Manually') { document.querySelector<HTMLInputElement>('[aria-label="Dwelling Amount"]')?.focus(); return; }
    if (!(p.squareFeet >= 300) || !p.construction || !p.dwellingStyle) { setShow(true); return; }
    busy('Retrieving Home Cost Estimate...', () => setH({ dwelling: estimateDwelling(p) }), 1000);
  };
  const calculate = () => { if (!(h.dwelling > 0)) { setShow(true); return; } busy('One Moment Please...', () => setH({ otherStructuresPct: 20, personalPropertyPct: 75 }), 600); };

  const submit = () => {
    setShow(true);
    if (Object.keys(errors).length) { window.scrollTo(0, 0); return; }
    setPl({ completed: [...new Set([...pl.completed, 'dwelling'])] });
    busy('One Moment Please...', () => go('reports', true), 600);
  };

  return <>
    <h1 className="pl-title">Dwelling</h1>
    <ErrorBanner show={show && Object.keys(errors).length > 0} />
    <section className="pl-card pl-two">
      <div className="pl-col">
        <Row label="Policy Type" required error={err('policyType')}><select aria-label="Policy Type" value={quote.homePolicyType ?? ''} onChange={(e) => update((q) => ({ homePolicyType: e.target.value, homeCoverages: { ...q.homeCoverages, form: HOME_POLICY_TYPES.find((t) => t.label === e.target.value)?.form ?? 'HO-3' }, pl: { ...q.pl!, rated: false } }))}><option value="">-- Select --</option>{HOME_POLICY_TYPES.map((t) => <option key={t.label}>{t.label}</option>)}</select></Row>
        <hr className="pl-hr" />
        <Row label="Location Address" required>{editLoc ? <span className="pl-stack"><input aria-label="Location street" value={loc.address} onChange={(e) => setPl({ location: { ...loc, address: e.target.value } })} /><span className="pl-inline"><input aria-label="Location city" value={loc.city} onChange={(e) => setPl({ location: { ...loc, city: e.target.value } })} /><select aria-label="Location state" value={loc.state} onChange={(e) => setPl({ location: { ...loc, state: e.target.value } })}>{STATES.map((s) => <option key={s}>{s}</option>)}</select><input aria-label="Location ZIP" value={loc.zip} onChange={(e) => setPl({ location: { ...loc, zip: e.target.value.replace(/\D/g, '').slice(0, 5) } })} /></span><button type="button" className="pl-link" onClick={() => setEditLoc(false)}>Done</button></span> : <span className="pl-stack"><strong>{loc.address.toUpperCase()}<br />{`${loc.city}, ${loc.state} ${loc.zip}`.toUpperCase()}</strong><button type="button" className="pl-link" onClick={() => setEditLoc(true)}>Edit Location Address</button><label className="pl-inline-check"><input type="checkbox" checked={!!p.mailDecToAgency} onChange={(e) => setP({ mailDecToAgency: e.target.checked })} /> Mail Declaration to Agency</label></span>}</Row>
        <hr className="pl-hr" />
        {ho3 && <Row label=""><button type="button" className="pl-link" onClick={() => setAerial(true)}>Aerial Imagery Report</button></Row>}
        <Row label="Year Built" required error={err('yearBuilt')}><span className="pl-stack"><input aria-label="Year Built" className="short" value={p.yearBuilt || ''} onChange={(e) => setP({ yearBuilt: num(e.target.value, 4) })} /><small className="pl-muted">(yyyy)</small></span></Row>
        {ho3 && <Row label="Square Feet" required error={err('squareFeet')} tip="Finished living area above grade."><input aria-label="Square Feet" className="short" value={p.squareFeet || ''} onChange={(e) => setP({ squareFeet: num(e.target.value, 5) })} /></Row>}
        {ho3 && <Row label="Swimming Pool" required error={err('swimmingPool')}><YesNo name="pool" value={p.swimmingPool} onChange={(v) => setP({ swimmingPool: v })} /></Row>}
        <Row label="Number of Families" required><select aria-label="Number of Families" className="tiny" value={p.families ?? 1} onChange={(e) => setP({ families: Number(e.target.value) })}>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></Row>
        <Row label="Construction" required error={err('construction')}><select aria-label="Construction" value={p.construction} onChange={(e) => setP({ construction: e.target.value as Property['construction'] })}><option value="">-- Select --</option><option>Frame</option><option>Masonry</option><option>Masonry Veneer</option><option>Fire Resistive</option></select></Row>
        {ho3 && <Row label="Dwelling Style" required error={err('dwellingStyle')}><select aria-label="Dwelling Style" value={p.dwellingStyle ?? ''} onChange={(e) => setP({ dwellingStyle: e.target.value })}><option value="">-- Select --</option>{STYLES.map((s) => <option key={s}>{s}</option>)}</select></Row>}
        <Row label="Number of Stories" required error={err('stories')} tip="Count a finished half story (dormers, partial upper floor) as .5."><select aria-label="Number of Stories" className="short" value={p.stories || 0} onChange={(e) => setP({ stories: Number(e.target.value) })}>{[0, 1, 1.5, 2, 2.5, 3].map((n) => <option key={n} value={n}>{n.toFixed(1)}</option>)}</select></Row>
        <Row label="Alarm System" required error={err('alarm')} tip="Central = monitored by an alarm company; Local = sounds on premises only."><select aria-label="Alarm System" className="short" value={p.alarm ?? ''} onChange={(e) => setP({ alarm: e.target.value as Property['alarm'], burglarAlarm: e.target.value === 'Central' })}><option value="">-- Select --</option><option>None</option><option>Local</option><option>Central</option></select></Row>
        <Row label="Sprinkler System" required error={err('sprinklers')}><YesNo name="sprinkler" value={p.sprinklers} onChange={(v) => setP({ sprinklers: v })} /></Row>
        {ho3 && <Row label="Roof Installation Year" required error={err('roofYear')} tip="Year the current roof surface was installed (not the year built)."><span className="pl-stack"><input aria-label="Roof Installation Year" className="short" value={p.roofYear || ''} onChange={(e) => setP({ roofYear: num(e.target.value, 4) })} /><small className="pl-muted">(yyyy)</small></span></Row>}
        {ho3 && <Row label="Roof Material" required error={err('roofMaterial')} tip="Use the Aerial Imagery Report to confirm the roof surface."><select aria-label="Roof Material" value={p.roofMaterial ?? ''} onChange={(e) => setP({ roofMaterial: e.target.value, roofType: roofTypeFor(e.target.value) })}><option value="">-- Select --</option>{ROOFS.map((r) => <option key={r}>{r}</option>)}</select></Row>}
      </div>
      <div className="pl-col">
        {ho3 && <>
        <h3 className="pl-group-h">Dwelling</h3>
        <Row label="Loss Settlement" required error={err('lossSettlement')}><select aria-label="Dwelling Loss Settlement" value={p.lossSettlement ?? ''} onChange={(e) => setP({ lossSettlement: e.target.value })}><option value="">-- Select --</option><option>Guaranteed Replacement Cost</option><option>Replacement Cost</option><option>Actual Cash Value</option></select></Row>
        <Row label="Perils" required error={err('perils')}><select aria-label="Dwelling Perils" value={p.perils ?? ''} onChange={(e) => setP({ perils: e.target.value })}><option value="">-- Select --</option><option>Comprehensive Perils</option><option>Named Perils</option></select></Row>
        <h3 className="pl-group-h">Roof</h3>
        <Row label="Roof Surfaces Wind or Hail Loss Settlement" tip="Yes settles roof-surface wind or hail losses on a payment schedule based on roof age."><select aria-label="Roof Surfaces Wind or Hail Loss Settlement" className="tiny" value={p.roofWindHailSettlement ?? 'No'} onChange={(e) => setP({ roofWindHailSettlement: e.target.value as 'Yes' | 'No' })}><option>No</option><option>Yes</option></select></Row>
        </>}
        <h3 className="pl-group-h">Personal Property</h3>
        <Row label="Loss Settlement" required error={err('ppLossSettlement')}><select aria-label="Personal Property Loss Settlement" value={p.ppLossSettlement ?? ''} onChange={(e) => setP({ ppLossSettlement: e.target.value })}><option value="">-- Select --</option><option>Replacement Cost</option><option>Actual Cash Value</option></select></Row>
        <Row label="Perils" required error={err('ppPerils')}><select aria-label="Personal Property Perils" value={p.ppPerils ?? ''} onChange={(e) => setP({ ppPerils: e.target.value })}><option value="">-- Select --</option><option>Comprehensive Perils</option><option>Named Perils</option></select></Row>
        {ho3 ? <>
        <hr className="pl-hr" />
        <Row label="Used High Value Vendor"><input type="checkbox" aria-label="Used High Value Vendor" checked={!!p.highValueVendor} onChange={(e) => setP({ highValueVendor: e.target.checked })} /></Row>
        <Row label="Home Cost Estimator"><span className="pl-inline"><select aria-label="Home Cost Estimator" value={estimator} onChange={(e) => setEstimator(e.target.value)}><option>Pull Dwelling Value</option><option>Enter Manually</option></select><button type="button" className="pl-btn outline small" onClick={pull}>GO</button></span></Row>
        <Row label="Dwelling Amount" required error={err('dwelling')}><span className="pl-inline"><span className="pl-dollar">$</span><input aria-label="Dwelling Amount" className="amount" value={h.dwelling ? h.dwelling.toLocaleString() : ''} onChange={(e) => setH({ dwelling: num(e.target.value, 8) })} /><button type="button" className="pl-btn outline small" onClick={calculate}>CALCULATE AMOUNTS</button></span></Row>
        <Row label="Other Structures Amount" required error={err('otherStructures')}><span className="pl-inline"><span className="pl-dollar">$</span><input aria-label="Other Structures Amount" className="amount" value={amount(h.otherStructuresPct) ? amount(h.otherStructuresPct).toLocaleString() : ''} onChange={(e) => setH({ otherStructuresPct: h.dwelling ? (num(e.target.value, 8) / h.dwelling) * 100 : 0 })} /></span></Row>
        <Row label="Personal Property Amount" required error={err('personalProperty')}><span className="pl-inline"><span className="pl-dollar">$</span><input aria-label="Personal Property Amount" className="amount" value={amount(h.personalPropertyPct) ? amount(h.personalPropertyPct).toLocaleString() : ''} onChange={(e) => setH({ personalPropertyPct: h.dwelling ? (num(e.target.value, 8) / h.dwelling) * 100 : 0 })} /></span></Row>
        {h.dwelling > 0 && p.squareFeet > 0 && p.construction && <p className="pl-muted small">Estimator value for this home: {money(estimateDwelling(p))}{h.dwelling < estimateDwelling(p) * 0.9 ? ' — dwelling amount is more than 10% below the estimate.' : ''}</p>}
        </> : <>
          <hr className="pl-hr" />
          {h.form === 'HO-6' && <Row label="Building Additions & Alterations Amount" required error={err('dwelling')} tip="Walls-in improvements and betterments the unit owner insures beyond the association's master policy."><span className="pl-inline"><span className="pl-dollar">$</span><input aria-label="Building Additions & Alterations Amount" className="amount" value={h.dwelling ? h.dwelling.toLocaleString() : ''} onChange={(e) => setH({ dwelling: num(e.target.value, 8) })} /></span></Row>}
          <Row label="Personal Property Amount" required error={err('contents')} tip="Replacement value of the household's belongings (minimum $10,000)."><span className="pl-inline"><span className="pl-dollar">$</span><input aria-label="Contents Amount" className="amount" value={h.contentsLimit ? h.contentsLimit.toLocaleString() : ''} onChange={(e) => setH({ contentsLimit: num(e.target.value, 8) })} /></span></Row>
        </>}
      </div>
    </section>
    <div className="pl-footer"><button type="button" className="pl-btn outline" onClick={saveExit}>SAVE &amp; EXIT</button><div><button type="button" className="pl-btn outline" onClick={() => go(quote.products.includes('auto') ? 'vehicles' : 'customer')}>PREVIOUS</button><button type="button" className="pl-btn" onClick={submit}>CONTINUE</button></div></div>
    {aerial && <PlModal title="Aerial Imagery Report" onCancel={() => setAerial(false)} cancelLabel="CLOSE">
      <p className="pl-muted small">Imagery captured {new Date(Date.now() - 86400000 * 74).toLocaleDateString('en-US')} · {loc.address.toUpperCase()}, {loc.city.toUpperCase()}, {loc.state} {loc.zip}</p>
      <table className="pl-table compact"><tbody>
        <tr><td>Roof material</td><td><strong>{p.roofMaterial || 'Architectural Composition Shingle'}</strong></td></tr>
        <tr><td>Roof condition</td><td><strong>{p.roofYear && new Date().getFullYear() - p.roofYear > 18 ? 'Fair — granule loss visible' : 'Good'}</strong></td></tr>
        <tr><td>Estimated roof age</td><td><strong>{p.roofYear ? `${new Date().getFullYear() - p.roofYear} years` : '8–10 years'}</strong></td></tr>
        <tr><td>Roof shape</td><td><strong>{p.dwellingStyle === 'Colonial' ? 'Gable' : 'Hip / gable combination'}</strong></td></tr>
        <tr><td>Swimming pool</td><td><strong>{p.swimmingPool ? 'Detected' : 'None detected'}</strong></td></tr>
        <tr><td>Trampoline</td><td><strong>None detected</strong></td></tr>
        <tr><td>Stories</td><td><strong>{p.stories ? p.stories.toFixed(1) : '1.0'}</strong></td></tr>
        <tr><td>Tree overhang</td><td><strong>Low</strong></td></tr>
      </tbody></table>
      <p className="pl-muted small">Mock aerial imagery service — illustrative results.</p>
    </PlModal>}
  </>;
}
