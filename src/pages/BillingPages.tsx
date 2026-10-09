import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, CreditCard, Printer, RefreshCcw } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { validCardExpiry } from '@/lib/validation';
import { Empty, Field, PageTitle, Panel, StatusBadge } from '@/components/ui';
import { fullName, today, usePortal } from '@/data/store';
import { INSTALLMENT_FEE, money } from '@/lib/rating';
import type { Payment } from '@/data/types';

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
    <PageTitle crumbs={[{ label: 'Billing & Payments' }]} title="Payment Center" subtitle="Take payments, review billing accounts and manage AutoPay. Customer billing line: (800) 458-0811." actions={<><Link className="px-btn ghost" to="/billing/autopay"><RefreshCcw size={14} /> AutoPay enrollment</Link><Link className="px-btn" to="/billing/pay"><CreditCard size={14} /> One-time payment</Link></>} />
    <div className="stat-row cards"><button type="button" onClick={() => setFilter('all')}><span>Billing accounts</span><strong>{billing.length}</strong></button><button type="button" onClick={() => setFilter('due')}><span>Amount due (all)</span><strong>{money(billing.reduce((t, b) => t + b.minimumDue, 0), true)}</strong></button><button type="button" className={pastDue.length ? 'alert' : ''} onClick={() => setFilter('pastdue')}><span>Past due</span><strong>{pastDue.length} account{pastDue.length === 1 ? '' : 's'}</strong></button><div><span>On AutoPay</span><strong>{policies.filter((p) => p.autoPay).length} of {policies.length}</strong></div></div>
    <Panel>
      <div className="px-toolbar"><input className="px-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Policy number or insured name" aria-label="Search billing accounts" /><div className="px-chips">{[['all', 'All'], ['due', 'Amount due'], ['pastdue', 'Past due']].map(([id, label]) => <button key={id} type="button" className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>{customerId && <Link to="/billing" className="link-button">Clear customer filter</Link>}</div>
      {rows.length === 0 ? <Empty>No billing accounts match.</Empty> : <div className="px-table-wrap"><table className="px-table"><thead><tr><th>Policy</th><th>Insured</th><th>Plan</th><th>Minimum due</th><th>Due date</th><th>Balance</th><th>AutoPay</th><th /></tr></thead><tbody>{rows.map(({ b, policy, customer }) => { const late = b.minimumDue > 0 && b.nextDueDate < today(); return <tr key={b.policyNumber} className="clickable" onClick={() => navigate(`/policies/${b.policyNumber}`)}><td><Link className="mono" to={`/policies/${b.policyNumber}`} onClick={(e) => e.stopPropagation()}>{b.policyNumber}</Link> <small className="cell-note">{policy.type}</small></td><td>{customer ? <Link to={`/customers/${customer.id}`} onClick={(e) => e.stopPropagation()}>{fullName(customer)}</Link> : '—'}</td><td>{policy.payPlan}</td><td>{money(b.minimumDue, true)}</td><td>{b.minimumDue > 0 ? b.nextDueDate : '—'} {late && <StatusBadge status="Past due" />}</td><td>{money(b.balance, true)}</td><td>{policy.autoPay ? 'Yes' : <Link to={`/billing/autopay?policy=${b.policyNumber}`} onClick={(e) => e.stopPropagation()}>Enroll</Link>}</td><td onClick={(e) => e.stopPropagation()}>{b.balance > 0 && <Link className="px-btn small" to={`/billing/pay?policy=${b.policyNumber}`}>Pay</Link>}</td></tr>; })}</tbody></table></div>}
    </Panel>
    <Panel title="Recent payments">{recent.length === 0 ? <Empty>No payments.</Empty> : <table className="px-table"><thead><tr><th>Date</th><th>Policy</th><th>Amount</th><th>Method</th><th>Confirmation</th></tr></thead><tbody>{recent.map((p) => <tr key={p.id}><td>{p.date}</td><td><Link className="mono" to={`/policies/${p.policyNumber}`}>{p.policyNumber}</Link></td><td>{money(p.amount, true)}</td><td>{p.method}</td><td className="mono">{p.confirmation}</td></tr>)}</tbody></table>}</Panel>
  </main></PortalLayout>;
}

export function PaymentPage() {
  const [params] = useSearchParams();
  const { billing, policies, customers, makePayment, notify } = usePortal();
  const customerId = params.get('customer');
  const [policyNumber, setPolicyNumber] = useState(params.get('policy') ?? '');
  const [lookup, setLookup] = useState('');
  const [amountType, setAmountType] = useState<'minimum' | 'balance' | 'other'>('minimum');
  const [other, setOther] = useState('');
  const [method, setMethod] = useState<'eft' | 'card'>('eft');
  const [pay, setPay] = useState({ name: '', routing: '', account: '', accountType: 'Checking', card: '', exp: '', cvv: '', zip: '' });
  const [errors, setErrors] = useState<string[]>([]);
  const [receipt, setReceipt] = useState<Payment | null>(null);

  const account = billing.find((b) => b.policyNumber === policyNumber);
  const policy = policies.find((p) => p.number === policyNumber);
  const customer = policy ? customers.find((c) => c.id === policy.customerId) : undefined;
  const choices = billing.filter((b) => { const p = policies.find((x) => x.number === b.policyNumber); const c = customers.find((x) => x.id === p?.customerId); return (!customerId || p?.customerId === customerId) && `${b.policyNumber} ${c ? fullName(c) : ''}`.toLowerCase().includes(lookup.toLowerCase()); });
  const amount = !account ? 0 : amountType === 'minimum' ? account.minimumDue : amountType === 'balance' ? account.balance : Number(other) || 0;

  const submit = () => {
    const problems: string[] = [];
    if (!account) problems.push('Select a policy.');
    if (amount <= 0) problems.push('Payment amount must be greater than $0.');
    if (account && amount > account.balance + 0.001) problems.push(`Amount cannot exceed the remaining balance of ${money(account.balance, true)}.`);
    if (!pay.name.trim()) problems.push('Enter the payer name.');
    if (method === 'eft' && (!/^\d{9}$/.test(pay.routing) || pay.account.length < 4)) problems.push('Enter a 9-digit routing number and an account number.');
    if (method === 'card' && (!/^\d{15,16}$/.test(pay.card.replace(/\s/g, '')) || !validCardExpiry(pay.exp) || !/^\d{3,4}$/.test(pay.cvv))) problems.push('Enter a valid card number, expiration (MM/YY) and CVV.');
    setErrors(problems);
    if (problems.length || !account) return;
    const label = method === 'eft' ? `${pay.accountType} ••${pay.account.slice(-4)}` : `Card ••${pay.card.replace(/\s/g, '').slice(-4)}`;
    const payment = makePayment(account.policyNumber, Math.round(amount * 100) / 100, label);
    setReceipt(payment);
    notify(`Payment of ${money(payment.amount, true)} applied. Confirmation ${payment.confirmation}.`);
  };

  if (receipt) return <PortalLayout><main className="px-page narrow">
    <PageTitle crumbs={[{ label: 'Billing', to: '/billing' }, { label: 'Payment receipt' }]} title="Payment received" />
    <Panel><div className="issued-hero printable"><CheckCircle2 size={40} /><div><h2>{money(receipt.amount, true)} applied to {receipt.policyNumber}</h2><p>Confirmation <strong className="mono">{receipt.confirmation}</strong> · {receipt.date} · {receipt.method}</p><p>Payments post the same day when made before 8 p.m. ET.</p></div></div>
      <div className="issued-actions"><button type="button" className="outline-action" onClick={() => window.print()}><Printer size={13} /> PRINT RECEIPT</button><Link className="outline-action" to={`/policies/${receipt.policyNumber}`}>VIEW POLICY</Link>{!policy?.autoPay && <Link className="outline-action" to={`/billing/autopay?policy=${receipt.policyNumber}`}>ENROLL IN AUTOPAY</Link>}<Link className="continue-action" to="/billing">BACK TO PAYMENT CENTER</Link></div></Panel>
  </main></PortalLayout>;

  return <PortalLayout><main className="px-page narrow">
    <PageTitle crumbs={[{ label: 'Billing', to: '/billing' }, { label: 'One-time payment' }]} title="One-time Payment" subtitle="Take a payment on behalf of the customer. A receipt is emailed to the address on file." />
    <Panel title="1. Policy">
      {account && policy ? <div className="selected-row"><div><strong>{policy.type} · <span className="mono">{policy.number}</span></strong><small>{customer ? fullName(customer) : ''} · Minimum due {money(account.minimumDue, true)} by {account.nextDueDate} · Balance {money(account.balance, true)}</small></div><button type="button" className="link-button" onClick={() => setPolicyNumber('')}>Change</button></div>
        : <><Field label="Find policy"><input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="Policy number or insured name" /></Field><div className="select-list">{choices.map((b) => { const p = policies.find((x) => x.number === b.policyNumber); const c = customers.find((x) => x.id === p?.customerId); return <label key={b.policyNumber}><input type="radio" name="pol" onChange={() => setPolicyNumber(b.policyNumber)} /><span><strong>{p?.type} · {b.policyNumber}</strong><small>{c ? fullName(c) : ''} · Due {money(b.minimumDue, true)}</small></span></label>; })}</div></>}
    </Panel>
    {account && <>
      <Panel title="2. Amount"><div className="plan-grid">
        <label className={`plan ${amountType === 'minimum' ? 'on' : ''}`}><input type="radio" checked={amountType === 'minimum'} onChange={() => setAmountType('minimum')} /><strong>Minimum due</strong><span>{money(account.minimumDue, true)}</span></label>
        <label className={`plan ${amountType === 'balance' ? 'on' : ''}`}><input type="radio" checked={amountType === 'balance'} onChange={() => setAmountType('balance')} /><strong>Remaining balance</strong><span>{money(account.balance, true)}</span></label>
        <label className={`plan ${amountType === 'other' ? 'on' : ''}`}><input type="radio" checked={amountType === 'other'} onChange={() => setAmountType('other')} /><strong>Other amount</strong><input type="number" min={0} step="0.01" value={other} onFocus={() => setAmountType('other')} onChange={(e) => setOther(e.target.value)} placeholder="0.00" aria-label="Other amount" /></label>
      </div></Panel>
      <Panel title="3. Payment method">
        <div className="pay-tabs"><button type="button" className={method === 'eft' ? 'on' : ''} onClick={() => setMethod('eft')}>Bank account</button><button type="button" className={method === 'card' ? 'on' : ''} onClick={() => setMethod('card')}>Debit / credit card</button></div>
        <div className="px-grid3"><Field label="Name on account" required className="span3"><input value={pay.name} onChange={(e) => setPay({ ...pay, name: e.target.value })} placeholder={customer ? fullName(customer) : ''} /></Field>
          {method === 'eft' ? <><Field label="Account type"><select value={pay.accountType} onChange={(e) => setPay({ ...pay, accountType: e.target.value })}><option>Checking</option><option>Savings</option></select></Field><Field label="Routing number" required><input value={pay.routing} inputMode="numeric" onChange={(e) => setPay({ ...pay, routing: e.target.value.replace(/\D/g, '').slice(0, 9) })} /></Field><Field label="Account number" required><input value={pay.account} inputMode="numeric" onChange={(e) => setPay({ ...pay, account: e.target.value.replace(/\D/g, '').slice(0, 17) })} /></Field></>
            : <><Field label="Card number" required><input value={pay.card} inputMode="numeric" onChange={(e) => setPay({ ...pay, card: e.target.value.replace(/[^\d ]/g, '').slice(0, 19) })} /></Field><Field label="Expiration" required><input value={pay.exp} placeholder="MM/YY" onChange={(e) => setPay({ ...pay, exp: e.target.value.slice(0, 5) })} /></Field><Field label="CVV" required><input value={pay.cvv} inputMode="numeric" onChange={(e) => setPay({ ...pay, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></Field></>}
        </div>
        <p className="px-muted">Visa, Mastercard, Discover and American Express accepted. Test routing number: 075000022.</p>
      </Panel>
      {errors.length > 0 && <ul className="quote-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      <div className="px-form-actions"><Link className="px-btn ghost" to="/billing">Cancel</Link><button type="button" className="px-btn" onClick={submit}>Submit payment of {money(amount, true)}</button></div>
    </>}
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
