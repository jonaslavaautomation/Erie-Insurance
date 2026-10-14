import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ChevronRight, CircleAlert, Info, LogOut, MapPin, RotateCcw, Settings, User, X } from 'lucide-react';
import { usePortal } from '@/data/store';
import { AGENT } from '@/data/seed';

export function Panel({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`px-panel ${className}`}>{(title || actions) && <header className="px-panel-head"><h2>{title}</h2>{actions && <div className="px-panel-actions">{actions}</div>}</header>}<div className="px-panel-body">{children}</div></section>;
}

export function PageTitle({ crumbs, title, subtitle, actions }: { crumbs: { label: string; to?: string }[]; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return <div className="px-title"><nav className="px-crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link>{crumbs.map((crumb) => <span key={crumb.label}><ChevronRight size={11} />{crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : crumb.label}</span>)}</nav><div className="px-title-row"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="px-title-actions">{actions}</div>}</div></div>;
}

const statusTone: Record<string, string> = {
  Active: 'good', Issued: 'good', Signed: 'good', Won: 'good', Closed: 'muted', Archived: 'muted', Expired: 'muted', Lost: 'muted',
  'Pending Cancel': 'warn', 'Pending Issue': 'warn', Referred: 'warn', Viewed: 'info', Sent: 'info', New: 'info', Contacted: 'info', Quoted: 'info',
  Cancelled: 'bad', Declined: 'bad', Quote: 'info', Application: 'info',
  'Past due': 'bad', Complete: 'good', Approved: 'good', Enrolled: 'info',
  'Claim Submitted': 'info', 'Adjuster Assigned': 'info', Inspection: 'warn', 'Estimate Approved': 'warn', 'Payment Issued': 'good',
  Paid: 'good', 'Partially paid': 'warn', Due: 'info', Overdue: 'bad', Upcoming: 'muted', Excluded: 'bad', Scheduled: 'info', Default: 'good',
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={`px-badge ${statusTone[status] ?? 'info'}`}>{status}</span>;
}

export function Modal({ title, onClose, children, footer, wide = false }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <div className="px-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`px-modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button></header><div className="px-modal-body">{children}</div>{footer && <footer>{footer}</footer>}</div></div>;
}

export function Field({ label, required, children, hint, className = '' }: { label: string; required?: boolean; children: ReactNode; hint?: string; className?: string }) {
  return <label className={`px-field ${className}`}><span>{required && <em>*</em>}{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function Tabs<T extends string>({ tabs, active, onChange }: { tabs: readonly T[]; active: T; onChange: (tab: T) => void }) {
  return <div className="px-tabs" role="tablist">{tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={tab === active} className={tab === active ? 'active' : ''} onClick={() => onChange(tab)}>{tab}</button>)}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-empty">{children}</div>;
}

export function Toasts() {
  const { toasts, dismissToast } = usePortal();
  return <div className="px-toasts" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className={`px-toast ${toast.tone}`}>{toast.tone === 'error' ? <CircleAlert size={16} /> : toast.tone === 'info' ? <Info size={16} /> : <CheckCircle2 size={16} />}<span>{toast.text}</span><button type="button" onClick={() => dismissToast(toast.id)} aria-label="Dismiss"><X size={14} /></button></div>)}</div>;
}

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) close(); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, close]);
  return ref;
}

export function ProfileMenu({ variant = 'portal' }: { variant?: 'portal' | 'quote' }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<'profile' | 'preferences' | null>(null);
  const navigate = useNavigate();
  const { resetDemo, notify } = usePortal();
  const ref = useOutsideClose(open, () => setOpen(false));
  return <div className="px-profile-wrap" ref={ref}>
    {variant === 'portal'
      ? <button className="profile" type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}><span>{AGENT.sortName}</span><ChevronDown size={13} /><small>{AGENT.state}</small></button>
      : <button type="button" className="quote-profile" onClick={() => setOpen((v) => !v)} aria-expanded={open}>{AGENT.name} <ChevronDown size={13} /></button>}
    {open && <div className="px-dropdown" role="menu">
      <div className="px-dropdown-head"><strong>{AGENT.name}</strong><small>{AGENT.agency}</small></div>
      <button type="button" onClick={() => { setModal('profile'); setOpen(false); }}><User size={14} /> My profile &amp; agency</button>
      <button type="button" onClick={() => { setModal('preferences'); setOpen(false); }}><Settings size={14} /> Preferences</button>
      <button type="button" onClick={() => { notify(`State context: ${AGENT.state}. You are appointed in WI only.`, 'info'); setOpen(false); }}><MapPin size={14} /> Switch state ({AGENT.stateCode})</button>
      <button type="button" onClick={() => { resetDemo(); notify('Demo data reset to the original sample book.', 'info'); setOpen(false); }}><RotateCcw size={14} /> Reset demo data</button>
      <button type="button" onClick={() => navigate('/login')}><LogOut size={14} /> Sign out</button>
    </div>}
    {modal === 'profile' && <Modal title="My profile & agency" onClose={() => setModal(null)}><dl className="px-dl"><dt>Agent</dt><dd>{AGENT.name}</dd><dt>Agency</dt><dd>{AGENT.agency}</dd><dt>Agent numbers</dt><dd>{AGENT.agentNumbers.join(', ')}</dd><dt>Licensed state</dt><dd>{AGENT.state}</dd><dt>Branch</dt><dd>{AGENT.districtOffice}</dd><dt>Phone</dt><dd>{AGENT.phone}</dd><dt>Email</dt><dd>{AGENT.email}</dd><dt>Address</dt><dd>{AGENT.address}</dd></dl></Modal>}
    {modal === 'preferences' && <PreferencesModal onClose={() => setModal(null)} />}
  </div>;
}

const PREFS_KEY = 'erie-agentexchange-preferences';

function PreferencesModal({ onClose }: { onClose: () => void }) {
  const { notify } = usePortal();
  const [prefs, setPrefs] = useState(() => { const fallback = { email: true, leads: true, claims: true, landing: 'Dashboard' }; try { return { ...fallback, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') }; } catch { return fallback; } });
  return <Modal title="Preferences" onClose={onClose} footer={<><button type="button" className="px-btn ghost" onClick={onClose}>Cancel</button><button type="button" className="px-btn" onClick={() => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ } notify('Preferences saved.'); onClose(); }}>Save</button></>}>
    <div className="px-checks">
      <label><input type="checkbox" checked={prefs.email} onChange={(e) => setPrefs({ ...prefs, email: e.target.checked })} /> Email me when an eSignature is completed</label>
      <label><input type="checkbox" checked={prefs.leads} onChange={(e) => setPrefs({ ...prefs, leads: e.target.checked })} /> Alert me on new online leads</label>
      <label><input type="checkbox" checked={prefs.claims} onChange={(e) => setPrefs({ ...prefs, claims: e.target.checked })} /> Notify me of claim status changes</label>
    </div>
    <Field label="Landing page"><select value={prefs.landing} onChange={(e) => setPrefs({ ...prefs, landing: e.target.value })}><option>Dashboard</option><option>Quotes</option><option>Claims Center</option></select></Field>
  </Modal>;
}

export function HelpDrawer({ onClose, topic = 'quoting' }: { onClose: () => void; topic?: 'quoting' | 'general' }) {
  return <div className="px-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="px-drawer" aria-label="Help"><header><h2>Help</h2><button type="button" onClick={onClose} aria-label="Close help"><X size={18} /></button></header>
    <div className="px-drawer-body">
      {topic === 'quoting' ? <>
        <h3>Personal lines quote flow</h3>
        <ol><li><strong>Prospect</strong> — legal name, mailing address and date of birth enable prefill.</li><li><strong>Products</strong> — select products and the agent number for each.</li><li><strong>Underwriting</strong> — eligibility questions; “Yes” answers can refer the quote.</li><li><strong>Drivers &amp; vehicles / Property</strong> — confirm prefill and add details.</li><li><strong>Coverages</strong> — limits, deductibles and endorsements like ERIE Auto Plus®.</li><li><strong>Quote summary</strong> — premium, discounts and payment plan.</li><li><strong>Application &amp; bind</strong> — signatures, prior insurance, issue.</li></ol>
      </> : <p>Use the navigation menus to reach products, billing, claims and tools.</p>}
      <h3>Need a person?</h3>
      <p>Agency Support Desk: (800) 555-0199<br />Underwriting: <Link to="/contacts?q=underwriting" onClick={onClose}>LAVA Contacts</Link><br />Claims (24/7): (800) 367-3743</p>
    </div></aside></div>;
}
