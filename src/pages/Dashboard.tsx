import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Search } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { linkTargets, newsItems, productGuides } from '@/data/content';
import { usePortal } from '@/data/store';

type Tab = 'PERSONAL' | 'COMMERCIAL' | 'LIFE';
type Tone = 'teal' | 'blue' | 'navy';

const tabs: Tab[] = ['PERSONAL', 'COMMERCIAL', 'LIFE'];

const links = {
  quotes: ['See entire list of quotes/apps', 'DSpro Web Resources', 'Manage templates'],
  personal: ['American Bankers for Flood Insurance', 'eSignature Dashboard', 'eSignature Resource Page'],
  leads: ['New Online Leads Dashboard', 'Online Leads Dashboard', 'Online Leads Help Center & FAQs'],
};

const reportOptions = [
  { id: 'performance', label: 'ERIE Performance Report' },
  { id: 'production', label: 'Sales production report' },
  { id: 'book', label: 'Book of business report' },
  { id: 'retention', label: 'Retention & renewals report' },
  { id: 'loss-ratio', label: 'Loss ratio report' },
];

type CustomerName = { firstName: string; middleName: string; lastName: string };
const emptyName: CustomerName = { firstName: '', middleName: '', lastName: '' };

export default function Dashboard() {
  const navigate = useNavigate();
  const [newsIndex, setNewsIndex] = useState(0);
  const [quoteTab, setQuoteTab] = useState<Tab>('PERSONAL');
  const [productTab, setProductTab] = useState<Tab>('PERSONAL');
  const [newsTab, setNewsTab] = useState<'ERIE NEWS' | 'ERIE PUBLICATIONS'>('ERIE NEWS');
  const [quoteName, setQuoteName] = useState<CustomerName>(emptyName);
  const [customerName, setCustomerName] = useState<CustomerName>(emptyName);

  const slides = useMemo(() => newsItems.filter((item) => Boolean(item.publication) === (newsTab === 'ERIE PUBLICATIONS')), [newsTab]);
  const activeNews = slides[newsIndex % slides.length];

  const startQuote = () => {
    if (quoteTab === 'COMMERCIAL') return navigate(`/commercial/quote?first=${encodeURIComponent(quoteName.firstName)}&last=${encodeURIComponent(quoteName.lastName)}`);
    const params = new URLSearchParams({ firstName: quoteName.firstName, middleName: quoteName.middleName, lastName: quoteName.lastName });
    if (quoteTab === 'LIFE') params.set('product', 'life');
    navigate(`/quotes/search-results?${params.toString()}`);
  };

  const changeSlide = (direction: number) => setNewsIndex((current) => (current + direction + slides.length) % slides.length);

  return (
    <PortalLayout>
      <main className="dashboard">
        <div className="dashboard-grid">
          <QuoteCard activeTab={quoteTab} onTabChange={setQuoteTab} name={quoteName} onNameChange={setQuoteName} onStart={startQuote} />
          <CustomerCard name={customerName} onNameChange={setCustomerName} />
          <ProductHelpCard activeTab={productTab} onTabChange={setProductTab} />
          <NewsCard activeTab={newsTab} onTabChange={(tab) => { setNewsTab(tab); setNewsIndex(0); }} slides={slides} news={activeNews} index={newsIndex % slides.length} onSlide={changeSlide} />
          <QuickToolsCard />
          <BillingCard />
          <ContestsCard />
          <ReportsCard />
          <ContactsCard />
          <TaskForceCard />
        </div>
      </main>
    </PortalLayout>
  );
}

function Card({ title, tone = 'blue', children, className = '', to }: { title: string; tone?: Tone; children: React.ReactNode; className?: string; to?: string }) {
  return <section className={`portal-card ${className}`}><div className={`card-heading ${tone}`}>{to ? <Link to={to}>{title}</Link> : title}</div><div className="card-body">{children}</div></section>;
}

function CardTabs<T extends string>({ activeTab, onTabChange, items }: { activeTab: T; onTabChange: (tab: T) => void; items?: T[] }) {
  const tabItems = items ?? (tabs as unknown as T[]);
  return <div className="card-tabs">{tabItems.map((tab) => <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => onTabChange(tab)} type="button">{tab}</button>)}</div>;
}

function NameFields({ labels = ['First*', 'MI', 'Last*'], value, onChange }: { labels?: string[]; value: CustomerName; onChange: (name: CustomerName) => void }) {
  const fields: Array<keyof CustomerName> = ['firstName', 'middleName', 'lastName'];
  return <div className="name-fields">{labels.map((label, index) => <input key={label} placeholder={label} aria-label={label} value={value[fields[index]]} onChange={(event) => onChange({ ...value, [fields[index]]: event.target.value })} />)}</div>;
}

function LinkList({ items }: { items: (string | { label: string; to: string })[] }) {
  return <div className="link-list">{items.map((item) => {
    const label = typeof item === 'string' ? item : item.label;
    const to = typeof item === 'string' ? linkTargets[item] ?? `/search?q=${encodeURIComponent(item)}` : item.to;
    return <Link to={to} key={label}>{label}</Link>;
  })}</div>;
}

function MoreLinks({ items }: { items: { label: string; to: string }[] }) {
  const [open, setOpen] = useState(false);
  return <>
    {open && <div className="more-links"><LinkList items={items} /></div>}
    <button type="button" className="footer-chevron" aria-expanded={open} aria-label={open ? 'Show fewer links' : 'Show more links'} onClick={() => setOpen((v) => !v)}><ChevronDown size={18} className={open ? 'flipped' : ''} /></button>
  </>;
}

function QuoteCard({ activeTab, onTabChange, name, onNameChange, onStart }: { activeTab: Tab; onTabChange: (tab: Tab) => void; name: CustomerName; onNameChange: (name: CustomerName) => void; onStart: () => void }) {
  const helper = activeTab === 'COMMERCIAL' ? 'Start an ErieSecure Business® quote' : activeTab === 'LIFE' ? 'Start an ERIExpress Life quote or search apps' : 'Start or search existing quotes or apps';
  return <Card title="QUOTES & APPS" tone="teal" className="quote-card" to="/quotes"><CardTabs activeTab={activeTab} onTabChange={onTabChange} /><form onSubmit={(event) => { event.preventDefault(); onStart(); }}><label className="field-label">{activeTab === 'COMMERCIAL' ? 'Business owner name' : 'Name'}</label><NameFields value={name} onChange={onNameChange} /><div className="helper">{helper}</div><button className="primary-button align-right" type="submit">START</button></form><LinkList items={links.quotes} /><div className="subheading">Personal Lines quoting links...</div><LinkList items={links.personal} /><div className="spaced-links"><LinkList items={links.leads} /></div><MoreLinks items={[{ label: 'Quote templates', to: '/quotes/templates' }, { label: 'Archived quotes', to: '/quotes?status=Archived' }, { label: 'Referred to underwriting', to: '/quotes?status=Referred' }]} /></Card>;
}

function CustomerCard({ name, onNameChange }: { name: CustomerName; onNameChange: (name: CustomerName) => void }) {
  const navigate = useNavigate();
  const [by, setBy] = useState<'name' | 'policy' | 'claim'>('name');
  const [number, setNumber] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (by === 'name') {
      if (!name.firstName.trim() && !name.lastName.trim()) return setError('Enter a first or last name.');
      return navigate(`/customers?by=name&first=${encodeURIComponent(name.firstName)}&last=${encodeURIComponent(name.lastName)}`);
    }
    if (!number.trim()) return setError(`Enter a ${by} number.`);
    navigate(by === 'policy' ? `/customers?by=policy&q=${encodeURIComponent(number.trim())}` : `/claims?q=${encodeURIComponent(number.trim())}`);
  };
  return <Card title="CUSTOMER SERVICE / CLAIMS" to="/customers"><form onSubmit={(event) => { event.preventDefault(); setError(''); submit(); }}><label className="field-label">Search by</label><select value={by} onChange={(event) => { setBy(event.target.value as typeof by); setError(''); }}><option value="name">Name (insured, driver, etc.)</option><option value="policy">Policy number</option><option value="claim">Claim number</option></select><div className="customer-search-row">{by === 'name' ? <NameFields value={name} onChange={onNameChange} /> : <input value={number} onChange={(event) => setNumber(event.target.value)} placeholder={by === 'policy' ? 'e.g. A05-2817734' : 'e.g. CLM-26-0048213'} aria-label={`${by} number`} />}</div>{error && <div className="card-error">{error}</div>}<button className="primary-button align-right" type="submit">SEARCH</button></form><div className="card-section-label resource-label">RESOURCES</div><LinkList items={[{ label: 'Report a claim', to: '/claims/new' }, { label: 'Claims Center', to: '/claims' }, { label: 'Direct Repair Program', to: '/resources/direct-repair-program' }]} /><MoreLinks items={[{ label: 'Browse all customers', to: '/customers' }, { label: 'Catastrophe response', to: '/resources/catastrophe-response' }, { label: 'Claims handling guide', to: '/resources/claims-guide' }]} /></Card>;
}

function ProductHelpCard({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void }) {
  const navigate = useNavigate();
  const options = productGuides.filter((p) => p.line === activeTab);
  const [selected, setSelected] = useState<Record<Tab, string>>({ PERSONAL: 'auto', COMMERCIAL: 'eriesecure-business', LIFE: 'eriexpress-life' });
  const slug = selected[activeTab];
  return <Card title="QUICK PRODUCT HELP" className="product-help-card"><CardTabs activeTab={activeTab} onTabChange={onTabChange} /><label className="muted-label">Select a product</label><form className="select-action" onSubmit={(event) => { event.preventDefault(); navigate(`/products/${slug}`); }}><select value={slug} onChange={(event) => setSelected({ ...selected, [activeTab]: event.target.value })} aria-label="Select a product">{options.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select><button aria-label="Open product help" type="submit"><ChevronRight size={22} /></button></form><div className="card-section-label">PRODUCT LINKS</div><LinkList items={[{ label: 'Underwriting Guidelines', to: `/products/${slug}#eligibility` }, { label: 'Rules Manual', to: '/resources/rules-manual' }, { label: 'Named Insured Status Domestic', to: '/resources/named-insured-domestic' }]} /><MoreLinks items={[{ label: 'All underwriting guidelines', to: '/resources/underwriting-guidelines' }, { label: 'ERIEbooks manuals', to: '/resources/eriebooks' }]} /></Card>;
}

function NewsCard({ activeTab, onTabChange, slides, news, index, onSlide }: { activeTab: 'ERIE NEWS' | 'ERIE PUBLICATIONS'; onTabChange: (tab: 'ERIE NEWS' | 'ERIE PUBLICATIONS') => void; slides: typeof newsItems; news: typeof newsItems[number]; index: number; onSlide: (direction: number) => void }) {
  const newsTabs: ('ERIE NEWS' | 'ERIE PUBLICATIONS')[] = ['ERIE NEWS', 'ERIE PUBLICATIONS'];
  return <Card title="NEWS FEED" tone="navy" className="news-card" to="/news"><CardTabs activeTab={activeTab} onTabChange={onTabChange} items={newsTabs} /><div className="news-hero"><button onClick={() => onSlide(-1)} aria-label="Previous story" type="button"><ArrowLeft size={25} /></button><Link to={`/news/${news.id}`} className="news-badge">{news.badge.split('\n').map((line) => <span key={line}>{line}</span>)}</Link><button onClick={() => onSlide(1)} aria-label="Next story" type="button"><ArrowRight size={25} /></button></div><div className="news-copy"><h2><Link to={`/news/${news.id}`}>{news.title}</Link></h2><p><strong>{news.date}</strong><br />{news.body} <Link to={`/news/${news.id}`}>Read the full story and FAQs.</Link></p></div><div className="news-bottom"><div className="dots">{slides.map((slide, dotIndex) => <button key={slide.id} type="button" className={dotIndex === index ? 'active' : ''} onClick={() => onSlide(dotIndex - index)} aria-label={`Show story ${dotIndex + 1}`} />)}</div><Link to={activeTab === 'ERIE PUBLICATIONS' ? '/news?type=publications' : '/news'}>News Archive</Link></div></Card>;
}

function QuickToolsCard() {
  return <Card title="QUICK TOOLS"><div className="card-section-label">FORMS &amp; MANUALS</div><LinkList items={['ERIEbooks', 'Forms on Demand']} /><div className="card-section-label">CALCULATORS</div><LinkList items={['Commercial Building Valuation', 'Home Cost Estimator']} /><div className="card-section-label">RESOURCES</div><LinkList items={['Learning Management System | Guide', 'Certificates of Insurance']} /><MoreLinks items={[{ label: 'DSpro Web Resources', to: '/resources/dspro' }, { label: 'Marketing materials', to: '/resources/marketing-materials' }]} /></Card>;
}

function BillingCard() {
  return <Card title="BILLING & PAYMENTS" tone="teal" to="/billing"><div className="card-section-label">MAKE A PAYMENT</div><LinkList items={['One-time payment service', 'Payment Center']} /><div className="card-section-label">FORMS</div><LinkList items={['Account Billing Request Form (AF-60)']} /><div className="card-section-label">RESOURCES</div><LinkList items={['Payment center Resources', 'ERIEpay Resources', 'Billing Resources (Commercial lines)']} /><MoreLinks items={[{ label: 'AutoPay enrollment', to: '/billing/autopay' }, { label: 'Past-due accounts', to: '/billing?filter=pastdue' }]} /></Card>;
}

function ContestsCard() {
  return <Card title="CONTESTS & INCENTIVES" to="/contests"><Link to="/contests" className="contest-art"><span>abm</span><small>Agent Business Momentum</small><em>View your standings →</em></Link></Card>;
}

function ReportsCard() {
  const navigate = useNavigate();
  const [report, setReport] = useState('performance');
  return <Card title="REPORTS" to="/reports/performance"><label className="muted-label">Select a report</label><form className="select-action" onSubmit={(event) => { event.preventDefault(); navigate(`/reports/${report}`); }}><select value={report} onChange={(event) => setReport(event.target.value)} aria-label="Select a report">{reportOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><button aria-label="Open report" type="submit"><ChevronRight size={22} /></button></form><DashboardSnapshot /></Card>;
}

function DashboardSnapshot() {
  const { policies, claims, quotes } = usePortal();
  const active = policies.filter((p) => p.status === 'Active').length;
  const openClaims = claims.filter((c) => c.status !== 'Closed').length;
  const openQuotes = quotes.filter((q) => q.status === 'Quote' || q.status === 'Referred').length;
  return <div className="snapshot"><Link to="/reports/book"><strong>{active}</strong><span>Active policies</span></Link><Link to="/claims?status=open"><strong>{openClaims}</strong><span>Open claims</span></Link><Link to="/quotes"><strong>{openQuotes}</strong><span>Open quotes</span></Link></div>;
}

function ContactsCard() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  return <Card title="ERIE CONTACTS" to="/contacts"><label className="muted-label">Search the phone directory</label><form className="icon-input" onSubmit={(event) => { event.preventDefault(); navigate(`/contacts?q=${encodeURIComponent(query)}`); }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, title, or department" aria-label="Search contacts" /><button type="submit" aria-label="Search directory"><Search size={17} /></button></form><div className="quick-numbers"><span>Claims 24/7 <a href="tel:18003673743">(800) 367-3743</a></span><span>Customer Care <a href="tel:18004580811">(800) 458-0811</a></span></div></Card>;
}

function TaskForceCard() {
  return <Card title="TASK FORCE" tone="teal" to="/resources/task-force"><LinkList items={['What is Task Force', 'Message from the Moderator (4/21/26)', 'Top Priorities (4/21/26)']} /></Card>;
}
