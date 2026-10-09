import { Link, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { Empty, PageTitle, Panel } from '@/components/ui';
import { useWorkItems, WorkKind } from '@/data/workqueue';

const kinds: ('All' | WorkKind)[] = ['All', 'Underwriting', 'Billing', 'Leads', 'eSignature', 'Claims', 'Renewals', 'Quotes'];

export default function WorkQueuePage() {
  const [params, setParams] = useSearchParams();
  const { items, dismiss, dismissedCount, restoreAll } = useWorkItems();
  const kind = (params.get('kind') ?? 'All') as (typeof kinds)[number];
  const rows = items.filter((i) => kind === 'All' || i.kind === kind);
  const high = items.filter((i) => i.priority === 'high').length;
  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: 'Work queue' }]} title="Agency Work Queue" subtitle={`${items.length} open item${items.length === 1 ? '' : 's'} · ${high} high priority`} actions={dismissedCount > 0 && <button type="button" className="px-btn ghost" onClick={restoreAll}>Show {dismissedCount} completed</button>} />
    <Panel>
      <div className="px-chips">{kinds.map((k) => <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setParams(k === 'All' ? {} : { kind: k })}>{k} <span>{k === 'All' ? items.length : items.filter((i) => i.kind === k).length}</span></button>)}</div>
      {rows.length === 0 ? <Empty>Nothing waiting here. Nice work.</Empty> : <ul className="work-list">{rows.map((i) => <li key={i.id} className={i.priority}>
        <span className={`work-kind ${i.kind.toLowerCase()}`}>{i.kind}</span>
        <div><strong>{i.title}</strong><small>{i.detail}</small></div>
        <span className="work-date">{i.date}</span>
        <Link className="px-btn small" to={i.to}>{i.action}</Link>
        <button type="button" className="link-button" onClick={() => dismiss(i.id)} aria-label={`Done: ${i.title}`}><Check size={14} /> Done</button>
      </li>)}</ul>}
    </Panel>
  </main></PortalLayout>;
}
