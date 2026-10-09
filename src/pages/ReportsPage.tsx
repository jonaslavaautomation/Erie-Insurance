import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { Empty, PageTitle, Panel, Tabs } from '@/components/ui';
import { addDays, fullName, today, usePortal } from '@/data/store';
import { AGENT } from '@/data/seed';
import { money } from '@/lib/rating';
import type { PolicyType } from '@/data/types';

const reports = [
  { id: 'performance', label: 'ERIE Performance Report' },
  { id: 'production', label: 'Sales Production' },
  { id: 'book', label: 'Book of Business' },
  { id: 'retention', label: 'Retention & Renewals' },
  { id: 'loss-ratio', label: 'Loss Ratio' },
] as const;

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url; link.download = `${name}-${today()}.csv`; link.click();
  URL.revokeObjectURL(url);
}

// Single-series horizontal bar chart: one hue, value labels in text ink, per-bar hover tooltip.
function BarChart({ data, format, label }: { data: { name: string; value: number }[]; format: (v: number) => string; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  return <figure className="bar-chart" aria-label={label}>
    {data.map((d, i) => <div key={d.name} className="bar-row" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}>
      <span className="bar-label">{d.name}</span>
      <span className="bar-track"><span className="bar-fill" style={{ width: `${(d.value / max) * 100}%` }} />{hover === i && <span className="bar-tip" role="tooltip"><strong>{d.name}</strong>{format(d.value)}</span>}</span>
      <span className="bar-value">{format(d.value)}</span>
    </div>)}
  </figure>;
}

export default function ReportsPage() {
  const { id = 'performance' } = useParams();
  const navigate = useNavigate();
  const { policies, claims, customers, quotes } = usePortal();
  const active = reports.find((r) => r.id === id) ?? reports[0];
  const inForce = policies.filter((p) => p.status !== 'Cancelled');
  const types: PolicyType[] = ['Auto', 'Home', 'Boat', 'Life', 'Umbrella', 'Business'];

  const byLine = useMemo(() => types.map((t) => {
    const ps = inForce.filter((p) => p.type === t);
    const premium = ps.reduce((s, p) => s + p.premium, 0);
    const losses = claims.filter((c) => ps.some((p) => p.number === c.policyNumber)).reduce((s, c) => s + c.paid + Math.max(0, c.reserve - c.paid), 0);
    return { type: t, count: ps.length, premium, losses };
  }).filter((r) => r.count > 0), [inForce, claims]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPremium = byLine.reduce((s, r) => s + r.premium, 0);
  const totalLosses = byLine.reduce((s, r) => s + r.losses, 0);
  const issuedQuotes = quotes.filter((q) => q.status === 'Issued');
  const closedQuotes = quotes.filter((q) => q.status === 'Issued' || q.status === 'Declined' || q.status === 'Archived');
  const renewals = inForce.filter((p) => p.expiration >= today() && p.expiration <= addDays(today(), 60)).sort((a, b) => a.expiration.localeCompare(b.expiration));
  const customerName = (cid: string) => { const c = customers.find((x) => x.id === cid); return c ? fullName(c) : ''; };

  // Monthly new-business production: seeded history plus anything issued in this session.
  const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const seeded = [14200, 18650, 16900, 21400, 19800, 0];
  const issuedThisSession = policies.filter((p) => p.quoteId).reduce((sum, p) => sum + p.premium, 0);
  const production = months.map((m, i) => ({ name: `${m} 2026`, value: seeded[i] + (i === months.length - 1 ? issuedThisSession : 0) }));

  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: 'Reports' }]} title={active.label} subtitle={`As of ${today()} · Agency: ${AGENT.agency}`} />
    <Tabs tabs={reports.map((r) => r.label)} active={active.label} onChange={(label) => navigate(`/reports/${reports.find((r) => r.label === label)!.id}`)} />

    {active.id === 'performance' && <>
      <div className="stat-row cards"><Link to="/reports/book"><span>Policies in force</span><strong>{inForce.length}</strong></Link><Link to="/reports/book"><span>Written premium</span><strong>{money(totalPremium)}</strong></Link><Link to="/reports/loss-ratio"><span>Loss ratio</span><strong>{totalPremium ? Math.round((totalLosses / totalPremium) * 100) : 0}%</strong></Link><Link to="/reports/production"><span>Quote close rate</span><strong>{closedQuotes.length ? Math.round((issuedQuotes.length / closedQuotes.length) * 100) : 0}%</strong></Link></div>
      <div className="px-cols even"><Panel title="Written premium by line"><BarChart label="Written premium by line" data={byLine.map((r) => ({ name: r.type, value: r.premium }))} format={(v) => money(v)} /></Panel>
        <Panel title="Policies in force by line"><BarChart label="Policies by line" data={byLine.map((r) => ({ name: r.type, value: r.count }))} format={(v) => String(v)} /></Panel></div>
      <Panel title="Agency scorecard"><table className="px-table"><thead><tr><th>Measure</th><th>Agency</th><th>Branch target</th></tr></thead><tbody><tr><td>Policies per household</td><td>{(inForce.length / Math.max(1, new Set(inForce.map((p) => p.customerId)).size)).toFixed(2)}</td><td>2.20</td></tr><tr><td>Auto + home bundled households</td><td>{customers.filter((c) => inForce.some((p) => p.customerId === c.id && p.type === 'Auto') && inForce.some((p) => p.customerId === c.id && p.type === 'Home')).length}</td><td>—</td></tr><tr><td>AutoPay adoption</td><td>{Math.round((inForce.filter((p) => p.autoPay).length / Math.max(1, inForce.length)) * 100)}%</td><td>60%</td></tr></tbody></table></Panel>
    </>}

    {active.id === 'production' && <>
      <Panel title="New business premium by month"><BarChart label="New business by month" data={production} format={(v) => money(v)} /></Panel>
      <Panel title="Issued from quotes" actions={<button type="button" className="link-button" onClick={() => downloadCsv('production', [['Quote', 'Applicant', 'Products', 'Policies'], ...issuedQuotes.map((q) => [q.id, fullName(q.applicant), q.products.join('+'), q.issuedPolicies.join(' ')])])}><Download size={13} /> Export CSV</button>}>{issuedQuotes.length === 0 ? <Empty>No quotes issued yet this period. <Link to="/quotes/search-results">Start a quote</Link>.</Empty> : <table className="px-table"><thead><tr><th>Quote</th><th>Applicant</th><th>Products</th><th>Policies</th></tr></thead><tbody>{issuedQuotes.map((q) => <tr key={q.id}><td><Link className="mono" to={`/quotes/${q.id}/issued`}>{q.id}</Link></td><td>{fullName(q.applicant)}</td><td>{q.products.join(', ')}</td><td>{q.issuedPolicies.map((n) => <Link key={n} className="mono" to={`/policies/${n}`}>{n} </Link>)}</td></tr>)}</tbody></table>}</Panel>
    </>}

    {active.id === 'book' && <Panel title={`${policies.length} policies`} actions={<button type="button" className="link-button" onClick={() => downloadCsv('book-of-business', [['Policy', 'Type', 'Insured', 'Status', 'Effective', 'Expiration', 'Premium', 'Plan', 'AutoPay'], ...policies.map((p) => [p.number, p.type, customerName(p.customerId), p.status, p.effective, p.expiration, p.premium, p.payPlan, p.autoPay ? 'Y' : 'N'])])}><Download size={13} /> Export CSV</button>}>
      <div className="px-table-wrap"><table className="px-table"><thead><tr><th>Policy</th><th>Type</th><th>Insured</th><th>Status</th><th>Term</th><th>Premium</th><th>Plan</th></tr></thead><tbody>{policies.map((p) => <tr key={p.number} className="clickable" onClick={() => navigate(`/policies/${p.number}`)}><td className="mono"><Link to={`/policies/${p.number}`} onClick={(e) => e.stopPropagation()}>{p.number}</Link></td><td>{p.type}</td><td>{customerName(p.customerId)}</td><td>{p.status}</td><td>{p.effective} – {p.expiration}</td><td>{money(p.premium)}</td><td>{p.payPlan}{p.autoPay ? ' · AutoPay' : ''}</td></tr>)}</tbody></table></div>
    </Panel>}

    {active.id === 'retention' && <>
      <div className="stat-row cards"><div><span>Renewing in 60 days</span><strong>{renewals.length}</strong></div><div><span>Premium up for renewal</span><strong>{money(renewals.reduce((s, p) => s + p.premium, 0))}</strong></div><div><span>Pending cancellations</span><strong>{policies.filter((p) => p.status === 'Pending Cancel').length}</strong></div><div><span>12-month retention</span><strong>91%</strong></div></div>
      <Panel title="Upcoming renewals">{renewals.length === 0 ? <Empty>No renewals in the next 60 days.</Empty> : <table className="px-table"><thead><tr><th>Policy</th><th>Insured</th><th>Expires</th><th>Premium</th><th>Next step</th></tr></thead><tbody>{renewals.map((p) => <tr key={p.number}><td><Link className="mono" to={`/policies/${p.number}`}>{p.number}</Link></td><td><Link to={`/customers/${p.customerId}`}>{customerName(p.customerId)}</Link></td><td>{p.expiration}</td><td>{money(p.premium)}</td><td><Link to={`/customers/${p.customerId}`}>Schedule coverage review</Link></td></tr>)}</tbody></table>}</Panel>
      <Panel title="At-risk policies">{policies.filter((p) => p.status === 'Pending Cancel').map((p) => <div key={p.number} className="selected-row"><div><strong className="mono">{p.number}</strong><small>{customerName(p.customerId)} · {p.history[0]?.text}</small></div><Link className="px-btn small" to={`/policies/${p.number}`}>Review</Link></div>)}{policies.every((p) => p.status !== 'Pending Cancel') && <Empty>No at-risk policies.</Empty>}</Panel>
    </>}

    {active.id === 'loss-ratio' && <>
      <Panel title="Incurred loss ratio by line"><BarChart label="Loss ratio by line" data={byLine.map((r) => ({ name: r.type, value: r.premium ? Math.round((r.losses / r.premium) * 100) : 0 }))} format={(v) => `${v}%`} /></Panel>
      <Panel title="Detail" actions={<button type="button" className="link-button" onClick={() => downloadCsv('loss-ratio', [['Line', 'Policies', 'Premium', 'Incurred losses', 'Loss ratio'], ...byLine.map((r) => [r.type, r.count, r.premium, r.losses, r.premium ? `${Math.round((r.losses / r.premium) * 100)}%` : '0%'])])}><Download size={13} /> Export CSV</button>}><table className="px-table"><thead><tr><th>Line</th><th>Policies</th><th>Earned premium</th><th>Incurred losses</th><th>Loss ratio</th></tr></thead><tbody>{byLine.map((r) => <tr key={r.type}><td>{r.type}</td><td>{r.count}</td><td>{money(r.premium)}</td><td>{money(r.losses)}</td><td>{r.premium ? Math.round((r.losses / r.premium) * 100) : 0}%</td></tr>)}<tr className="total"><td>Total</td><td>{inForce.length}</td><td>{money(totalPremium)}</td><td>{money(totalLosses)}</td><td>{totalPremium ? Math.round((totalLosses / totalPremium) * 100) : 0}%</td></tr></tbody></table><p className="px-muted">Incurred = paid + outstanding reserves. Earned premium approximated as written premium.</p></Panel>
    </>}
  </main></PortalLayout>;
}
