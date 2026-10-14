import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Car, HardHat, Truck, FilePlus2, Home, LifeBuoy, Mail, Pencil, Phone, Sailboat, Shield, Store, Umbrella, Wallet } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { Empty, Field, Modal, PageTitle, Panel, StatusBadge } from '@/components/ui';
import { fullName, usePortal } from '@/data/store';
import { homeFormName, money } from '@/lib/rating';
import type { Customer, Policy, PolicyType } from '@/data/types';

export const policyLabel = (p: Policy) => (p.homeCoverages?.form ? homeFormName[p.homeCoverages.form] : p.policyForm === 'Trucking' ? 'Trucking (Motor Carrier)' : p.policyForm ?? p.type);

export const policyIcon: Record<PolicyType, typeof Car> = { Auto: Car, Home, Boat: Sailboat, Life: LifeBuoy, Umbrella, Business: Store, 'Commercial Auto': Truck, 'Workers Comp': HardHat };

export function CustomerSearchPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { customers, policies } = usePortal();
  const by = params.get('by') ?? 'name';
  const [first, setFirst] = useState(params.get('first') ?? '');
  const [last, setLast] = useState(params.get('last') ?? '');
  const [number, setNumber] = useState(params.get('q') ?? '');

  const policyQuery = (params.get('q') ?? '').toUpperCase().replace(/\s/g, '');
  const firstQ = (params.get('first') ?? '').toLowerCase();
  const lastQ = (params.get('last') ?? '').toLowerCase();
  const results: Customer[] = by === 'policy'
    ? customers.filter((c) => policies.some((p) => p.customerId === c.id && p.number.replace(/\s/g, '').includes(policyQuery)))
    : customers.filter((c) => {
      const driverNames = policies.filter((p) => p.customerId === c.id).flatMap((p) => p.drivers.map((d) => `${d.firstName} ${d.lastName}`.toLowerCase()));
      const names = [`${c.firstName} ${c.lastName}`.toLowerCase(), ...driverNames];
      return names.some((n) => n.includes(firstQ) && n.includes(lastQ));
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setParams(by === 'policy' ? { by, q: number } : { by, first, last });
  };
  const exactPolicy = by === 'policy' ? policies.find((p) => p.number.replace(/\s/g, '') === policyQuery) : undefined;

  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: 'Customer Service' }]} title="Customer Search" subtitle="Search by named insured, listed driver, or policy number." />
    <Panel>
      <form className="px-toolbar" onSubmit={submit}>
        <select value={by} onChange={(e) => setParams({ by: e.target.value })} aria-label="Search by"><option value="name">Name (insured, driver)</option><option value="policy">Policy number</option></select>
        {by === 'policy' ? <input className="px-search" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Policy number" aria-label="Policy number" /> : <><input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First name" aria-label="First name" /><input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Last name" aria-label="Last name" /></>}
        <button type="submit" className="px-btn">Search</button>
      </form>
      {exactPolicy && <div className="px-note">Exact match: <Link to={`/policies/${exactPolicy.number}`}>{exactPolicy.type} policy {exactPolicy.number}</Link></div>}
      {results.length === 0 ? <Empty>No customers found. <Link to="/quotes/search-results">Start a new quote</Link> for a prospect.</Empty> : <table className="px-table"><thead><tr><th>Customer</th><th>Address</th><th>Policies</th><th>Customer since</th><th /></tr></thead><tbody>{results.map((c) => { const owned = policies.filter((p) => p.customerId === c.id); return <tr key={c.id} className="clickable" onClick={() => navigate(`/customers/${c.id}`)}><td><Link to={`/customers/${c.id}`} onClick={(e) => e.stopPropagation()}><strong>{c.lastName}, {c.firstName} {c.middleName}</strong></Link><small className="cell-note">{c.id}</small></td><td>{c.address}, {c.city}, {c.state} {c.zip}</td><td><div className="policy-pills">{owned.map((p) => { const Icon = policyIcon[p.type]; return <Link key={p.number} to={`/policies/${p.number}`} onClick={(e) => e.stopPropagation()} className="policy-pill"><Icon size={12} /> {p.number}</Link>; })}{owned.length === 0 && <span className="px-muted">Prospect</span>}</div></td><td>{c.customerSince}</td><td><Link to={`/customers/${c.id}`} onClick={(e) => e.stopPropagation()}>Open →</Link></td></tr>; })}</tbody></table>}
    </Panel>
  </main></PortalLayout>;
}

export function CustomerPage() {
  const { id = '' } = useParams();
  const { customers, policies, billing, claims, quotes } = usePortal();
  const [editing, setEditing] = useState(false);
  const customer = customers.find((c) => c.id === id);
  if (!customer) return <PortalLayout><main className="px-page"><PageTitle crumbs={[{ label: 'Customers', to: '/customers' }]} title="Customer not found" /><Panel><Empty><Link to="/customers">Back to customer search</Link></Empty></Panel></main></PortalLayout>;
  const owned = policies.filter((p) => p.customerId === id);
  const accounts = billing.filter((b) => owned.some((p) => p.number === b.policyNumber));
  const custClaims = claims.filter((c) => c.customerId === id);
  const custQuotes = quotes.filter((q) => q.customerId === id || fullName(q.applicant).toLowerCase() === fullName(customer).toLowerCase());
  const balance = accounts.reduce((t, a) => t + a.balance, 0);
  const due = accounts.reduce((t, a) => t + a.minimumDue, 0);
  const quoteParams = new URLSearchParams({ firstName: customer.firstName, lastName: customer.lastName });
  const ownedTypes = new Set(owned.map((p) => p.type));
  const crossSell = (['Auto', 'Home', 'Umbrella', 'Life'] as PolicyType[]).filter((t) => !ownedTypes.has(t));

  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: 'Customers', to: '/customers' }, { label: fullName(customer) }]} title={fullName(customer)} subtitle={`${customer.id} · ERIE customer since ${customer.customerSince}`} actions={<><Link className="px-btn ghost" to={`/quotes/search-results?${quoteParams}`}><FilePlus2 size={14} /> New quote</Link><Link className="px-btn ghost" to={`/claims/new?customer=${customer.id}`}><Shield size={14} /> Report claim</Link><Link className="px-btn" to={`/billing/pay?customer=${customer.id}`}><Wallet size={14} /> Make payment</Link></>} />
    <div className="px-cols">
      <div className="px-main-col">
        <Panel title={`Policies (${owned.length})`}>
          {owned.length === 0 ? <Empty>No policies yet.</Empty> : <div className="policy-cards">{owned.map((p) => { const Icon = policyIcon[p.type]; const acct = billing.find((b) => b.policyNumber === p.number); return <Link key={p.number} to={`/policies/${p.number}`} className="policy-card"><div className="policy-card-top"><Icon size={18} /><strong>{policyLabel(p)}</strong><StatusBadge status={p.status} /></div><span className="mono">{p.number}</span><span>{p.description}</span><span className="policy-card-meta">{p.effective} – {p.expiration} · {money(p.premium)}/yr</span>{acct && <span className="policy-card-meta">{acct.minimumDue > 0 ? `${money(acct.minimumDue, true)} due ${acct.nextDueDate}` : 'Paid — nothing due'}{p.autoPay ? ' · AutoPay' : ''}</span>}</Link>; })}</div>}
        </Panel>
        <Panel title={`Claims (${custClaims.length})`} actions={<Link to={`/claims/new?customer=${customer.id}`}>Report a claim</Link>}>
          {custClaims.length === 0 ? <Empty>No claims on file.</Empty> : <table className="px-table"><thead><tr><th>Claim #</th><th>Loss date</th><th>Type</th><th>Status</th><th>Paid</th></tr></thead><tbody>{custClaims.map((c) => <tr key={c.number}><td><Link to={`/claims/${c.number}`} className="mono">{c.number}</Link></td><td>{c.lossDate}</td><td>{c.lossType}</td><td><StatusBadge status={c.status} /></td><td>{money(c.paid)}</td></tr>)}</tbody></table>}
        </Panel>
        <Panel title={`Quotes (${custQuotes.length})`} actions={<Link to={`/quotes/search-results?${quoteParams}`}>New quote</Link>}>
          {custQuotes.length === 0 ? <Empty>No open quotes.</Empty> : <table className="px-table"><thead><tr><th>Quote #</th><th>Products</th><th>Status</th><th>Updated</th></tr></thead><tbody>{custQuotes.map((q) => <tr key={q.id}><td><Link className="mono" to={q.status === 'Issued' ? `/quotes/${q.id}/issued` : `/quotes/${q.id}/${q.lastStep}`}>{q.id}</Link></td><td>{q.products.join(', ')}</td><td><StatusBadge status={q.status} /></td><td>{q.updatedAt.slice(0, 10)}</td></tr>)}</tbody></table>}
        </Panel>
      </div>
      <div className="px-side-col">
        <Panel title="Contact" actions={<button type="button" className="link-button" onClick={() => setEditing(true)}><Pencil size={13} /> Edit</button>}>
          <dl className="px-dl"><dt>Mailing address</dt><dd>{customer.address}<br />{customer.city}, {customer.state} {customer.zip}</dd><dt>Date of birth</dt><dd>{customer.dob}</dd><dt>Phone</dt><dd>{customer.phone ? <a href={`tel:${customer.phone.replace(/\D/g, '')}`}><Phone size={12} /> {customer.phone}</a> : '—'}</dd><dt>Email</dt><dd>{customer.email ? <a href={`mailto:${customer.email}`}><Mail size={12} /> {customer.email}</a> : '—'}</dd></dl>
        </Panel>
        <Panel title="Billing summary" actions={<Link to={`/billing?customer=${customer.id}`}>Details</Link>}>
          <div className="stat-pair"><div><span>Minimum due</span><strong>{money(due, true)}</strong></div><div><span>Remaining balance</span><strong>{money(balance, true)}</strong></div></div>
          <Link className="px-btn wide" to={`/billing/pay?customer=${customer.id}`}>Make a payment</Link>
        </Panel>
        {crossSell.length > 0 && <Panel title="Cross-sell opportunities"><ul className="px-list">{crossSell.map((t) => <li key={t}><Link to={t === 'Auto' || t === 'Home' ? `/quotes/search-results?${quoteParams}` : t === 'Life' ? `/quotes/search-results?${quoteParams}&product=life` : '/products/umbrella'}>Quote {t === 'Umbrella' ? 'a Personal Catastrophe Liability (umbrella)' : t} policy</Link>{ownedTypes.size > 0 && t !== 'Umbrella' && t !== 'Life' && <small> — multi-policy discount</small>}</li>)}</ul></Panel>}
      </div>
    </div>
    {editing && <EditCustomerModal customer={customer} onClose={() => setEditing(false)} />}
  </main></PortalLayout>;
}

function EditCustomerModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const { notify, policies, updatePolicy, updateCustomer } = usePortal();
  const [form, setForm] = useState(customer);
  const set = (key: keyof Customer, value: string) => setForm({ ...form, [key]: value });
  const [error, setError] = useState('');
  const save = () => {
    if (!form.address.trim() || !form.city.trim()) return setError('Enter the street address and city.');
    if (!/^\d{5}$/.test(form.zip)) return setError('ZIP code must be 5 digits.');
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email address.');
    if (form.phone && form.phone.replace(/\D/g, '').length !== 10) return setError('Phone number must have 10 digits.');
    const addressChanged = form.address !== customer.address || form.city !== customer.city || form.zip !== customer.zip;
    const anyChange = addressChanged || form.phone !== customer.phone || form.email !== customer.email;
    if (!anyChange) { onClose(); return; }
    // Customer edits are recorded as a change on each of the customer's policies.
    policies.filter((p) => p.customerId === customer.id).forEach((p) => updatePolicy(p.number, {}, addressChanged ? `Mailing address changed to ${form.address}, ${form.city} ${form.zip}` : 'Contact information updated'));
    updateCustomer(form);
    notify('Customer contact information updated.');
    onClose();
  };
  return <Modal title="Edit contact information" onClose={onClose} footer={<><button type="button" className="px-btn ghost" onClick={onClose}>Cancel</button><button type="button" className="px-btn" onClick={save}>Save changes</button></>}>
    {error && <div className="agent-error block" role="alert">{error}</div>}
    <div className="px-grid2"><Field label="Street address" className="span2"><input value={form.address} onChange={(e) => set('address', e.target.value)} /></Field><Field label="City"><input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field><Field label="ZIP"><input value={form.zip} onChange={(e) => set('zip', e.target.value)} /></Field><Field label="Phone"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field><Field label="Email"><input value={form.email} onChange={(e) => set('email', e.target.value)} /></Field></div>
    <p className="px-muted">Address changes on auto policies may re-rate garaging territory. ERIE Rate Lock® premiums can change when the address changes.</p>
  </Modal>;
}
