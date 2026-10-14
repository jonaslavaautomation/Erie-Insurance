import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Home, Search } from 'lucide-react';
import { navMenus } from '@/data/content';
import { ProfileMenu } from '@/components/ui';
import { useWorkItems } from '@/data/workqueue';
import '@/portal.css';

function WorkBell() {
  const { items } = useWorkItems();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const high = items.filter((i) => i.priority === 'high').length;
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  return <div className="work-bell" ref={ref}>
    <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={`Work queue: ${items.length} open items`}><Bell size={19} />{items.length > 0 && <span className={high ? 'hot' : ''}>{items.length > 99 ? '99+' : items.length}</span>}</button>
    {open && <div className="px-dropdown wide" role="menu">
      <div className="px-dropdown-head"><strong>Work queue</strong><small>{items.length} open · {high} high priority</small></div>
      {items.slice(0, 6).map((i) => <Link key={i.id} to={i.to} className={`bell-item ${i.priority}`} onClick={() => setOpen(false)}><em>{i.kind}</em><span>{i.title}</span></Link>)}
      {items.length === 0 && <p className="px-muted bell-empty">You’re all caught up.</p>}
      <Link to="/work-queue" className="bell-all" onClick={() => setOpen(false)}>View all work items →</Link>
    </div>}
  </div>;
}

export default function PortalLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => { setOpenMenu(null); window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (event: MouseEvent) => { if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenMenu(null); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpenMenu(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [openMenu]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  const menu = navMenus.find((item) => item.label === openMenu);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand" aria-label="Erie Insurance AgentExchange home">
            <img className="brand-logo" src="/favicon-192.png" alt="" />
            <div className="brand-copy"><strong>LAVA</strong><small>Insurance</small></div>
            <div className="exchange"><span>Agent</span>Exchange</div>
          </Link>
          <form className="global-search" onSubmit={handleSearch} role="search">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers, policies, claims, forms" aria-label="Search for forms and content" />
            <button type="submit" aria-label="Search"><Search size={17} strokeWidth={2.5} /></button>
          </form>
          <WorkBell />
          <ProfileMenu />
        </div>
      </header>

      <nav className="main-nav" aria-label="Primary navigation" ref={navRef}>
        <div className="nav-inner">
          <Link to="/" className={`home-button ${location.pathname === '/' ? 'current' : ''}`} aria-label="Home"><Home size={24} strokeWidth={1.7} /></Link>
          {navMenus.map((item) => (
            <button className={`nav-item ${openMenu === item.label ? 'open' : ''}`} key={item.label} type="button" aria-expanded={openMenu === item.label} onClick={() => setOpenMenu((current) => (current === item.label ? null : item.label))}>{item.label}<ChevronDown size={11} /></button>
          ))}
        </div>
        {menu && <div className="mega-menu" role="menu"><div className="mega-inner">{menu.columns.map((column) => <div key={column.heading} className="mega-col"><h3>{column.heading}</h3>{column.links.map((link) => <Link key={link.label} to={link.to} role="menuitem" onClick={() => setOpenMenu(null)}>{link.label}</Link>)}</div>)}</div></div>}
      </nav>

      {children}

      <footer className="px-footer">
        <div className="px-footer-inner">
          <span>AgentExchange demo portal · sample data only — not connected to any insurance carrier</span>
          <nav><Link to="/contacts">LAVA Contacts</Link><Link to="/resources/about-erie">About LAVA</Link><Link to="/resources/forms-on-demand">Forms</Link><Link to="/resources/claims-guide">Claims guide</Link></nav>
        </div>
      </footer>
    </div>
  );
}
