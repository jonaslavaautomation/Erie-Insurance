import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, CreditCard, Download, FileText, Landmark, Plus, RotateCcw, Star, Trash2 } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { Empty, Field, PageTitle, Panel, StatusBadge } from '@/components/ui';
import { cancelDateOf, fullName, isNonPaymentCancel, today, usePortal } from '@/data/store';
import { money } from '@/lib/rating';
import { cardBrand, installmentSchedule, LATE_FEE, methodLabel, pastDue, reinstatementQuote, validCard, validRouting } from '@/lib/billing';
import { validCardExpiry } from '@/lib/validation';
import { billingStatementHtml, downloadDocument, openDocument, reinstatementNoticeHtml } from '@/lib/documents';
import type { Payment, PaymentMethod } from '@/data/types';

// ---- Shared payment method entry ---------------------------------------------------------------

export type MethodInput = { mode: string; card: { number: string; exp: string; cvv: string; name: string; zip: string }; ach: { routing: string; account: string; type: 'Checking' | 'Savings'; bank: string; name: string }; save: boolean };
export const blankMethodInput = (saved?: PaymentMethod): MethodInput => ({ mode: saved?.id ?? 'card', card: { number: '', exp: '', cvv: '', name: '', zip: '' }, ach: { routing: '', account: '', type: 'Checking', bank: '', name: '' }, save: false });

/** Validates the entry and returns a display label plus a method to save, or an error. */
export function resolveMethod(input: MethodInput, saved: PaymentMethod[], customerId: string): { error?: string; label?: string; toSave?: Omit<PaymentMethod, 'id'> } {
  const existing = saved.find((m) => m.id === input.mode);
  if (existing) return { label: methodLabel(existing) };
  if (input.mode === 'card') {
    const c = input.card;
    const cardError = validCard(c.number);
    if (cardError) return { error: cardError };
    if (!validCardExpiry(c.exp)) return { error: 'Expiration must be a valid future month (MM/YY).' };
    const brand = cardBrand(c.number)!;
    if (!new RegExp(`^\\d{${brand === 'Amex' ? 4 : 3}}$`).test(c.cvv)) return { error: `Security code is ${brand === 'Amex' ? 4 : 3} digits.` };
    if (!c.name.trim()) return { error: 'Enter the cardholder name.' };
    if (!/^\d{5}$/.test(c.zip)) return { error: 'Enter the billing ZIP code.' };
    const last4 = c.number.replace(/\D/g, '').slice(-4);
    return { label: `${brand} ••${last4}`, toSave: input.save ? { customerId, kind: 'card', brand, last4, holder: c.name.trim(), expiry: c.exp, isDefault: false } : undefined };
  }
  const a = input.ach;
  if (!validRouting(a.routing)) return { error: 'Routing number is not a valid 9-digit ABA number.' };
  if (!/^\d{4,17}$/.test(a.account)) return { error: 'Account number must be 4–17 digits.' };
  if (!a.name.trim()) return { error: 'Enter the account holder name.' };
  const last4 = a.account.slice(-4);
  return { label: `${a.type} ••${last4}`, toSave: input.save ? { customerId, kind: 'ach', brand: a.type, last4, holder: a.name.trim(), bankName: a.bank.trim() || undefined, isDefault: false } : undefined };
}

export function PaymentMethodFields({ value, onChange, saved, allowSave = true }: { value: MethodInput; onChange: (v: MethodInput) => void; saved: PaymentMethod[]; allowSave?: boolean }) {
  const brand = cardBrand(value.card.number);
  const setCard = (patch: Partial<MethodInput['card']>) => onChange({ ...value, card: { ...value.card, ...patch } });
  const setAch = (patch: Partial<MethodInput['ach']>) => onChange({ ...value, ach: { ...value.ach, ...patch } });
  return <>
    <div className="method-list">
      {saved.map((m) => <label key={m.id} className={`plan ${value.mode === m.id ? 'on' : ''}`}><input type="radio" checked={value.mode === m.id} onChange={() => onChange({ ...value, mode: m.id })} /><strong>{m.kind === 'card' ? <CreditCard size={14} /> : <Landmark size={14} />} {methodLabel(m)}</strong><span>{m.holder}{m.expiry ? ` · exp ${m.expiry}` : ''}</span>{m.isDefault && <small>Default</small>}</label>)}
      <label className={`plan ${value.mode === 'card' ? 'on' : ''}`}><input type="radio" checked={value.mode === 'card'} onChange={() => onChange({ ...value, mode: 'card' })} /><strong><Plus size={14} /> New card</strong><span>Visa, Mastercard, Amex, Discover</span></label>
      <label className={`plan ${value.mode === 'ach' ? 'on' : ''}`}><input type="radio" checked={value.mode === 'ach'} onChange={() => onChange({ ...value, mode: 'ach' })} /><strong><Plus size={14} /> New bank account</strong><span>ACH direct debit</span></label>
    </div>
    {value.mode === 'card' && <div className="px-grid3">
      <Field label="Card number" required hint={brand ?? undefined}><input value={value.card.number} inputMode="numeric" autoComplete="cc-number" onChange={(e) => setCard({ number: e.target.value.replace(/[^\d ]/g, '').slice(0, 19) })} placeholder="4111 1111 1111 1111" /></Field>
      <Field label="Expiration" required><input value={value.card.exp} autoComplete="cc-exp" onChange={(e) => setCard({ exp: e.target.value.slice(0, 5) })} placeholder="MM/YY" /></Field>
      <Field label={brand === 'Amex' ? 'CID (4 digits)' : 'CVV'} required><input value={value.card.cvv} inputMode="numeric" autoComplete="cc-csc" onChange={(e) => setCard({ cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></Field>
      <Field label="Name on card" required className="span2"><input value={value.card.name} autoComplete="cc-name" onChange={(e) => setCard({ name: e.target.value })} /></Field>
      <Field label="Billing ZIP" required><input value={value.card.zip} onChange={(e) => setCard({ zip: e.target.value.replace(/\D/g, '').slice(0, 5) })} /></Field>
    </div>}
    {value.mode === 'ach' && <div className="px-grid3">
      <Field label="Account type"><select value={value.ach.type} onChange={(e) => setAch({ type: e.target.value as 'Checking' | 'Savings' })}><option>Checking</option><option>Savings</option></select></Field>
      <Field label="Routing number" required><input value={value.ach.routing} inputMode="numeric" onChange={(e) => setAch({ routing: e.target.value.replace(/\D/g, '').slice(0, 9) })} /></Field>
      <Field label="Account number" required><input value={value.ach.account} inputMode="numeric" onChange={(e) => setAch({ account: e.target.value.replace(/\D/g, '').slice(0, 17) })} /></Field>
      <Field label="Account holder" required className="span2"><input value={value.ach.name} onChange={(e) => setAch({ name: e.target.value })} /></Field>
      <Field label="Bank name"><input value={value.ach.bank} onChange={(e) => setAch({ bank: e.target.value })} /></Field>
    </div>}
    {(value.mode === 'card' || value.mode === 'ach') && allowSave && <label className="px-checks"><input type="checkbox" checked={value.save} onChange={(e) => onChange({ ...value, save: e.target.checked })} /> Save this payment method to the customer’s account</label>}
    {(value.mode === 'card' || value.mode === 'ach') && <p className="px-muted">Test card 4111 1111 1111 1111 · test routing 075000022.</p>}
  </>;
}

// ---- One-time / scheduled payment ----------------------------------------------------------------

export function PaymentPage() {
  const [params] = useSearchParams();
  const { billing, policies, customers, paymentMethods, makePayment, savePaymentMethod, notify } = usePortal();
  const customerFilter = params.get('customer');
  const [policyNumber, setPolicyNumber] = useState(params.get('policy') ?? '');
  const [lookup, setLookup] = useState('');
  const [amountType, setAmountType] = useState<'due' | 'balance' | 'other'>('due');
  const [other, setOther] = useState('');
  const [payDate, setPayDate] = useState(today());
  const [errors, setErrors] = useState<string[]>([]);
  const [receipt, setReceipt] = useState<Payment | null>(null);

  const account = billing.find((b) => b.policyNumber === policyNumber);
  const policy = policies.find((p) => p.number === policyNumber);
  const customer = policy ? customers.find((c) => c.id === policy.customerId) : undefined;
  const saved = policy ? paymentMethods.filter((m) => m.customerId === policy.customerId) : [];
  const [method, setMethod] = useState<MethodInput>(() => blankMethodInput());
  const [methodFor, setMethodFor] = useState('');
  if (policy && methodFor !== policy.customerId) { setMethodFor(policy.customerId); setMethod(blankMethodInput(saved.find((m) => m.isDefault))); }

  const choices = billing.filter((b) => { const p = policies.find((x) => x.number === b.policyNumber); const c = customers.find((x) => x.id === p?.customerId); return (!customerFilter || p?.customerId === customerFilter) && `${b.policyNumber} ${c ? fullName(c) : ''}`.toLowerCase().includes(lookup.toLowerCase()); });
  const overdue = policy && account ? pastDue(policy, account) : 0;
  const amountDue = Math.max(account?.minimumDue ?? 0, overdue);
  const amount = !account ? 0 : amountType === 'due' ? amountDue : amountType === 'balance' ? account.balance : Number(other) || 0;
  const lapsed = policy && policy.status === 'Cancelled' && isNonPaymentCancel(policy);
  const latestDate = account && account.nextDueDate > today() ? account.nextDueDate : today();

  const submit = () => {
    const problems: string[] = [];
    if (!account || !policy) problems.push('Select a policy.');
    if (amount <= 0) problems.push('Payment amount must be greater than $0.');
    if (account && amount > account.balance + 0.001) problems.push(`Amount can’t exceed the remaining balance of ${money(account.balance, true)}.`);
    if (payDate < today() || payDate > latestDate) problems.push(`Payment date must be between today and ${latestDate}.`);
    const resolved = policy ? resolveMethod(method, saved, policy.customerId) : { error: 'Select a policy.' };
    if (resolved.error) problems.push(resolved.error);
    setErrors(problems);
    if (problems.length || !account || !resolved.label) return;
    if (resolved.toSave) savePaymentMethod(resolved.toSave);
    const payment = makePayment(account.policyNumber, Math.round(amount * 100) / 100, resolved.label, { date: payDate });
    setReceipt(payment);
    notify(payment.date > today() ? `Payment of ${money(payment.amount, true)} scheduled for ${payment.date}.` : `Payment of ${money(payment.amount, true)} applied. Confirmation ${payment.confirmation}.`);
  };

  if (receipt) return <PortalLayout><main className="px-page narrow">
    <PageTitle crumbs={[{ label: 'Billing', to: '/billing' }, { label: 'Payment receipt' }]} title={receipt.date > today() ? 'Payment scheduled' : 'Payment received'} />
    <Panel><div className="issued-hero printable"><CheckCircle2 size={40} /><div><h2>{money(receipt.amount, true)} {receipt.date > today() ? `scheduled for ${receipt.date}` : 'applied'} to {receipt.policyNumber}</h2><p>Confirmation <strong className="mono">{receipt.confirmation}</strong> · {receipt.method}</p><p>{receipt.date > today() ? 'The payment will post automatically on its scheduled date.' : 'Payments post the same day when made before 8 p.m. ET.'}</p></div></div>
      <div className="issued-actions"><button type="button" className="outline-action" onClick={() => window.print()}>PRINT RECEIPT</button>{policy && account && <button type="button" className="outline-action" onClick={() => openDocument(billingStatementHtml(policy, customer, billing.find((b) => b.policyNumber === policy.number) ?? account), `statement-${policy.number}`)}><FileText size={13} /> STATEMENT</button>}<Link className="outline-action" to={`/policies/${receipt.policyNumber}`}>VIEW POLICY</Link><Link className="continue-action" to="/billing">BACK TO PAYMENT CENTER</Link></div></Panel>
  </main></PortalLayout>;

  return <PortalLayout><main className="px-page narrow">
    <PageTitle crumbs={[{ label: 'Billing', to: '/billing' }, { label: 'Make a payment' }]} title="Make a Payment" subtitle="One-time or scheduled payment by card or bank account. A receipt is emailed to the address on file." />
    <Panel title="1. Policy">
      {account && policy ? <div className="selected-row"><div><strong>{policy.type} · <span className="mono">{policy.number}</span></strong><small>{customer ? fullName(customer) : ''} · Amount due {money(amountDue, true)}{overdue > 0 ? ` (includes ${money(overdue, true)} past due)` : ''} · Balance {money(account.balance, true)}</small></div><button type="button" className="link-button" onClick={() => { setPolicyNumber(''); setMethodFor(''); }}>Change</button></div>
        : <><Field label="Find policy"><input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="Policy number or insured name" /></Field><div className="select-list">{choices.map((b) => { const p = policies.find((x) => x.number === b.policyNumber); const c = customers.find((x) => x.id === p?.customerId); return <label key={b.policyNumber}><input type="radio" name="pol" onChange={() => setPolicyNumber(b.policyNumber)} /><span><strong>{p?.type} · {b.policyNumber}</strong><small>{c ? fullName(c) : ''} · Due {money(b.minimumDue, true)}</small></span></label>; })}</div></>}
    </Panel>
    {lapsed && policy && <div className="wizard-banner bad">This policy was cancelled for non-payment. Payments toward it go through reinstatement. <Link to={`/billing/reinstate/${policy.number}`}>Start reinstatement</Link></div>}
    {account && policy && !lapsed && <>
      <Panel title="2. Amount & date"><div className="plan-grid">
        <label className={`plan ${amountType === 'due' ? 'on' : ''}`}><input type="radio" checked={amountType === 'due'} onChange={() => setAmountType('due')} /><strong>Amount due</strong><span>{money(amountDue, true)}</span>{overdue > 0 && <small className="needs">Past due — a ${LATE_FEE} late fee may apply</small>}</label>
        <label className={`plan ${amountType === 'balance' ? 'on' : ''}`}><input type="radio" checked={amountType === 'balance'} onChange={() => setAmountType('balance')} /><strong>Pay in full</strong><span>{money(account.balance, true)}</span></label>
        <label className={`plan ${amountType === 'other' ? 'on' : ''}`}><input type="radio" checked={amountType === 'other'} onChange={() => setAmountType('other')} /><strong>Other amount</strong><input type="number" min={0} step="0.01" value={other} onFocus={() => setAmountType('other')} onChange={(e) => setOther(e.target.value)} placeholder="0.00" aria-label="Other amount" /></label>
      </div>
      <div className="px-grid3" style={{ marginTop: 12 }}><Field label="Payment date" hint={payDate > today() ? 'Scheduled — posts automatically on this date' : undefined}><input type="date" value={payDate} min={today()} max={latestDate} onChange={(e) => setPayDate(e.target.value)} /></Field></div></Panel>
      <Panel title="3. Payment method"><PaymentMethodFields value={method} onChange={setMethod} saved={saved} /></Panel>
      {errors.length > 0 && <ul className="quote-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      <div className="px-form-actions"><Link className="px-btn ghost" to="/billing">Cancel</Link><button type="button" className="px-btn" onClick={submit}>{payDate > today() ? 'Schedule' : 'Submit'} payment of {money(amount, true)}</button></div>
    </>}
  </main></PortalLayout>;
}

// ---- Saved payment methods ----------------------------------------------------------------------

export function PaymentMethodsPage() {
  const [params, setParams] = useSearchParams();
  const { customers, policies, paymentMethods, savePaymentMethod, removePaymentMethod, setDefaultPaymentMethod, notify } = usePortal();
  const customerId = params.get('customer') ?? '';
  const customer = customers.find((c) => c.id === customerId);
  const methods = paymentMethods.filter((m) => m.customerId === customerId);
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState<MethodInput>({ ...blankMethodInput(), save: true });
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState('');
  const autoPayPolicies = policies.filter((p) => p.customerId === customerId && p.autoPay);

  const add = () => {
    const r = resolveMethod({ ...input, save: true }, [], customerId);
    if (r.error || !r.toSave) return setError(r.error ?? 'Enter the payment method.');
    savePaymentMethod(r.toSave);
    notify(`${r.label} saved.`);
    setAdding(false); setError(''); setInput({ ...blankMethodInput(), save: true });
  };
  const saveEdit = () => {
    if (!editing) return;
    if (!editing.holder.trim()) return setError('Holder name is required.');
    if (editing.kind === 'card' && !validCardExpiry(editing.expiry ?? '')) return setError('Expiration must be a valid future month (MM/YY).');
    savePaymentMethod(editing);
    notify('Payment method updated.');
    setEditing(null); setError('');
  };

  return <PortalLayout><main className="px-page narrow">
    <PageTitle crumbs={[{ label: 'Billing', to: '/billing' }, { label: 'Payment methods' }]} title="Payment Methods" subtitle="Saved cards and bank accounts. The default method is used for EriePay AutoPay." />
    <Panel title="Customer"><Field label="Customer"><select value={customerId} onChange={(e) => { setParams({ customer: e.target.value }); setAdding(false); setEditing(null); setError(''); }}><option value="">-- Select --</option>{customers.map((c) => <option key={c.id} value={c.id}>{fullName(c)} · {c.id}</option>)}</select></Field>{customer && autoPayPolicies.length > 0 && <p className="px-muted">AutoPay is active on {autoPayPolicies.map((p) => p.number).join(', ')}.</p>}</Panel>
    {customer && <Panel title={`Saved methods (${methods.length})`} actions={!adding && <button type="button" className="px-btn small" onClick={() => { setAdding(true); setEditing(null); }}><Plus size={13} /> Add method</button>}>
      {methods.length === 0 ? <Empty>No saved payment methods.</Empty> : <table className="px-table"><thead><tr><th>Method</th><th>Holder</th><th>Expires</th><th /><th /></tr></thead><tbody>{methods.map((m) => <tr key={m.id}><td>{m.kind === 'card' ? <CreditCard size={14} /> : <Landmark size={14} />} {methodLabel(m)}</td><td>{m.holder}</td><td>{m.expiry ?? '—'}</td><td>{m.isDefault ? <StatusBadge status="Default" /> : <button type="button" className="link-button" onClick={() => { setDefaultPaymentMethod(m.id); notify(`${methodLabel(m)} is now the default.`); }}><Star size={13} /> Make default</button>}</td><td className="row-actions"><button type="button" className="link-button" onClick={() => { setEditing(m); setAdding(false); }}>Edit</button><button type="button" aria-label={`Remove ${methodLabel(m)}`} onClick={() => { if (window.confirm(`Remove ${methodLabel(m)}?`)) { removePaymentMethod(m.id); notify('Payment method removed.'); } }}><Trash2 size={14} /></button></td></tr>)}</tbody></table>}
      {editing && <div className="change-box"><div className="px-grid3"><Field label="Holder name" required className="span2"><input value={editing.holder} onChange={(e) => setEditing({ ...editing, holder: e.target.value })} /></Field>{editing.kind === 'card' ? <Field label="Expiration" required><input value={editing.expiry ?? ''} onChange={(e) => setEditing({ ...editing, expiry: e.target.value.slice(0, 5) })} placeholder="MM/YY" /></Field> : <Field label="Bank name"><input value={editing.bankName ?? ''} onChange={(e) => setEditing({ ...editing, bankName: e.target.value })} /></Field>}</div><div className="px-form-actions"><button type="button" className="px-btn ghost" onClick={() => setEditing(null)}>Cancel</button><button type="button" className="px-btn" onClick={saveEdit}>Save</button></div></div>}
      {adding && <div className="change-box"><PaymentMethodFields value={input.mode === 'card' || input.mode === 'ach' ? input : { ...input, mode: 'card' }} onChange={setInput} saved={[]} allowSave={false} /><div className="px-form-actions"><button type="button" className="px-btn ghost" onClick={() => setAdding(false)}>Cancel</button><button type="button" className="px-btn" onClick={add}>Save method</button></div></div>}
      {error && <div className="agent-error block">{error}</div>}
    </Panel>}
  </main></PortalLayout>;
}

// ---- Reinstatement after non-payment --------------------------------------------------------

export function ReinstatePage() {
  const { number = '' } = useParams();
  const { policies, billing, customers, paymentMethods, reinstateForNonPayment, savePaymentMethod, notify } = usePortal();
  const policy = policies.find((p) => p.number === number);
  const account = billing.find((b) => b.policyNumber === number);
  const customer = customers.find((c) => c.id === policy?.customerId);
  const saved = policy ? paymentMethods.filter((m) => m.customerId === policy.customerId) : [];
  const [method, setMethod] = useState<MethodInput>(() => blankMethodInput(saved.find((m) => m.isDefault)));
  const [statement, setStatement] = useState(false);
  const [signer, setSigner] = useState(customer ? fullName(customer) : '');
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState<{ payment: Payment; noLapse: boolean; signedBy: string; cancelDate?: string } | null>(null);

  if (!policy || !account) return <PortalLayout><main className="px-page narrow"><PageTitle crumbs={[{ label: 'Billing', to: '/billing' }]} title="Policy not found" /><Panel><Empty><Link to="/billing">Payment Center</Link></Empty></Panel></main></PortalLayout>;
  const cancelDate = cancelDateOf(policy);

  if (done) {
    const html = reinstatementNoticeHtml(policy, customer, { paid: done.payment.amount, noLapse: done.noLapse, signedBy: done.signedBy, date: today(), confirmation: done.payment.confirmation, cancelDate: done.cancelDate });
    return <PortalLayout><main className="px-page narrow">
      <PageTitle crumbs={[{ label: policy.number, to: `/policies/${policy.number}` }, { label: 'Reinstatement' }]} title="Policy reinstated" />
      <Panel><div className="issued-hero"><CheckCircle2 size={40} /><div><h2>{policy.number} is active again</h2><p>{done.noLapse ? 'Reinstated with no lapse in coverage.' : `Reinstated with a lapse from ${done.cancelDate} to ${today()}.`} Paid {money(done.payment.amount, true)} · confirmation {done.payment.confirmation}</p></div></div>
        <div className="issued-actions"><button type="button" className="outline-action" onClick={() => openDocument(html, `reinstatement-${policy.number}`)}><FileText size={13} /> REINSTATEMENT NOTICE</button><button type="button" className="outline-action" onClick={() => downloadDocument(html, `reinstatement-${policy.number}`)}><Download size={13} /> DOWNLOAD</button><Link className="continue-action" to={`/policies/${policy.number}`}>BACK TO POLICY</Link></div></Panel>
    </main></PortalLayout>;
  }

  if (!isNonPaymentCancel(policy) || (policy.status !== 'Cancelled' && policy.status !== 'Pending Cancel')) return <PortalLayout><main className="px-page narrow">
    <PageTitle crumbs={[{ label: policy.number, to: `/policies/${policy.number}` }, { label: 'Reinstatement' }]} title="Reinstatement not needed" subtitle={`${policy.number} is ${policy.status.toLowerCase()} and not cancelled for non-payment.`} />
    <Panel><Link className="px-btn" to={`/policies/${policy.number}`}>Back to policy</Link></Panel>
  </main></PortalLayout>;

  const quote = reinstatementQuote(policy, account, cancelDate);
  const overdueRows = installmentSchedule(policy, account).filter((i) => i.status === 'Overdue');

  const submit = () => {
    const problems: string[] = [];
    if (!statement) problems.push('The insured must confirm the statement of no known loss.');
    if (signer.trim().split(/\s+/).length < 2) problems.push('Enter the full name of the person signing.');
    const resolved = resolveMethod(method, saved, policy.customerId);
    if (resolved.error) problems.push(resolved.error);
    setErrors(problems);
    if (problems.length || !resolved.label) return;
    if (resolved.toSave) savePaymentMethod(resolved.toSave);
    const lateFee = quote.fees.find((f) => f.label === 'Late fee')?.amount ?? 0;
    const reinstatementFee = quote.fees.find((f) => f.label === 'Reinstatement fee')?.amount ?? 0;
    const payment = reinstateForNonPayment(policy.number, { pastDue: quote.pastDue, lateFee, reinstatementFee, method: resolved.label, noLapse: quote.noLapse, signedBy: signer.trim(), cancelDate });
    setDone({ payment: { ...payment, amount: quote.total }, noLapse: quote.noLapse, signedBy: signer.trim(), cancelDate });
    notify(`${policy.number} reinstated.`);
  };

  return <PortalLayout><main className="px-page narrow">
    <PageTitle crumbs={[{ label: customer ? fullName(customer) : 'Customer', to: `/customers/${policy.customerId}` }, { label: policy.number, to: `/policies/${policy.number}` }, { label: 'Reinstatement' }]} title="Reinstate Policy" subtitle={<><StatusBadge status={policy.status} /> {policy.description}</>} />
    <Panel title="Status">
      <dl className="px-dl two"><dt>Policy</dt><dd>{policy.number} · {policy.type}</dd><dt>{policy.status === 'Cancelled' ? 'Cancelled' : 'Cancels'}</dt><dd>{cancelDate ?? '—'}{quote.lapsed ? ` · ${quote.daysSinceCancel} day(s) ago` : ''}</dd><dt>Coverage continuity</dt><dd>{quote.noLapse ? <strong>No lapse — coverage continues as if never cancelled</strong> : <strong className="needs">Reinstated with a lapse — no coverage between {cancelDate} and today</strong>}</dd></dl>
      {overdueRows.length > 0 && <table className="px-table"><thead><tr><th>Overdue installment</th><th>Due</th><th className="num">Owed</th></tr></thead><tbody>{overdueRows.map((i) => <tr key={i.n}><td>#{i.n}</td><td>{i.due}</td><td className="num">{money(i.amount - i.paid, true)}</td></tr>)}</tbody></table>}
    </Panel>
    <Panel title="Amount required"><table className="px-table breakdown"><tbody><tr><td>Past-due premium</td><td className="num">{money(quote.pastDue, true)}</td></tr>{quote.fees.map((f) => <tr key={f.label}><td>{f.label}</td><td className="num">{money(f.amount, true)}</td></tr>)}<tr className="total"><td>Total due to reinstate</td><td className="num">{money(quote.total, true)}</td></tr></tbody></table><p className="px-muted">Late fee per ERIE’s published grace-period practice; reinstatement fee illustrative.</p></Panel>
    <Panel title="Statement of no known loss">
      <p className="px-body">I, the undersigned named insured, state that no accidents, losses or claims of any kind have occurred{cancelDate ? ` since ${cancelDate}` : ''} that could result in a claim under this policy. I understand that if a loss has occurred this reinstatement is void, and that a false statement is insurance fraud.</p>
      <label className="px-checks"><input type="checkbox" checked={statement} onChange={(e) => setStatement(e.target.checked)} /> The insured has read and confirms this statement</label>
      <div className="px-grid3"><Field label="Signed by (full name)" required className="span2"><input value={signer} onChange={(e) => setSigner(e.target.value)} /></Field><Field label="Date"><input value={today()} readOnly /></Field></div>
    </Panel>
    <Panel title="Payment"><PaymentMethodFields value={method} onChange={setMethod} saved={saved} /></Panel>
    {errors.length > 0 && <ul className="quote-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
    <div className="px-form-actions"><Link className="px-btn ghost" to={`/policies/${policy.number}`}>Cancel</Link><button type="button" className="px-btn" onClick={submit}><RotateCcw size={14} /> Pay {money(quote.total, true)} & reinstate</button></div>
  </main></PortalLayout>;
}
