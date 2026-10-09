import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { Empty, PageTitle, Panel, StatusBadge } from '@/components/ui';
import { fullName, premiumTotal, quotePremiums, usePortal } from '@/data/store';
import { money } from '@/lib/rating';
import { loadTemplates, saveTemplates } from '@/lib/templates';
import type { QuoteStatus } from '@/data/types';

const statuses: ('All' | QuoteStatus)[] = ['All', 'Quote', 'Referred', 'Application', 'Issued', 'Declined', 'Archived'];

export function QuotesListPage() {
  const { quotes, archiveQuotes, deleteQuotes, notify } = usePortal();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') ?? 'All') as (typeof statuses)[number];
  const [query, setQuery] = useState('');
  const rows = useMemo(() => quotes.filter((q) => (status === 'All' ? q.status !== 'Archived' : q.status === status) && `${fullName(q.applicant)} ${q.id}`.toLowerCase().includes(query.toLowerCase())), [quotes, status, query]);

  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: 'Quotes & Apps' }]} title="Quotes & Applications" subtitle={`${rows.length} shown · quotes are valid for 30 days`} actions={<Link className="px-btn" to="/quotes/search-results"><Plus size={14} /> New quote</Link>} />
    <Panel>
      <div className="px-toolbar"><input className="px-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or quote number" aria-label="Search quotes" /><div className="px-chips">{statuses.map((s) => <button key={s} type="button" className={status === s ? 'on' : ''} onClick={() => setParams(s === 'All' ? {} : { status: s })}>{s} <span>{s === 'All' ? quotes.filter((q) => q.status !== 'Archived').length : quotes.filter((q) => q.status === s).length}</span></button>)}</div></div>
      {rows.length === 0 ? <Empty>No quotes match. <Link to="/quotes/search-results">Start a new quote</Link>.</Empty> : <div className="px-table-wrap"><table className="px-table"><thead><tr><th>Quote #</th><th>Applicant</th><th>Products</th><th>Effective</th><th>Est. premium</th><th>Status</th><th>Updated</th><th /></tr></thead><tbody>{rows.map((q) => { const total = premiumTotal(quotePremiums(q)); return <tr key={q.id} className="clickable" onClick={() => navigate(q.status === 'Issued' ? `/quotes/${q.id}/issued` : `/quotes/${q.id}/${q.lastStep}`)}><td className="mono"><Link to={q.status === 'Issued' ? `/quotes/${q.id}/issued` : `/quotes/${q.id}/${q.lastStep}`} onClick={(e) => e.stopPropagation()}>{q.id}</Link></td><td>{fullName(q.applicant)}</td><td>{q.products.map((x) => x.toUpperCase()).join(', ')}</td><td>{q.effectiveDate}</td><td>{total ? money(total) : '—'}</td><td><StatusBadge status={q.status} /></td><td>{q.updatedAt.slice(0, 10)}</td><td className="row-actions" onClick={(e) => e.stopPropagation()}>{q.status === 'Archived' ? <button type="button" className="link-button" onClick={() => { archiveQuotes([q.id], false); notify('Quote restored.'); }}>Restore</button> : q.status !== 'Issued' && <button type="button" className="link-button" onClick={() => { archiveQuotes([q.id], true); notify('Quote archived.'); }}>Archive</button>}{q.status !== 'Issued' && <button type="button" aria-label="Delete quote" onClick={() => { if (window.confirm(`Delete quote ${q.id}?`)) { deleteQuotes([q.id]); notify('Quote deleted.'); } }}><Trash2 size={14} /></button>}</td></tr>; })}</tbody></table></div>}
    </Panel>
  </main></PortalLayout>;
}

export function TemplatesPage() {
  const { notify } = usePortal();
  const [templates, setTemplates] = useState(loadTemplates);
  const remove = (id: string) => { const next = templates.filter((t) => t.id !== id); saveTemplates(next); setTemplates(next); notify('Template deleted.'); };
  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: 'Quotes & Apps', to: '/quotes' }, { label: 'Templates' }]} title="Quote Templates" subtitle="Reuse your most common coverage selections. Save a template from the Coverages step of any quote." />
    <Panel>{templates.length === 0 ? <Empty>No templates yet. Open a quote, go to <strong>Coverages</strong> and choose <strong>Save as template</strong>.</Empty> : <table className="px-table"><thead><tr><th>Name</th><th>Auto limits</th><th>Deductibles</th><th>Endorsements</th><th>Created</th><th /></tr></thead><tbody>{templates.map((t) => <tr key={t.id}><td><strong>{t.name}</strong></td><td>{t.autoCoverages.bodilyInjury} / PD ${t.autoCoverages.propertyDamage}</td><td>Comp ${t.autoCoverages.comprehensiveDeductible} · Coll ${t.autoCoverages.collisionDeductible} · Home ${t.homeCoverages.deductible}</td><td>{[t.autoCoverages.autoPlus && 'Auto Plus', t.autoCoverages.roadsideRentals && 'Roadside & Rentals', t.homeCoverages.waterBackup && 'Water backup', t.homeCoverages.identityRecovery && 'Identity'].filter(Boolean).join(', ') || '—'}</td><td>{t.created}</td><td className="row-actions"><button type="button" onClick={() => remove(t.id)} aria-label="Delete template"><Trash2 size={14} /></button></td></tr>)}</tbody></table>}</Panel>
  </main></PortalLayout>;
}
