import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Info } from 'lucide-react';
import { escapeHtml as h, openDocument, simpleDocument } from '@/lib/documents';
import { nextQuoteNumbers, orderReports, personName, usDate } from '@/lib/personalLines';
import { ageFrom } from '@/lib/rating';
import { usePortal } from '@/data/store';
import type { RatingPlan, ReportRow } from '@/data/types';
import { usePl } from '@/pages/pl/PersonalQuote';
import { DateInput, PlModal, Row } from '@/pages/pl/PlUi';

const CLAIM_TYPES = ['Accident', 'Violation', 'Comprehensive Claim', 'Property Claim'] as const;
type ClaimType = (typeof CLAIM_TYPES)[number];

export default function ReportsStep() {
  const { quote, pl, update, setPl, go, busy, saveExit } = usePl();
  const { quotes } = usePortal();
  const [detail, setDetail] = useState<ReportRow | null>(null);
  const [menu, setMenu] = useState<'' | 'claim' | 'uw'>('');
  const [adding, setAdding] = useState<ClaimType | ''>('');
  const [planPending, setPlanPending] = useState<RatingPlan | ''>('');
  const ordered = useRef(false);

  useEffect(() => {
    if (pl.reports.length || ordered.current) return;
    ordered.current = true;
    busy('Ordering Reports...', () => setPl({ reports: orderReports(quote) }), 1100);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const choosePlan = (plan: RatingPlan) => { if (plan === 'ErieSecure Auto' && pl.ratingPlan !== plan) setPlanPending(plan); else setPl({ ratingPlan: plan, rated: false }); };

  const rate = () => {
    busy('Rating...', () => { update((q) => {
      // Umbrella is offered on every auto/home account once rated.
      const addUmbrella = !q.products.includes('umbrella') && (q.products.includes('auto') || q.products.includes('home'));
      const products = addUmbrella ? [...q.products, 'umbrella' as const] : q.products;
      const youthful = q.drivers.filter((d) => d.driverType !== 'Non-Driver' && d.dob && ageFrom(d.dob) < 25).length;
      return {
        products,
        agentNumbers: addUmbrella ? { ...q.agentNumbers, umbrella: q.agentNumbers.auto ?? q.agentNumbers.home } : q.agentNumbers,
        numbers: addUmbrella ? { ...q.numbers, ...nextQuoteNumbers(quotes, ['umbrella']) } : q.numbers,
        umbrella: products.includes('umbrella') ? { ...q.umbrella, limit: addUmbrella ? 1000000 : q.umbrella.limit, autoExposures: q.vehicles.length, youthfulOperators: youthful, residences: q.products.includes('home') ? 1 : q.umbrella.residences } : q.umbrella,
        status: 'Quote',
        lastStep: 'coverages',
        pl: { ...q.pl!, rated: true, ratedAt: new Date().toISOString(), convert: products },
      };
    }); go('coverages', true); }, 1400);
  };

  const printReports = () => openDocument(simpleDocument('Underwriting Reports', `${quote.applicant.lastName}, ${quote.applicant.firstName}`, `<table><thead><tr><th>Name</th><th>Driver type</th><th>Report</th><th>Report date</th><th>Status/type</th><th>Loss date</th><th class="num">Amount</th></tr></thead><tbody>${pl.reports.map((r) => `<tr><td>${h(r.name)}</td><td>${h(r.driverType)}</td><td>${h(r.report)}</td><td>${usDate(r.date)}</td><td>${h(r.status)}</td><td>${usDate(r.lossDate) || '--'}</td><td class="num">${r.amount === null ? '--' : `$${r.amount.toFixed(2)}`}</td></tr>`).join('')}</tbody></table><p class="note">Auto rating plan: ${h(pl.ratingPlan)}. Mock report vendor — illustrative results.</p>`), `reports-${quote.id}`);

  return <>
    <div className="pl-info-line strong"><Info size={14} /> Driver selection has automatically been made.</div>
    <h1 className="pl-title">Reports</h1>
    <section className="pl-card pl-table-card">
      <p className="pl-muted small">Violations and/or accidents not listed on the MVR should be manually entered. MVRs do not always capture all violation and/or accident activity.</p>
      <div className="pl-scroll">
        <table className="pl-table">
          <thead><tr><th aria-label="Info" /><th>Name</th><th>Driver Type</th><th>Report</th><th>Report Date</th><th>Status/Type</th><th>Loss Date</th><th className="num">Amount</th></tr></thead>
          <tbody>{pl.reports.length === 0 ? <tr><td colSpan={8} className="pl-muted">Ordering reports…</td></tr> : pl.reports.map((r) => <tr key={r.id}>
            <td>{r.lossDate && <button type="button" className="pl-icon-btn" aria-label={`Details for ${r.report}`} onClick={() => setDetail(r)}><Info size={14} /></button>}</td>
            <td>{r.name}</td><td>{r.driverType}</td><td>{r.report.replace(/ \((Auto|Property)\)$/, '')}{/\((Auto|Property)\)$/.test(r.report) && <small className="pl-muted"> ({r.report.match(/\((Auto|Property)\)$/)![1]})</small>}</td>
            <td>{usDate(r.date)}</td>
            <td><button type="button" className="pl-link" onClick={() => setDetail(r)}>{r.status}</button></td>
            <td>{usDate(r.lossDate) || '--'}</td>
            <td className="num">{r.amount === null ? '--' : `$${r.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="pl-report-actions">
        <div className="pl-menus">
          <span className="pl-menu"><button type="button" className="pl-btn outline" aria-expanded={menu === 'claim'} onClick={() => setMenu(menu === 'claim' ? '' : 'claim')}>ADD CLAIM/VIOLATION <ChevronDown size={13} /></button>{menu === 'claim' && <span className="pl-menu-list">{CLAIM_TYPES.filter((t) => quote.products.includes('home') || t !== 'Property Claim').map((t) => <button type="button" key={t} onClick={() => { setAdding(t); setMenu(''); }}>{t}</button>)}</span>}</span>
          <span className="pl-menu"><button type="button" className="pl-btn outline" aria-expanded={menu === 'uw'} onClick={() => setMenu(menu === 'uw' ? '' : 'uw')}>U/W GUIDELINES <ChevronDown size={13} /></button>{menu === 'uw' && <span className="pl-menu-list">{quote.products.includes('auto') && <Link to="/products/auto" target="_blank">Auto Underwriting Guidelines</Link>}{quote.products.includes('home') && <Link to="/products/home" target="_blank">Home Underwriting Guidelines</Link>}<Link to="/products/umbrella" target="_blank">Umbrella Underwriting Guidelines</Link><Link to="/resources/underwriting-guidelines" target="_blank">Eligibility &amp; Acceptability</Link></span>}</span>
        </div>
        {quote.products.includes('auto') && <label className="pl-plan">Auto Rating Plan <select aria-label="Auto Rating Plan" value={pl.ratingPlan} onChange={(e) => choosePlan(e.target.value as RatingPlan)}><option>Exchange</option><option>Company</option><option>ErieSecure Auto</option></select></label>}
      </div>
    </section>
    <div className="pl-footer"><div><button type="button" className="pl-btn outline" onClick={saveExit}>SAVE &amp; EXIT</button><button type="button" className="pl-btn outline" onClick={printReports}>PRINT REPORTS</button></div><div><button type="button" className="pl-btn outline" onClick={() => go(quote.products.includes('home') ? 'dwelling' : 'vehicles')}>PREVIOUS</button><button type="button" className="pl-btn" onClick={rate} disabled={!pl.reports.length}>RATE</button></div></div>

    {detail && <PlModal title={`${detail.report} — ${detail.status}`} onCancel={() => setDetail(null)} cancelLabel="CLOSE">
      <table className="pl-table compact"><tbody><tr><td>Name</td><td><strong>{detail.name}</strong></td></tr><tr><td>Report date</td><td>{usDate(detail.date)}</td></tr>{detail.lossDate && <tr><td>Loss date</td><td>{usDate(detail.lossDate)}</td></tr>}{detail.amount !== null && <tr><td>Amount paid</td><td>${detail.amount.toFixed(2)}</td></tr>}</tbody></table>
      <p>{detail.detail}</p>
    </PlModal>}
    {planPending && <PlModal title="Change rating plan" warn onCancel={() => setPlanPending('')} onContinue={() => { setPl({ ratingPlan: planPending, rated: false }); setPlanPending(''); }}>
      Please note that changing to the ErieSecure Auto rating plan may require additional data entry or validations of previously entered information. If an Account Billing payment type is selected, this will be updated to Single Bill.
    </PlModal>}
    {adding && <AddClaim type={adding} onClose={() => setAdding('')} />}
  </>;
}

function AddClaim({ type, onClose }: { type: ClaimType; onClose: () => void }) {
  const { quote, pl, update } = usePl();
  const people = type === 'Property Claim' ? [quote.drivers[0]] : quote.drivers.filter((d) => d.driverType !== 'Non-Driver');
  const [form, setForm] = useState({ driverId: people[0]?.id ?? '', date: '', description: '', amount: '' });
  const [error, setError] = useState('');
  const save = () => {
    const amount = Number(form.amount.replace(/[^\d.]/g, '')) || 0;
    if (!form.driverId || !form.date || !form.description.trim()) { setError('Driver, date and description are required.'); return; }
    if (new Date(form.date) > new Date()) { setError('The date can’t be in the future.'); return; }
    const d = quote.drivers.find((x) => x.id === form.driverId)!;
    const row: ReportRow = { id: `R-M-${Date.now()}`, driverId: d.id, name: personName(d), driverType: d.driverType ?? 'Insured Driver', report: type === 'Property Claim' ? 'Property Loss (Agent Entered)' : type === 'Violation' ? 'MVR (Agent Entered)' : 'Claim (Agent Entered)', date: new Date().toISOString().slice(0, 10), status: type, lossDate: form.date, amount: type === 'Violation' ? null : amount, detail: form.description };
    // Chargeable incidents within 3 years affect auto rating.
    const recent = (Date.now() - new Date(form.date).getTime()) / 86400000 < 365 * 3;
    update((q) => ({ drivers: q.drivers.map((x) => (x.id === d.id && recent && (type === 'Violation' || (type === 'Accident' && amount > 0)) ? { ...x, violations: x.violations + (type === 'Violation' ? 1 : 0), accidents: x.accidents + (type === 'Accident' ? 1 : 0) } : x)), pl: { ...q.pl!, reports: [...pl.reports, row], rated: false } }));
    onClose();
  };
  return <PlModal title={`Add ${type}`} onCancel={onClose} onContinue={save} continueLabel="ADD">
    <div className="pl-modal-form">
      <Row label={type === 'Property Claim' ? 'Named Insured' : 'Driver'} required><select aria-label="Claim driver" value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}>{people.map((d) => <option key={d.id} value={d.id}>{personName(d)}</option>)}</select></Row>
      <Row label={type === 'Violation' ? 'Violation Date' : 'Loss Date'} required><DateInput label="Claim date" value={form.date} onChange={(iso) => setForm({ ...form, date: iso })} /></Row>
      <Row label="Description" required><input aria-label="Claim description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={type === 'Violation' ? 'Speeding 11–15 over' : 'Rear-ended at intersection'} /></Row>
      {type !== 'Violation' && <Row label="Amount Paid"><span className="pl-inline"><span className="pl-dollar">$</span><input aria-label="Claim amount" className="amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, '') })} /></span></Row>}
      {error && <div className="pl-err-text">{error}</div>}
    </div>
  </PlModal>;
}
