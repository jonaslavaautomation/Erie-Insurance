import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, CircleHelp } from 'lucide-react';
import { HelpDrawer, ProfileMenu } from '@/components/ui';
import { usePortal } from '@/data/store';
import type { SyncStatus } from '@/lib/quoteSync';
import type { ProductKey, Quote } from '@/data/types';
import '@/portal.css';
import '@/quote-page.css';

const syncText: Record<SyncStatus, string> = { offline: 'Saved in this browser only', connecting: 'Connecting to Supabase…', saving: 'Saving to Supabase…', saved: 'Saved to Supabase', error: 'Supabase unreachable — saved in this browser', setup: 'Supabase: run the updated setup.sql to share insureds' };

const productName: Record<ProductKey, string> = { auto: 'Auto', home: 'Home', umbrella: 'Umbrella', boat: 'Boat', life: 'ERIExpress Life', commercial: 'Commercial' };

/** Quoting header. With a quote, shows the "Products (N)" menu in place of the Templates link. */
export default function QuoteHeader({ quote }: { quote?: Quote }) {
  const navigate = useNavigate();
  const [help, setHelp] = useState(false);
  const [open, setOpen] = useState(false);
  const { syncStatus, syncError, lastSynced } = usePortal();
  return <header className="quote-topbar">
    <button className="quote-brand" onClick={() => navigate('/')} type="button" aria-label="Back to dashboard">
      <img className="quote-brand-logo" src="/favicon-192.png" alt="" /><span className="quote-brand-name">LAVA<small>Insurance</small></span>
    </button>
    <div className="quote-header-actions">
      <span className={`sync-status ${syncStatus}`} role="status" title={syncStatus === 'error' ? syncError : lastSynced ? `Last saved ${new Date(`${lastSynced}Z`).toLocaleTimeString()}` : undefined}><i />{syncText[syncStatus]}</span>
      {quote ? <div className="products-menu">
        <button type="button" className="templates-link plain" aria-expanded={open} onClick={() => setOpen((v) => !v)} onBlur={() => window.setTimeout(() => setOpen(false), 150)}>Products ({quote.products.length}) <ChevronDown size={14} /></button>
        {open && <div className="products-menu-list" role="menu">{quote.products.map((p) => <div key={p} role="menuitem"><strong>{productName[p]}</strong><span>{quote.numbers?.[p] ?? quote.id}</span><small>{quote.agentNumbers[p] ?? ''}</small></div>)}</div>}
      </div> : <>
        <button type="button" className="templates-link" onClick={() => navigate('/quotes/templates')}>Templates</button>
        <button type="button" className="templates-link" onClick={() => navigate('/quotes')}>My Quotes</button>
      </>}
      <ProfileMenu variant="quote" />
      <button type="button" className="help-button" aria-label="Help" onClick={() => setHelp(true)}><CircleHelp size={22} fill="#003b70" color="white" /></button>
    </div>
    {help && <HelpDrawer onClose={() => setHelp(false)} />}
  </header>;
}
