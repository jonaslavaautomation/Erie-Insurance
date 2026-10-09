import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, RefreshCcw } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { Empty, Field, PageTitle, Panel, StatusBadge } from '@/components/ui';
import { fullName, isNonPaymentCancel, today, usePortal } from '@/data/store';
import { INSTALLMENT_FEE, money } from '@/lib/rating';

export function BillingPage() {
  const { billing, policies, customers } = usePortal();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const filter = params.get('filter') ?? 'all';
  const customerId = params.get('customer');
  const setFilter = (id: string) => { const next = new URLSearchParams(params); if (id === 'all') next.delete('filter'); else next.set('filter', id); setParams(next); };
  const rows = billing.map((b) => { const policy = policies.find((p) => p.number === b.policyNumber)!; const customer = customers.find((c) => c.id === policy?.customerId); return { b, policy, customer }; })
    .filter(({ policy, customer, b }) => policy && (!customerId || policy.customerId === customerId) && `${b.policyNumber} ${customer ? fullName(customer) : ''}`.toLowerCase().includes(query.toLowerCase()))
    .filter(({ b }) => (filter === 'pastdue' ? b.minimumDue > 0 && b.nextDueDate < today() : filter === 'due' ? b.minimumDue > 0 : true));
  const pastDue = billing.filter((b) => b.minimumDue > 0 && b.nextDueDate < today());
  const recent = billing.flatMap((b) => b.payments).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: 'Billing & Payments' }]} title="Payment Center" subtitle="Take payments, review billing accounts and manage AutoPay. Customer billing line: (800) 458-0811." actions={<><Link className="px-btn ghost" to="/billing/methods"><CreditCard size={14} /> Payment methods</Link><Link className="px-btn ghost" to="/billing/autopay"><RefreshCcw size={14} /> AutoPay enrollment</Link><Link className="px-btn" to="/billing/pay"><CreditCard size={14} /> One-time payment</Link></>} />
    <div className="stat-row cards"><button type="button" onClick={() => setFilter('all')}><span>Billing accounts</span><strong>{billing.length}</strong></button><button type="button" onClick={() => setFilter('due')}><span>Amount due (all)</span><strong>{money(billing.reduce((t, b) => t + b.minimumDue, 0), true)}</strong></button><button type="button" className={pastDue.length ? 'alert' : ''} onClick={() => setFilter('pastdue')}><span>Past due</span><strong>{pastDue.length} account{pastDue.length === 1 ? '' : 's'}</strong></button><div><span>On AutoPay</span><strong>{policies.filter((p) => p.autoPay).length} of {policies.length}</strong></div></div>
    <Panel>
      <div className="px-toolbar"><input className="px-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Policy number or insured name" aria-label="Search billing accounts" /><div className="px-chips">{[['all', 'All'], ['due', 'Amount due'], ['pastdue', 'Past due']].map(([id, label]) => <button key={id} type="button" className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>{customerId && <Link to="/billing" className="link-button">Clear customer filter</Link>}</div>
      {rows.length === 0 ? <Empty>No billing accounts match.</Empty> : <div className="px-table-wrap"><table className="px-table"><thead><tr><th>Policy</th><th>Insured</th><th>Plan</th><th>Minimum due</th><th>Due date</th><th>Balance</th><th>AutoPay</th><th /></tr></thead><tbody>{rows.map(({ b, policy, customer }) => { const late = b.minimumDue > 0 && b.nextDueDate < today(); return <tr key={b.policyNumber} className="clickable" onClick={() => navigate(`/policies/${b.policyNumber}`)}><td><Link className="mono" to={`/policies/${b.policyNumber}`} onClick={(e) => e.stopPropagation()}>{b.policyNumber}</Link> <small className="cell-note">{policy.type}</small></td><td>{customer ? <Link to={`/customers/${customer.id}`} onClick={(e) => e.stopPropagation()}>{fullName(customer)}</Link> : '—'}</td><td>{policy.payPlan}</td><td>{money(b.minimumDue, true)}</td><td>{b.minimumDue > 0 ? b.nextDueDate : '—'} {policy.status === 'Cancelled' ? <StatusBadge status="Cancelled" /> : late && <StatusBadge status="Past due" />}</td><td>{money(b.balance, true)}</td><td>{policy.autoPay ? 'Yes' : <Link to={`/billing/autopay?policy=${b.policyNumber}`} onClick={(e) => e.stopPropagation()}>Enroll</Link>}</td><td onClick={(e) => e.stopPropagation()}>{policy.status === 'Cancelled' && isNonPaymentCancel(policy) ? <Link className="px-btn small" to={`/billing/reinstate/${b.policyNumber}`}>Reinstate</Link> : b.balance > 0 && <Link className="px-btn small" to={`/billing/pay?policy=${b.policyNumber}`}>Pay</Link>}</td></tr>; })}</tbody></table></div>}
    </Panel>
    <Panel title="Recent payments">{recent.length === 0 ? <Empty>No payments.</Empty> : <table className="px-table"><thead><tr><th>Date</th><th>Policy</th><th>Amount</th><th>Method</th><th>Confirmation</th></tr></thead><tbody>{recent.map((p) => <tr key={p.id}><td>{p.date}</td><td><Link className="mono" to={`/policies/${p.policyNumber}`}>{p.policyNumber}</Link></td><td>{money(p.amount, true)}</td><td>{p.method}</td><td className="mono">{p.confirmation}</td></tr>)}</tbody></table>}</Panel>
  </main></PortalLayout>;
}

export function AutoPayPage() {
  const [params] = useSearchParams();
  const { policies, customers, setAutoPay, notify } = usePortal();
  const [policyNumber, setPolicyNumber] = useState(params.get('policy') ?? '');
  const blankForm = { routing: '', account: '', type: 'Checking', draftDay: 'Due date', authorized: false };
  const [form, setForm] = useState(blankForm);
  const [error, setError] = useState('');
  const policy = policies.find((p) => p.number === policyNumber);
  const customer = policy ? customers.find((c) => c.id === policy.customerId) : undefined;
  const enroll = () => {
    if (!policy) return setError('Select a policy.');
    if (!/^\d{9}$/.test(form.routing) || form.account.length < 4) return setError('Enter a 9-digit routing number and an account number.');
    if (!form.authorized) return setError('The customer must authorize recurring withdrawals.');
    setAutoPay(policy.number, true, `${form.type} ••${form.account.slice(-4)}`);
    setForm(blankForm);
    notify(`AutoPay enrolled for ${policy.number}. Installment fees are now waived.`);
    setError('');
  };
  return <PortalLayout><main className="px-page narrow">
    <PageTitle crumbs={[{ label: 'Billing', to: '/billing' }, { label: 'AutoPay' }]} title="AutoPay Enrollment" subtitle={`AutoPay withdraws each installment automatically and waives the $${INSTALLMENT_FEE} installment fee. Available on Annual, Quarterly, 9-Month and Monthly plans.`} />
    <Panel title="Policy"><Field label="Policy"><select value={policyNumber} onChange={(e) => { setPolicyNumber(e.target.value); setForm(blankForm); setError(''); }}><option value="">-- Select --</option>{policies.filter((p) => p.status !== 'Cancelled').map((p) => { const c = customers.find((x) => x.id === p.customerId); return <option key={p.number} value={p.number}>{p.number} · {p.type} · {c ? fullName(c) : ''}{p.autoPay ? ' (enrolled)' : ''}</option>; })}</select></Field>{policy && <p className="px-muted">{customer ? fullName(customer) : ''} · {policy.payPlan} plan · AutoPay is currently <strong>{policy.autoPay ? 'ON' : 'OFF'}</strong></p>}</Panel>
    {policy && (policy.autoPay ? <Panel title="Currently enrolled"><p>This policy is enrolled in AutoPay. To change the bank account, cancel and re-enroll.</p><button type="button" className="px-btn danger" onClick={() => { setAutoPay(policy.number, false, ''); notify(`AutoPay cancelled for ${policy.number}. Installment fees will apply.`, 'info'); }}>Cancel AutoPay</button></Panel>
      : <Panel title="Bank account"><div className="px-grid3"><Field label="Account type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Checking</option><option>Savings</option></select></Field><Field label="Routing number" required><input value={form.routing} inputMode="numeric" onChange={(e) => setForm({ ...form, routing: e.target.value.replace(/\D/g, '').slice(0, 9) })} /></Field><Field label="Account number" required><input value={form.account} inputMode="numeric" onChange={(e) => setForm({ ...form, account: e.target.value.replace(/\D/g, '').slice(0, 17) })} /></Field><Field label="Withdrawal day"><select value={form.draftDay} onChange={(e) => setForm({ ...form, draftDay: e.target.value })}><option>Due date</option><option>1st of month</option><option>15th of month</option></select></Field></div>
        <label className="px-checks"><input type="checkbox" checked={form.authorized} onChange={(e) => setForm({ ...form, authorized: e.target.checked })} /> Customer authorizes ERIE to withdraw installments from this account until revoked (form AF-12 or eSignature).</label>
        {error && <div className="agent-error block">{error}</div>}
        <div className="px-form-actions"><Link className="px-btn ghost" to="/billing">Cancel</Link><button type="button" className="px-btn" onClick={enroll}>Enroll in AutoPay</button></div></Panel>)}
  </main></PortalLayout>;
}
