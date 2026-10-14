import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, CheckCircle2, Eye, Mail, Phone, Printer, RefreshCcw, Send, ShoppingCart } from 'lucide-react';
import { Empty, Field, Modal, Panel, StatusBadge, Tabs } from '@/components/ui';
import { courses, eriebooks, formsLibrary } from '@/data/content';
import { fullName, today, usePortal } from '@/data/store';
import { AGENT } from '@/data/seed';
import { money } from '@/lib/rating';
import { numberInput } from '@/lib/validation';
import type { Envelope, Lead } from '@/data/types';

export function HomeCostEstimator() {
  const [f, setF] = useState({ sqft: '2200', construction: 'Frame', quality: 'Standard', stories: '2', garage: '2-car attached', roof: 'Asphalt Shingle', basement: 'Unfinished', zip: '53703' });
  const base = { Frame: 158, Masonry: 182, 'Masonry Veneer': 171 }[f.construction] ?? 158;
  const quality = { Economy: 0.85, Standard: 1, Custom: 1.22, Premium: 1.45 }[f.quality] ?? 1;
  const stories = f.stories === '1' ? 1.04 : f.stories === '3' ? 0.95 : 0.97;
  const roof = { 'Asphalt Shingle': 1, Metal: 1.03, Slate: 1.08, Tile: 1.05 }[f.roof] ?? 1;
  const garage = { None: 0, '1-car attached': 18000, '2-car attached': 29000, '3-car attached': 41000, Detached: 24000 }[f.garage] ?? 0;
  const sqft = numberInput(f.sqft);
  const basement = { None: 0, Unfinished: sqft * 0.25 * 32, Finished: sqft * 0.25 * 68 }[f.basement] ?? 0;
  const estimate = sqft > 0 ? Math.round((sqft * base * quality * stories * roof + garage + basement) / 1000) * 1000 : 0;
  const set = (key: keyof typeof f, value: string) => setF({ ...f, [key]: value });
  return <Panel title="Estimate replacement cost">
    <div className="px-grid3">
      <Field label="Finished square feet"><input type="number" min={0} step={50} value={f.sqft} onChange={(e) => set('sqft', e.target.value.replace(/^-/, ''))} /></Field>
      <Field label="Construction"><select value={f.construction} onChange={(e) => set('construction', e.target.value)}><option>Frame</option><option>Masonry</option><option>Masonry Veneer</option></select></Field>
      <Field label="Quality of construction"><select value={f.quality} onChange={(e) => set('quality', e.target.value)}><option>Economy</option><option>Standard</option><option>Custom</option><option>Premium</option></select></Field>
      <Field label="Stories"><select value={f.stories} onChange={(e) => set('stories', e.target.value)}><option>1</option><option>2</option><option>3</option></select></Field>
      <Field label="Roof"><select value={f.roof} onChange={(e) => set('roof', e.target.value)}><option>Asphalt Shingle</option><option>Metal</option><option>Slate</option><option>Tile</option></select></Field>
      <Field label="Garage"><select value={f.garage} onChange={(e) => set('garage', e.target.value)}><option>None</option><option>1-car attached</option><option>2-car attached</option><option>3-car attached</option><option>Detached</option></select></Field>
      <Field label="Basement"><select value={f.basement} onChange={(e) => set('basement', e.target.value)}><option>None</option><option>Unfinished</option><option>Finished</option></select></Field>
      <Field label="ZIP"><input value={f.zip} onChange={(e) => set('zip', e.target.value.replace(/\D/g, '').slice(0, 5))} /></Field>
    </div>
    <div className="estimate-card"><div><strong>Estimated replacement cost</strong><span className="big">{estimate ? money(estimate) : '—'}</span><span>{sqft ? '' : 'Enter the finished square footage. '}Recommended Coverage A for ErieSecure Home. Guaranteed Replacement Cost pays to rebuild even above this limit when insured to 100% of the estimate.</span></div><Link className="continue-action" to="/quotes/search-results">START HOME QUOTE</Link></div>
  </Panel>;
}

export function BuildingValuation() {
  const [f, setF] = useState({ occupancy: 'Retail store', sqft: '6000', cls: '3 — Non-combustible', stories: 1, sprinklered: false, year: 1995 });
  const rate = { '1 — Frame': 165, '2 — Joisted masonry': 178, '3 — Non-combustible': 172, '4 — Masonry non-combustible': 190, '5 — Modified fire resistive': 214, '6 — Fire resistive': 236 }[f.cls] ?? 172;
  const occ = { 'Retail store': 1, Office: 1.08, Restaurant: 1.25, Warehouse: 0.72, 'Light manufacturing': 0.9, 'Medical office': 1.3 }[f.occupancy] ?? 1;
  const sqft = numberInput(f.sqft);
  const estimate = Math.round((sqft * rate * occ * (f.stories > 1 ? 0.95 : 1) * (f.sprinklered ? 1.03 : 1)) / 1000) * 1000;
  return <Panel title="Commercial building valuation">
    <div className="px-grid3">
      <Field label="Occupancy"><select value={f.occupancy} onChange={(e) => setF({ ...f, occupancy: e.target.value })}>{['Retail store', 'Office', 'Restaurant', 'Warehouse', 'Light manufacturing', 'Medical office'].map((o) => <option key={o}>{o}</option>)}</select></Field>
      <Field label="Total square feet"><input type="number" min={0} step={100} value={f.sqft} onChange={(e) => setF({ ...f, sqft: e.target.value.replace(/^-/, '') })} /></Field>
      <Field label="ISO construction class"><select value={f.cls} onChange={(e) => setF({ ...f, cls: e.target.value })}>{['1 — Frame', '2 — Joisted masonry', '3 — Non-combustible', '4 — Masonry non-combustible', '5 — Modified fire resistive', '6 — Fire resistive'].map((o) => <option key={o}>{o}</option>)}</select></Field>
      <Field label="Stories"><input type="number" min={1} value={f.stories} onChange={(e) => setF({ ...f, stories: numberInput(e.target.value, 1) })} /></Field>
      <Field label="Year built"><input type="number" value={f.year} onChange={(e) => setF({ ...f, year: Number(e.target.value) })} /></Field>
      <label className="px-checks"><input type="checkbox" checked={f.sprinklered} onChange={(e) => setF({ ...f, sprinklered: e.target.checked })} /> Fully sprinklered</label>
    </div>
    <div className="estimate-card"><div><strong>Estimated building replacement cost</strong><span className="big">{sqft ? money(estimate) : '—'}</span><span>{sqft ? `${money(Math.round(estimate / sqft))} per sq. ft.` : 'Enter the total square footage.'} Use as the building limit on ErieSecure Business®.</span></div><Link className="continue-action" to="/products/eriesecure-business">ERIESECURE BUSINESS</Link></div>
  </Panel>;
}

export function CertificatesWidget() {
  const [params] = useSearchParams();
  const { policies, customers, notify } = usePortal();
  const [policyNumber, setPolicyNumber] = useState(params.get('policy') ?? '');
  const [holder, setHolder] = useState({ name: '', address: '', additionalInsured: false, description: '' });
  const [generated, setGenerated] = useState(false);
  const policy = policies.find((p) => p.number === policyNumber);
  const customer = policy ? customers.find((c) => c.id === policy.customerId) : undefined;
  const generate = () => {
    if (!policy || !holder.name || !holder.address) return notify('Select a policy and enter the certificate holder.', 'error');
    if (policy.status === 'Cancelled') return notify(`${policy.number} is cancelled — certificates can only be issued for in-force policies.`, 'error');
    setGenerated(true);
  };
  return <Panel title="Generate a certificate">
    <div className="px-grid2">
      <Field label="Policy" required><select value={policyNumber} onChange={(e) => { setPolicyNumber(e.target.value); setGenerated(false); }}><option value="">-- Select an active policy --</option>{policies.filter((p) => p.status === 'Active').map((p) => <option key={p.number} value={p.number}>{p.number} · {p.type} · {fullName(customers.find((c) => c.id === p.customerId) ?? { firstName: '', lastName: '' })}</option>)}</select></Field>
      <Field label="Certificate holder" required><input value={holder.name} onChange={(e) => setHolder({ ...holder, name: e.target.value })} placeholder="e.g. First Federal Mortgage" /></Field>
      <Field label="Holder address" required className="span2"><input value={holder.address} onChange={(e) => setHolder({ ...holder, address: e.target.value })} /></Field>
      <Field label="Description of operations / property" className="span2"><textarea rows={2} value={holder.description} onChange={(e) => setHolder({ ...holder, description: e.target.value })} /></Field>
      <label className="px-checks"><input type="checkbox" checked={holder.additionalInsured} onChange={(e) => setHolder({ ...holder, additionalInsured: e.target.checked })} /> Holder is an additional insured (requires endorsement on file)</label>
    </div>
    <div className="px-form-actions"><button type="button" className="px-btn" onClick={generate}>Generate certificate</button></div>
    {generated && policy && <div className="doc-preview printable"><header><span className="quote-erie-mark small">⌂</span><div><strong>Certificate of Liability Insurance</strong><small>Issued {today()} · This certificate is issued as a matter of information only and confers no rights upon the holder.</small></div></header>
      <dl className="px-dl two"><dt>Producer</dt><dd>{AGENT.agency}, {AGENT.address}</dd><dt>Insured</dt><dd>{customer ? `${fullName(customer)}, ${customer.address}, ${customer.city}, ${customer.state} ${customer.zip}` : ''}</dd><dt>Insurer</dt><dd>Erie Insurance Exchange</dd><dt>Policy</dt><dd>{policy.type} {policy.number} · {policy.effective} to {policy.expiration}</dd><dt>Limits</dt><dd>{policy.autoCoverages ? `BI ${policy.autoCoverages.bodilyInjury} · PD $${policy.autoCoverages.propertyDamage}` : policy.homeCoverages ? `Personal liability ${money(policy.homeCoverages.personalLiability)}` : policy.description}</dd><dt>Certificate holder</dt><dd>{holder.name}<br />{holder.address}</dd><dt>Additional insured</dt><dd>{holder.additionalInsured ? 'Yes' : 'No'}</dd><dt>Description</dt><dd>{holder.description || '—'}</dd></dl>
      <div className="issued-actions no-print"><button type="button" className="outline-action" onClick={() => window.print()}><Printer size={13} /> PRINT</button><button type="button" className="outline-action" onClick={() => notify(`Certificate emailed to ${holder.name}.`)}><Mail size={13} /> EMAIL TO HOLDER</button></div>
    </div>}
  </Panel>;
}

export function ESignatureWidget() {
  const { envelopes, customers, updateEnvelope, addEnvelope, notify } = usePortal();
  const [filter, setFilter] = useState<'All' | Envelope['status']>('All');
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState({ customer: '', document: formsLibrary[1].name });
  const rows = envelopes.filter((e) => filter === 'All' || e.status === filter);
  const refresh = () => { envelopes.forEach((e) => { if (e.status === 'Sent') updateEnvelope(e.id, 'Viewed'); else if (e.status === 'Viewed') updateEnvelope(e.id, 'Signed'); }); notify('Envelope statuses refreshed.', 'info'); };
  return <Panel title="Envelopes" actions={<><button type="button" className="link-button" onClick={refresh}><RefreshCcw size={13} /> Refresh status</button><button type="button" className="px-btn small" onClick={() => setSending(true)}><Send size={13} /> Send for signature</button></>}>
    <div className="px-chips">{(['All', 'Sent', 'Viewed', 'Signed', 'Expired'] as const).map((s) => <button key={s} type="button" className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>{s} <span>{s === 'All' ? envelopes.length : envelopes.filter((e) => e.status === s).length}</span></button>)}</div>
    {rows.length === 0 ? <Empty>No envelopes.</Empty> : <table className="px-table"><thead><tr><th>Envelope</th><th>Customer</th><th>Document</th><th>Sent</th><th>Status</th><th /></tr></thead><tbody>{rows.map((e) => <tr key={e.id}><td className="mono">{e.id}</td><td>{e.customer}</td><td>{e.document}</td><td>{e.sent}</td><td><StatusBadge status={e.status} /></td><td className="row-actions">{(e.status === 'Sent' || e.status === 'Expired' || e.status === 'Viewed') && <button type="button" className="link-button" onClick={() => { updateEnvelope(e.id, 'Sent'); notify(`Reminder sent to ${e.customer}.`); }}>{e.status === 'Expired' ? 'Resend' : 'Remind'}</button>}{e.status === 'Signed' && <button type="button" className="link-button" onClick={() => notify(`${e.document} is attached to the policy file.`, 'info')}>View signed</button>}</td></tr>)}</tbody></table>}
    {sending && <Modal title="Send for eSignature" onClose={() => setSending(false)} footer={<button type="button" className="px-btn" onClick={() => { if (!draft.customer) return; addEnvelope(draft); notify(`Sent “${draft.document}” to ${draft.customer}.`); setSending(false); }}>Send</button>}>
      <Field label="Customer" required><select value={draft.customer} onChange={(e) => setDraft({ ...draft, customer: e.target.value })}><option value="">-- Select --</option>{customers.map((c) => <option key={c.id}>{fullName(c)}</option>)}</select></Field>
      <Field label="Document"><select value={draft.document} onChange={(e) => setDraft({ ...draft, document: e.target.value })}>{formsLibrary.map((f) => <option key={f.code} value={f.name}>{f.code} — {f.name}</option>)}</select></Field>
    </Modal>}
  </Panel>;
}

export function LeadsWidget() {
  const { leads, updateLead, notify } = usePortal();
  const [params] = useSearchParams();
  const [filter, setFilter] = useState<'All' | Lead['status']>('All');
  const rows = leads.filter((l) => filter === 'All' || l.status === filter);
  const ageOf = (iso: string) => { const hours = Math.round((Date.now() - new Date(iso).getTime()) / 3600000); return hours < 24 ? `${Math.max(0, hours)}h ago` : `${Math.round(hours / 24)}d ago`; };
  return <Panel title={params.get('view') === 'classic' ? 'Online leads (classic view)' : 'Online leads'}>
    <div className="px-chips">{(['All', 'New', 'Contacted', 'Quoted', 'Won', 'Lost'] as const).map((s) => <button key={s} type="button" className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>{s} <span>{s === 'All' ? leads.length : leads.filter((l) => l.status === s).length}</span></button>)}</div>
    <table className="px-table"><thead><tr><th>Lead</th><th>Interest</th><th>Source</th><th>Received</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map((l) => { const [first, ...rest] = l.name.split(' '); return <tr key={l.id}><td><strong>{l.name}</strong><small className="cell-note">ZIP {l.zip}</small></td><td>{l.interest}</td><td>{l.source}</td><td>{ageOf(l.received)}</td><td><select value={l.status} onChange={(e) => { updateLead(l.id, e.target.value as Lead['status']); notify(`${l.name} marked ${e.target.value}.`); }} aria-label={`Status for ${l.name}`}>{['New', 'Contacted', 'Quoted', 'Won', 'Lost'].map((s) => <option key={s}>{s}</option>)}</select></td><td className="row-actions"><a href={`tel:${l.phone.replace(/\D/g, '')}`} onClick={() => l.status === 'New' && updateLead(l.id, 'Contacted')} aria-label={`Call ${l.name}`}><Phone size={14} /></a><a href={`mailto:${l.email}`} aria-label={`Email ${l.name}`}><Mail size={14} /></a><Link to={`/quotes/search-results?firstName=${encodeURIComponent(first)}&lastName=${encodeURIComponent(rest.join(' '))}`} onClick={() => updateLead(l.id, 'Quoted')}>Start quote</Link></td></tr>; })}</tbody></table>
    <p className="px-muted">Tip: contacting a lead within 5 minutes significantly improves conversion. <Link to="/resources/online-leads-help">Leads FAQs</Link></p>
  </Panel>;
}

export function FormsWidget() {
  const [params, setParams] = useSearchParams();
  const { customers, addEnvelope, notify } = usePortal();
  const [line, setLine] = useState('All');
  const [preview, setPreview] = useState<(typeof formsLibrary)[number] | null>(null);
  const [recipient, setRecipient] = useState('');
  const q = params.get('q') ?? '';
  const rows = formsLibrary.filter((f) => (line === 'All' || f.line === line) && `${f.code} ${f.name} ${f.line}`.toLowerCase().includes(q.toLowerCase()));
  return <Panel title="Forms library">
    <div className="px-toolbar"><input className="px-search" value={q} onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })} placeholder="Search by form number or name" aria-label="Search forms" /><select value={line} onChange={(e) => setLine(e.target.value)} aria-label="Line of business">{[...new Set(['All', ...formsLibrary.map((f) => f.line)])].map((l) => <option key={l}>{l}</option>)}</select></div>
    {rows.length === 0 ? <Empty>No forms match “{q}”.</Empty> : <table className="px-table"><thead><tr><th>Form</th><th>Name</th><th>Line</th><th>States</th><th /></tr></thead><tbody>{rows.map((f) => <tr key={f.code} className="clickable" onClick={() => setPreview(f)}><td className="mono">{f.code}</td><td>{f.name}</td><td>{f.line}</td><td>{f.states}</td><td><button type="button" className="link-button"><Eye size={13} /> Preview</button></td></tr>)}</tbody></table>}
    {preview && <Modal title={`${preview.code} — ${preview.name}`} wide onClose={() => setPreview(null)} footer={<><select value={recipient} onChange={(e) => setRecipient(e.target.value)} aria-label="Send to customer"><option value="">Send to customer…</option>{customers.map((c) => <option key={c.id}>{fullName(c)}</option>)}</select><button type="button" className="px-btn ghost" disabled={!recipient} onClick={() => { addEnvelope({ customer: recipient, document: `${preview.code} ${preview.name}` }); notify(`${preview.code} sent to ${recipient} for eSignature.`); setPreview(null); }}><Send size={13} /> eSign</button><button type="button" className="px-btn" onClick={() => window.print()}><Printer size={13} /> Print</button></>}>
      <div className="doc-preview printable"><header><span className="quote-erie-mark small">⌂</span><div><strong>{preview.name}</strong><small>Form {preview.code} · Edition 07/2026 · {preview.states === 'All' ? 'All states' : preview.states}</small></div></header>
        <div className="form-lines">{['Named insured', 'Policy number', 'Mailing address', 'Effective date of request', 'Details of request', 'Signature of named insured', 'Date'].map((label) => <div key={label}><span>{label}</span><i /></div>)}</div></div>
    </Modal>}
  </Panel>;
}

export function EriebooksWidget() {
  const [open, setOpen] = useState<(typeof eriebooks)[number] | null>(null);
  const [search, setSearch] = useState('');
  const chapters = ['Introduction & eligibility', 'Definitions', 'Rating rules', 'Coverage forms & endorsements', 'Discounts', 'State exceptions', 'Underwriting referrals', 'Appendix — forms list'];
  return <Panel title="Library">
    <div className="book-grid">{eriebooks.map((b) => <button key={b.title} type="button" className="book" onClick={() => setOpen(b)}><BookOpen size={22} /><strong>{b.title}</strong><small>Updated {b.updated} · {b.pages} pages</small></button>)}</div>
    {open && <Modal title={open.title} wide onClose={() => { setOpen(null); setSearch(''); }}><Field label="Search this manual"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. discounts" /></Field><ol className="toc">{chapters.map((c, i) => ({ c, page: 1 + i * Math.round(open.pages / chapters.length) })).filter(({ c }) => c.toLowerCase().includes(search.toLowerCase())).map(({ c, page }) => <li key={c}><span>{c}</span><small>p. {page}</small></li>)}</ol></Modal>}
  </Panel>;
}

const LMS_KEY = 'erie-agentexchange-lms';
export function LmsWidget() {
  const [params, setParams] = useSearchParams();
  const { notify } = usePortal();
  const tracks = { all: 'All courses', onboarding: 'New agent onboarding', personal: 'Personal lines', commercial: 'Commercial lines', ce: 'Continuing education' } as const;
  const requested = params.get('tab') ?? 'all';
  const tab = (requested in tracks ? requested : 'all') as keyof typeof tracks;
  const [progress, setProgress] = useState<Record<string, 'enrolled' | 'complete'>>(() => { try { const v: unknown = JSON.parse(localStorage.getItem(LMS_KEY) ?? '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, 'enrolled' | 'complete'>) : {}; } catch { return {}; } });
  const save = (next: typeof progress) => { setProgress(next); try { localStorage.setItem(LMS_KEY, JSON.stringify(next)); } catch { /* ignore */ } };
  const credits = courses.filter((c) => progress[c.id] === 'complete').reduce((s, c) => s + c.ce, 0);
  const list = courses.filter((c) => tab === 'all' || c.track === tab);
  return <Panel title="Course catalog" actions={<span className="px-muted">CE credits earned this cycle: <strong>{credits}</strong> / 24</span>}>
    <Tabs tabs={Object.values(tracks)} active={tracks[tab] ?? tracks.all} onChange={(label) => { const key = (Object.keys(tracks) as (keyof typeof tracks)[]).find((k) => tracks[k] === label)!; setParams(key === 'all' ? {} : { tab: key }); }} />
    <table className="px-table"><thead><tr><th>Course</th><th>Hours</th><th>CE</th><th>Status</th><th /></tr></thead><tbody>{list.map((c) => <tr key={c.id}><td><strong>{c.title}</strong><small className="cell-note">{c.id}</small></td><td>{c.hours}</td><td>{c.ce || '—'}</td><td>{progress[c.id] === 'complete' ? <StatusBadge status="Complete" /> : progress[c.id] === 'enrolled' ? <StatusBadge status="Enrolled" /> : '—'}</td><td>{!progress[c.id] && <button type="button" className="px-btn small" onClick={() => { save({ ...progress, [c.id]: 'enrolled' }); notify(`Enrolled in ${c.title}.`); }}>Enroll</button>}{progress[c.id] === 'enrolled' && <button type="button" className="px-btn small" onClick={() => { save({ ...progress, [c.id]: 'complete' }); notify(`Completed ${c.title}${c.ce ? ` — ${c.ce} CE credit(s) recorded` : ''}.`); }}>Launch &amp; complete</button>}{progress[c.id] === 'complete' && <button type="button" className="link-button" onClick={() => window.print()}>Certificate</button>}</td></tr>)}</tbody></table>
  </Panel>;
}

const MATERIALS = [
  { sku: 'MK-101', name: 'Auto + Home bundle brochure', unit: 0.35 },
  { sku: 'MK-114', name: 'Guaranteed Replacement Cost flyer', unit: 0.2 },
  { sku: 'MK-130', name: 'ERIE Rate Lock® explainer card', unit: 0.15 },
  { sku: 'MK-205', name: 'Co-branded calendar 2027', unit: 2.1 },
  { sku: 'MK-310', name: 'ERIE Family Life overview', unit: 0.3 },
  { sku: 'MK-400', name: 'Branded ice scraper (giveaway)', unit: 1.25 },
];
export function MarketingWidget() {
  const { notify } = usePortal();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [order, setOrder] = useState('');
  const total = MATERIALS.reduce((s, m) => s + (qty[m.sku] ?? 0) * m.unit, 0);
  const count = Object.values(qty).reduce((s, n) => s + n, 0);
  return <Panel title="Catalog" actions={<span className="px-muted"><ShoppingCart size={13} /> {count} items · {money(total, true)}</span>}>
    {order && <div className="px-note good"><CheckCircle2 size={14} /> Order {order} submitted. Ships to {AGENT.address} in 5–7 business days.</div>}
    <table className="px-table"><thead><tr><th>Item</th><th>SKU</th><th>Unit cost</th><th>Quantity</th></tr></thead><tbody>{MATERIALS.map((m) => <tr key={m.sku}><td>{m.name}</td><td className="mono">{m.sku}</td><td>{money(m.unit, true)}</td><td><input type="number" min={0} step={25} value={qty[m.sku] ?? 0} onChange={(e) => setQty({ ...qty, [m.sku]: Math.max(0, Number(e.target.value)) })} aria-label={`Quantity of ${m.name}`} className="qty" /></td></tr>)}</tbody></table>
    <div className="px-form-actions"><button type="button" className="px-btn" disabled={!count} onClick={() => { const id = `MO-${Math.floor(100000 + Math.random() * 900000)}`; setOrder(id); setQty({}); notify(`Marketing order ${id} submitted.`); }}>Submit order</button></div>
  </Panel>;
}

export function Af60Widget() {
  const { policies, customers, updatePolicy, notify } = usePortal();
  const [customerId, setCustomerId] = useState('');
  const [request, setRequest] = useState('Combine policies into one account bill');
  const [selected, setSelected] = useState<string[]>([]);
  const [dueDay, setDueDay] = useState('15');
  const [done, setDone] = useState('');
  const owned = useMemo(() => policies.filter((p) => p.customerId === customerId && p.status !== 'Cancelled'), [policies, customerId]);
  const submit = () => {
    if (!customerId || !selected.length) return notify('Select a customer and at least one policy.', 'error');
    const id = `AF60-${Math.floor(10000 + Math.random() * 90000)}`;
    selected.forEach((n) => updatePolicy(n, {}, `AF-60 billing request ${id}: ${request}${request.includes('due date') ? ` (day ${dueDay})` : ''}`));
    setDone(id); notify(`Billing request ${id} submitted to Customer Care.`);
  };
  return <Panel title="Account Billing Request (AF-60)">
    {done && <div className="px-note good"><CheckCircle2 size={14} /> Request {done} submitted. Billing changes take effect on the next bill.</div>}
    <div className="px-grid2">
      <Field label="Customer" required><select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setSelected([]); setDone(''); }}><option value="">-- Select --</option>{customers.map((c) => <option key={c.id} value={c.id}>{fullName(c)}</option>)}</select></Field>
      <Field label="Request type"><select value={request} onChange={(e) => setRequest(e.target.value)}>{['Combine policies into one account bill', 'Change due date', 'Change payment plan', 'Remove a policy from account billing', 'Change billing address'].map((r) => <option key={r}>{r}</option>)}</select></Field>
      {request === 'Change due date' && <Field label="New due day of month"><select value={dueDay} onChange={(e) => setDueDay(e.target.value)}>{Array.from({ length: 28 }, (_, i) => <option key={i + 1}>{i + 1}</option>)}</select></Field>}
    </div>
    {customerId && <div className="px-checks">{owned.map((p) => <label key={p.number}><input type="checkbox" checked={selected.includes(p.number)} onChange={(e) => setSelected(e.target.checked ? [...selected, p.number] : selected.filter((n) => n !== p.number))} /> {p.type} · {p.number} · {p.payPlan}</label>)}{owned.length === 0 && <span className="px-muted">No active policies.</span>}</div>}
    <div className="px-form-actions"><button type="button" className="px-btn" onClick={submit}>Submit request</button></div>
  </Panel>;
}
