import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileText, Mail, Phone, Search, Trophy } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { Empty, Field, Modal, PageTitle, Panel } from '@/components/ui';
import { contacts, formsLibrary, newsItems, productGuides, resourcePages } from '@/data/content';
import type { ResourceWidget } from '@/data/content';
import { fullName, usePortal } from '@/data/store';
import { AGENT } from '@/data/seed';
import { money } from '@/lib/rating';
import { Af60Widget, BuildingValuation, CertificatesWidget, ESignatureWidget, EriebooksWidget, FormsWidget, HomeCostEstimator, LeadsWidget, LmsWidget, MarketingWidget } from '@/pages/ResourceWidgets';
import '@/portal.css';

const widgets: Record<ResourceWidget, () => ReactNode> = {
  'home-cost': () => <HomeCostEstimator />, 'building-valuation': () => <BuildingValuation />, certificates: () => <CertificatesWidget />, esignature: () => <ESignatureWidget />, leads: () => <LeadsWidget />, forms: () => <FormsWidget />, eriebooks: () => <EriebooksWidget />, lms: () => <LmsWidget />, marketing: () => <MarketingWidget />, af60: () => <Af60Widget />, none: () => null,
};

export function ResourcePage() {
  const { slug = '' } = useParams();
  const page = resourcePages.find((p) => p.slug === slug);
  if (!page) return <NotFoundPage />;
  const related = resourcePages.filter((p) => p.category === page.category && p.slug !== page.slug).slice(0, 5);
  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: page.category }, { label: page.title }]} title={page.title} subtitle={page.summary} />
    <div className="px-cols">
      <div className="px-main-col">
        {page.widget && widgets[page.widget]()}
        {page.sections.map((section) => <Panel key={section.heading} title={section.heading}>{section.body && <p className="px-body">{section.body}</p>}{section.bullets && <ul className="px-bullets">{section.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}{section.links && <div className="px-link-grid">{section.links.map((l) => <Link key={l.label} to={l.to}>{l.label} <ArrowRight size={13} /></Link>)}</div>}</Panel>)}
      </div>
      <div className="px-side-col">
        {related.length > 0 && <Panel title={`More in ${page.category}`}><ul className="px-list">{related.map((r) => <li key={r.slug}><Link to={`/resources/${r.slug}`}>{r.title}</Link></li>)}</ul></Panel>}
        <Panel title="Need help?"><p className="px-body">Agency Support Desk<br /><a href="tel:18005550199">(800) 555-0199</a></p><Link to="/contacts">ERIE Contacts directory</Link></Panel>
      </div>
    </div>
  </main></PortalLayout>;
}

export function ProductGuidePage() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const { notify } = usePortal();
  const product = productGuides.find((p) => p.slug === slug);
  const [requestOpen, setRequestOpen] = useState(params.get('start') === '1');
  const [req, setReq] = useState({ business: '', owner: '', industry: 'Retail', revenue: '', employees: '', zip: '', phone: '' });
  const [reqError, setReqError] = useState('');
  useEffect(() => { if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }); }, [location.hash]);
  if (!product) return <NotFoundPage />;
  // ErieSecure Business and BOP quote in real time; other commercial lines go to underwriting as a request.
  const quoteLink = product.quoteProduct ? `/quotes/search-results${product.quoteProduct === 'life' ? '?product=life' : ''}` : product.slug === 'eriesecure-business' || product.slug === 'bop' ? '/commercial/quote' : null;
  const siblings = productGuides.filter((p) => p.line === product.line && p.slug !== product.slug);
  const submitRequest = () => {
    if (!req.business || !req.owner || !/^\d{5}$/.test(req.zip)) return setReqError('Business name, owner and a 5-digit ZIP are required.');
    setRequestOpen(false); setReqError('');
    notify(`Commercial quote request for ${req.business} sent to Brian Kessler, Commercial Lines Underwriter.`);
  };
  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: 'Products' }, { label: product.line === 'PERSONAL' ? 'Personal Lines' : product.line === 'COMMERCIAL' ? 'Commercial Lines' : 'Erie Family Life' }, { label: product.name }]} title={product.name} subtitle={product.tagline} actions={quoteLink ? <Link className="px-btn" to={quoteLink}>Start a quote</Link> : product.line === 'COMMERCIAL' ? <button type="button" className="px-btn" onClick={() => setRequestOpen(true)}>Request a commercial quote</button> : <Link className="px-btn" to="/contacts?q=life">Contact Life Underwriting</Link>} />
    <div className="px-cols">
      <div className="px-main-col">
        <Panel title="Standard coverages"><ul className="px-bullets check">{product.coverages.map((c) => <li key={c}>{c}</li>)}</ul></Panel>
        <Panel title="Optional coverages & endorsements"><ul className="px-bullets">{product.options.map((c) => <li key={c}>{c}</li>)}</ul></Panel>
        {product.discounts.length > 0 && <Panel title="Discounts"><div className="policy-pills">{product.discounts.map((d) => <span key={d} className="policy-pill">{d}</span>)}</div></Panel>}
        <div id="eligibility"><Panel title="Underwriting guidelines"><ul className="px-bullets">{product.eligibility.map((c) => <li key={c}>{c}</li>)}</ul><p className="px-muted">Risks outside these guidelines may be referred. Contact your underwriter through <Link to="/contacts?q=underwriting">ERIE Contacts</Link>.</p></Panel></div>
      </div>
      <div className="px-side-col">
        <Panel title="Product resources"><ul className="px-list"><li><Link to="/resources/rules-manual">Rules Manual</Link></li><li><Link to="/resources/underwriting-guidelines">All underwriting guidelines</Link></li><li><Link to={`/resources/forms-on-demand?q=${encodeURIComponent(product.line === 'LIFE' ? 'life' : product.slug === 'home' ? 'home' : product.slug === 'auto' ? 'auto' : '')}`}>Forms on Demand</Link></li><li><Link to="/resources/eriebooks">ERIEbooks manuals</Link></li>{product.slug === 'home' && <li><Link to="/resources/home-cost-estimator">Home Cost Estimator</Link></li>}{product.line === 'COMMERCIAL' && <li><Link to="/resources/building-valuation">Commercial Building Valuation</Link></li>}</ul></Panel>
        {siblings.length > 0 && <Panel title="Related products"><ul className="px-list">{siblings.map((s) => <li key={s.slug}><Link to={`/products/${s.slug}`}>{s.name}</Link></li>)}</ul></Panel>}
      </div>
    </div>
    {requestOpen && <Modal title={`${product.name} — quote request`} wide onClose={() => setRequestOpen(false)} footer={<><button type="button" className="px-btn ghost" onClick={() => setRequestOpen(false)}>Cancel</button><button type="button" className="px-btn" onClick={submitRequest}>Submit to underwriting</button></>}>
      <div className="px-grid3"><Field label="Business name" required><input value={req.business} onChange={(e) => setReq({ ...req, business: e.target.value })} /></Field><Field label="Owner" required><input value={req.owner} onChange={(e) => setReq({ ...req, owner: e.target.value })} /></Field><Field label="Industry"><select value={req.industry} onChange={(e) => setReq({ ...req, industry: e.target.value })}>{['Retail', 'Office / professional', 'Restaurant', 'Contractor', 'Wholesale', 'Manufacturing', 'Medical'].map((i) => <option key={i}>{i}</option>)}</select></Field><Field label="Annual revenue"><input type="number" value={req.revenue} onChange={(e) => setReq({ ...req, revenue: e.target.value })} /></Field><Field label="Employees"><input type="number" value={req.employees} onChange={(e) => setReq({ ...req, employees: e.target.value })} /></Field><Field label="Location ZIP" required><input value={req.zip} onChange={(e) => setReq({ ...req, zip: e.target.value.replace(/\D/g, '').slice(0, 5) })} /></Field><Field label="Contact phone"><input value={req.phone} onChange={(e) => setReq({ ...req, phone: e.target.value })} /></Field></div>
      {reqError && <div className="agent-error block">{reqError}</div>}
      <p className="px-muted">ErieSecure Business offers real-time quoting for eligible classes; other risks are reviewed by commercial underwriting, typically within one business day.</p>
    </Modal>}
  </main></PortalLayout>;
}

export function NewsArchivePage() {
  const [params, setParams] = useSearchParams();
  const pubs = params.get('type') === 'publications';
  const items = newsItems.filter((n) => Boolean(n.publication) === pubs);
  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: 'News' }]} title={pubs ? 'ERIE Publications' : 'News Archive'} actions={<div className="px-chips"><button type="button" className={!pubs ? 'on' : ''} onClick={() => setParams({})}>ERIE News</button><button type="button" className={pubs ? 'on' : ''} onClick={() => setParams({ type: 'publications' })}>Publications</button></div>} />
    <div className="news-list">{items.map((n) => <Link key={n.id} to={`/news/${n.id}`} className="news-item"><span className="news-badge small">{n.badge.split('\n').map((l) => <span key={l}>{l}</span>)}</span><div><strong>{n.title}</strong><small>{n.date}</small><p>{n.body}</p></div><ArrowRight size={16} /></Link>)}</div>
  </main></PortalLayout>;
}

export function NewsArticlePage() {
  const { id = '' } = useParams();
  const item = newsItems.find((n) => n.id === id);
  if (!item) return <NotFoundPage />;
  const idx = newsItems.indexOf(item);
  const nextItem = newsItems[(idx + 1) % newsItems.length];
  return <PortalLayout><main className="px-page narrow">
    <PageTitle crumbs={[{ label: 'News', to: item.publication ? '/news?type=publications' : '/news' }, { label: item.title }]} title={item.title} subtitle={item.date} />
    <Panel><p className="px-body lead">{item.body}</p><h3 className="section-h">Key points</h3><ul className="px-bullets">{item.detail.map((d) => <li key={d}>{d}</li>)}</ul><h3 className="section-h">FAQs</h3><ul className="px-bullets"><li><strong>When does this take effect?</strong> As noted above; questions can go to your sales manager.</li><li><strong>Where can I find more?</strong> <Link to="/resources/eriebooks">ERIEbooks</Link> and the <Link to="/resources/lms">Learning Management System</Link>.</li></ul></Panel>
    <div className="px-form-actions"><Link className="px-btn ghost" to="/news">All news</Link><Link className="px-btn" to={`/news/${nextItem.id}`}>Next: {nextItem.title}</Link></div>
  </main></PortalLayout>;
}

export function ContactsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [query, setQuery] = useState(q);
  const rows = contacts.filter((c) => `${c.name} ${c.title} ${c.department}`.toLowerCase().includes(q.toLowerCase()));
  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: 'ERIE Contacts' }]} title="ERIE Contacts" subtitle="Phone directory for underwriting, claims, billing and agency support." />
    <Panel><form className="px-toolbar" onSubmit={(e) => { e.preventDefault(); setParams(query ? { q: query } : {}); }}><input className="px-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, title, or department" aria-label="Search directory" /><button type="submit" className="px-btn"><Search size={14} /> Search</button>{q && <button type="button" className="link-button" onClick={() => { setQuery(''); setParams({}); }}>Clear</button>}</form>
      {rows.length === 0 ? <Empty>No contacts match “{q}”.</Empty> : <div className="contact-grid">{rows.map((c) => <div key={c.name} className="contact-card"><strong>{c.name}</strong><span>{c.title}</span><small>{c.department}</small><a href={`tel:${c.phone.replace(/\D/g, '').slice(0, 11)}`}><Phone size={13} /> {c.phone}</a><a href={`mailto:${c.email}`}><Mail size={13} /> {c.email}</a></div>)}</div>}
    </Panel>
  </main></PortalLayout>;
}

export function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const { customers, policies, claims, quotes } = usePortal();
  const t = q.toLowerCase();
  const hit = (s: string) => t.length > 0 && s.toLowerCase().includes(t);
  const groups: { title: string; items: { label: string; sub: string; to: string }[] }[] = [
    { title: 'Customers', items: customers.filter((c) => hit(fullName(c)) || hit(c.id)).map((c) => ({ label: fullName(c), sub: `${c.address}, ${c.city}`, to: `/customers/${c.id}` })) },
    { title: 'Policies', items: policies.filter((p) => hit(p.number) || hit(p.description)).map((p) => ({ label: `${p.type} ${p.number}`, sub: p.description, to: `/policies/${p.number}` })) },
    { title: 'Claims', items: claims.filter((c) => hit(c.number) || hit(c.lossType)).map((c) => ({ label: c.number, sub: `${c.lossType} · ${c.status}`, to: `/claims/${c.number}` })) },
    { title: 'Quotes', items: quotes.filter((x) => hit(x.id) || hit(fullName(x.applicant))).map((x) => ({ label: `${x.id} — ${fullName(x.applicant)}`, sub: x.status, to: x.status === 'Issued' ? `/quotes/${x.id}/issued` : `/quotes/${x.id}/${x.lastStep}` })) },
    { title: 'Products', items: productGuides.filter((p) => hit(p.name) || hit(p.tagline) || p.options.some(hit)).map((p) => ({ label: p.name, sub: p.tagline, to: `/products/${p.slug}` })) },
    { title: 'Forms', items: formsLibrary.filter((f) => hit(f.code) || hit(f.name)).map((f) => ({ label: `${f.code} — ${f.name}`, sub: `${f.line} · ${f.states}`, to: `/resources/forms-on-demand?q=${encodeURIComponent(f.code)}` })) },
    { title: 'Resources & tools', items: resourcePages.filter((r) => hit(r.title) || hit(r.summary)).map((r) => ({ label: r.title, sub: r.summary, to: `/resources/${r.slug}` })) },
    { title: 'News', items: newsItems.filter((n) => hit(n.title) || hit(n.body)).map((n) => ({ label: n.title, sub: n.date, to: `/news/${n.id}` })) },
    { title: 'Contacts', items: contacts.filter((c) => hit(c.name) || hit(c.department) || hit(c.title)).map((c) => ({ label: c.name, sub: `${c.title} · ${c.phone}`, to: `/contacts?q=${encodeURIComponent(c.name)}` })) },
  ].filter((g) => g.items.length > 0);
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: 'Search' }]} title={q ? `Results for “${q}”` : 'Search'} subtitle={q ? `${total} result${total === 1 ? '' : 's'}` : 'Search customers, policies, claims, quotes, forms and content from the bar above.'} />
    {q && total === 0 && <Panel><Empty>Nothing matched. Try a last name, policy number (e.g. A05-2817734), claim number, or a form code like AF-60.</Empty></Panel>}
    {groups.map((g) => <Panel key={g.title} title={`${g.title} (${g.items.length})`}><ul className="search-results">{g.items.slice(0, 8).map((i) => <li key={i.to + i.label}><Link to={i.to}><FileText size={14} /><span><strong>{i.label}</strong><small>{i.sub}</small></span></Link></li>)}</ul></Panel>)}
  </main></PortalLayout>;
}

export function ContestsPage() {
  const { policies } = usePortal();
  const written = policies.filter((p) => p.quoteId).reduce((s, p) => s + p.premium, 0) + 96400;
  const tiers = [{ name: 'Bronze', goal: 75000 }, { name: 'Silver', goal: 125000 }, { name: 'Gold', goal: 200000 }, { name: 'Platinum', goal: 300000 }];
  const next = tiers.find((t) => written < t.goal);
  const board = [{ agency: 'Lakeshore Insurance Group', premium: 241800 }, { agency: 'Badger State Agency', premium: 198300 }, { agency: AGENT.agency, premium: written }, { agency: 'Prairie Ridge Insurance', premium: 88700 }, { agency: 'Capitol Square Insurance', premium: 76100 }].sort((a, b) => b.premium - a.premium);
  return <PortalLayout><main className="px-page">
    <PageTitle crumbs={[{ label: 'Contests & Incentives' }]} title="Agent Business Momentum (ABM)" subtitle="2026 contest year · new business written premium, personal and commercial lines." />
    <div className="px-cols">
      <div className="px-main-col">
        <Panel title="Your progress"><div className="tier-track">{tiers.map((t) => <div key={t.name} className={written >= t.goal ? 'hit' : ''}><Trophy size={16} /><strong>{t.name}</strong><small>{money(t.goal)}</small></div>)}</div><div className="meter big"><div className="meter-track"><div className="meter-fill" style={{ width: `${Math.min(100, (written / tiers[3].goal) * 100)}%` }} /></div></div><p className="px-body">{money(written)} written YTD. {next ? <>You are <strong>{money(next.goal - written)}</strong> from {next.name}.</> : 'Top tier reached!'} <Link to="/quotes/search-results">Start a quote</Link> to keep momentum.</p></Panel>
        <Panel title="Wisconsin leaderboard"><table className="px-table"><thead><tr><th>Rank</th><th>Agency</th><th>Written premium</th></tr></thead><tbody>{board.map((b, i) => <tr key={b.agency} className={b.agency === AGENT.agency ? 'highlight' : ''}><td>{i + 1}</td><td>{b.agency}</td><td>{money(b.premium)}</td></tr>)}</tbody></table></Panel>
      </div>
      <div className="px-side-col"><Panel title="Rules"><ul className="px-bullets"><li>Counts new business issued 1/1–12/31/2026.</li><li>Life credit excludes Medicare Supplement issued on or after 9/1.</li><li>Rewards are paid in Q1 of the following year.</li></ul><Link to="/news/life-recognition-2026">Life Recognition Program updates</Link></Panel></div>
    </div>
  </main></PortalLayout>;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState('vbitanghol');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = (e: FormEvent) => { e.preventDefault(); if (!user || password.length < 4) return setError('Enter your user ID and password.'); navigate('/'); };
  return <div className="login-page"><form className="login-card" onSubmit={submit}><div className="brand"><div className="erie-mark"><span>⌂</span></div><div className="brand-copy"><strong>Erie</strong><small>Insurance</small></div><div className="exchange"><span>Agent</span>Exchange</div></div><h1>Sign in</h1><p className="px-muted"><CheckCircle2 size={13} /> You have been signed out.</p><Field label="User ID"><input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" /></Field><Field label="Password" hint="Demo portal — any 4+ characters"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></Field>{error && <div className="agent-error block">{error}</div>}<button type="submit" className="px-btn wide">Sign in</button></form></div>;
}

export function NotFoundPage() {
  return <PortalLayout><main className="px-page narrow"><PageTitle crumbs={[{ label: 'Not found' }]} title="Page not found" subtitle="The page you requested isn’t available." /><Panel><div className="px-link-grid"><Link to="/">Dashboard <ArrowRight size={13} /></Link><Link to="/quotes">Quotes <ArrowRight size={13} /></Link><Link to="/customers">Customers <ArrowRight size={13} /></Link><Link to="/claims">Claims <ArrowRight size={13} /></Link><Link to="/billing">Billing <ArrowRight size={13} /></Link></div></Panel></main></PortalLayout>;
}
