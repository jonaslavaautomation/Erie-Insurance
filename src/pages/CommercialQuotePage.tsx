import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, HardHat, Truck } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { Field, PageTitle, Panel } from '@/components/ui';
import { commercialLineLabels } from '@/data/commercial';
import { STATES } from '@/data/content';
import { newQuoteDraft, usePortal } from '@/data/store';
import { AGENT } from '@/data/seed';
import type { CommercialLine } from '@/data/types';

// Commercial intake: collects the owner and business, then hands off to the unified rating wizard.
export default function CommercialQuotePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { saveQuote, notify } = usePortal();
  const [form, setForm] = useState({ ownerFirst: params.get('first') ?? '', ownerLast: params.get('last') ?? '', businessName: '', address: '', city: '', state: AGENT.stateCode, zip: '', agentNumber: AGENT.agentNumbers[0] });
  const [lines, setLines] = useState<CommercialLine[]>(['bop']);
  const [errors, setErrors] = useState<string[]>([]);
  const set = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  const icons: Record<CommercialLine, JSX.Element> = { bop: <Building2 size={15} />, contractors: <HardHat size={15} />, commercialAuto: <Truck size={15} />, workersComp: <HardHat size={15} /> };

  const start = (event: FormEvent) => {
    event.preventDefault();
    const problems: string[] = [];
    if (!form.ownerFirst.trim() || !form.ownerLast.trim()) problems.push('Enter the owner’s first and last name.');
    if (!form.businessName.trim()) problems.push('Enter the legal business name.');
    if (!form.address.trim() || !form.city.trim() || !/^\d{5}$/.test(form.zip)) problems.push('Enter the business location with a 5-digit ZIP.');
    if (!lines.length) problems.push('Select at least one commercial line.');
    setErrors(problems);
    if (problems.length) return;
    const quote = newQuoteDraft({ firstName: form.ownerFirst, middleName: '', lastName: form.ownerLast, address: form.address, city: form.city, state: form.state, zip: form.zip, dob: '', phone: '', email: '' });
    quote.products = ['commercial'];
    quote.agentNumbers = { commercial: form.agentNumber };
    quote.commercial = { ...quote.commercial, lines, business: { ...quote.commercial.business, businessName: form.businessName, ownerFirst: form.ownerFirst, ownerLast: form.ownerLast, address: form.address, city: form.city, state: form.state, zip: form.zip } };
    saveQuote(quote);
    notify(`Commercial quote ${quote.id} created.`);
    navigate(`/quotes/${quote.id}/underwriting`);
  };

  return <PortalLayout><main className="px-page narrow">
    <PageTitle crumbs={[{ label: 'Commercial', to: '/products/eriesecure-business' }, { label: 'New commercial quote' }]} title="New Commercial Quote" subtitle="Ultrapack Plus, Fivestar Contractors, Commercial Auto and Workers’ Compensation rate together and share multi-policy credits." />
    <Panel>
      <form onSubmit={start} noValidate>
        <div className="px-grid3">
          <Field label="Owner first name" required><input value={form.ownerFirst} onChange={(e) => set('ownerFirst', e.target.value)} /></Field>
          <Field label="Owner last name" required><input value={form.ownerLast} onChange={(e) => set('ownerLast', e.target.value)} /></Field>
          <Field label="Agent number"><select value={form.agentNumber} onChange={(e) => set('agentNumber', e.target.value)}>{AGENT.agentNumbers.map((a) => <option key={a}>{a}</option>)}</select></Field>
          <Field label="Legal business name" required className="span3"><input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} /></Field>
          <Field label="Business location" required className="span2"><input value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
          <Field label="City" required><input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="State"><select value={form.state} onChange={(e) => set('state', e.target.value)}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="ZIP" required><input value={form.zip} onChange={(e) => set('zip', e.target.value.replace(/\D/g, '').slice(0, 5))} /></Field>
        </div>
        <h2 className="section-h">Lines to quote</h2>
        <div className="line-picker">{(Object.keys(commercialLineLabels) as CommercialLine[]).map((line) => <label key={line} className={`plan ${lines.includes(line) ? 'on' : ''}`}><input type="checkbox" checked={lines.includes(line)} onChange={() => setLines(lines.includes(line) ? lines.filter((l) => l !== line) : [...lines, line])} /><strong>{icons[line]} {commercialLineLabels[line]}</strong></label>)}</div>
        {errors.length > 0 && <ul className="quote-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        <div className="px-form-actions"><button type="button" className="px-btn ghost" onClick={() => navigate(-1)}>Cancel</button><button type="submit" className="px-btn">Start quote</button></div>
      </form>
    </Panel>
  </main></PortalLayout>;
}
