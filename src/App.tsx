import { FormEvent, useState } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Home,
  Search,
} from 'lucide-react';
import QuoteSearchPage from '@/QuoteSearchPage';
import ProductSelectionPage from '@/ProductSelectionPage';
import UnderwritingPage from '@/UnderwritingPage';

type Tab = 'PERSONAL' | 'COMMERCIAL' | 'LIFE';
type Tone = 'teal' | 'blue' | 'navy';

const tabs: Tab[] = ['PERSONAL', 'COMMERCIAL', 'LIFE'];

const links = {
  quotes: [
    'See entire list of quotes/apps',
    'DSpro Web Resources',
    'Manage templates',
  ],
  personal: [
    'American Bankers for Flood Insurance',
    'eSignature Dashboard',
    'eSignature Resource Page',
  ],
  leads: [
    'New Online Leads Dashboard',
    'Online Leads Dashboard',
    'Online Leads Help Center & FAQs',
  ],
};

const newsSlides = [
  {
    badge: 'Life\nNews',
    title: 'Erie Family Life Recognition Program Updates',
    date: '5/30/2026',
    body: 'Erie Family Life is updating its Life Recognition Program effective 6/1 with two new top-tier levels and providing additional recognition opportunities. Beginning 9/1, new Medicare Supplement business will no longer count toward program credit.',
  },
  {
    badge: 'Agent\nNews',
    title: 'New tools for a stronger customer experience',
    date: '5/22/2026',
    body: 'Explore the latest resources and field updates designed to help you connect customers with the right coverage, faster. Visit AgentExchange for helpful guides and support.',
  },
  {
    badge: 'Field\nFocus',
    title: 'Summer selling season resources are here',
    date: '5/14/2026',
    body: 'Find seasonal talking points, product reminders, and new training materials in the resource center. Use the quick links below to get started.',
  },
];

type CustomerName = {
  firstName: string;
  middleName: string;
  lastName: string;
};

function App() {
  return <BrowserRouter><Routes><Route path="/quotes/search-results" element={<QuoteSearchPage />} /><Route path="/quotes/select-products" element={<ProductSelectionPage />} /><Route path="/quotes/underwriting" element={<UnderwritingPage />} /><Route path="*" element={<Dashboard />} /></Routes></BrowserRouter>;
}

function Dashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [newsIndex, setNewsIndex] = useState(0);
  const [quoteTab, setQuoteTab] = useState<Tab>('PERSONAL');
  const [productTab, setProductTab] = useState<Tab>('PERSONAL');
  const [newsTab, setNewsTab] = useState<'ERIE NEWS' | 'ERIE PUBLICATIONS'>('ERIE NEWS');
  const [quoteName, setQuoteName] = useState<CustomerName>({ firstName: '', middleName: '', lastName: '' });
  const [customerName, setCustomerName] = useState<CustomerName>({ firstName: '', middleName: '', lastName: '' });

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(search.trim() ? `Searching for “${search.trim()}”` : 'Enter a search term to get started');
  };

  const openQuoteSearch = (name: CustomerName) => {
    const params = new URLSearchParams({ firstName: name.firstName, lastName: name.lastName });
    navigate(`/quotes/search-results?${params.toString()}`);
  };

  const changeSlide = (direction: number) => {
    setNewsIndex((current) => (current + direction + newsSlides.length) % newsSlides.length);
  };

  const activeNews = newsSlides[newsIndex];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand" aria-label="Erie Insurance AgentExchange">
            <div className="erie-mark"><span>⌂</span></div>
            <div className="brand-copy"><strong>Erie</strong><small>Insurance</small></div>
            <div className="exchange"><span>Agent</span>Exchange</div>
          </div>
          <form className="global-search" onSubmit={handleSearch}>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search for forms and content" aria-label="Search for forms and content" />
            <button type="submit" aria-label="Search"><Search size={17} strokeWidth={2.5} /></button>
          </form>
          <button className="profile" type="button">
            <span>Bitanghol, Vito</span><ChevronDown size={13} />
            <small>Wisconsin</small>
          </button>
        </div>
        {submitted && <div className="search-feedback">{submitted}</div>}
      </header>

      <nav className="main-nav" aria-label="Primary navigation">
        <div className="nav-inner">
          <button className="home-button" aria-label="Home"><Home size={24} strokeWidth={1.7} /></button>
          {['PRODUCTS', 'BILLING', 'CLAIMS', 'RESOURCES & TOOLS', 'EDUCATION', 'MARKETING', 'ABOUT ERIE'].map((item) => (
            <button className="nav-item" key={item} type="button">{item}<ChevronDown size={11} /></button>
          ))}
        </div>
      </nav>

      <main className="dashboard">
        <div className="dashboard-grid">
          <QuoteCard activeTab={quoteTab} onTabChange={setQuoteTab} name={quoteName} onNameChange={setQuoteName} onStart={() => openQuoteSearch(quoteName)} />
          <CustomerCard name={customerName} onNameChange={setCustomerName} onSearch={() => openQuoteSearch(customerName)} />
          <ProductHelpCard activeTab={productTab} onTabChange={setProductTab} />
          <NewsCard activeTab={newsTab} onTabChange={setNewsTab} news={activeNews} index={newsIndex} onSlide={changeSlide} />
          <QuickToolsCard />
          <BillingCard />
          <ContestsCard />
          <ReportsCard />
          <ContactsCard />
          <TaskForceCard />
        </div>
      </main>
    </div>
  );
}

function Card({ title, tone = 'blue', children, className = '' }: { title: string; tone?: Tone; children: React.ReactNode; className?: string }) {
  return <section className={`portal-card ${className}`}><div className={`card-heading ${tone}`}>{title}</div><div className="card-body">{children}</div></section>;
}

function CardTabs<T extends string>({ activeTab, onTabChange, items }: { activeTab: T; onTabChange: (tab: T) => void; items?: T[] }) {
  const tabItems = items ?? (tabs as unknown as T[]);
  return <div className="card-tabs">{tabItems.map((tab) => <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => onTabChange(tab)} type="button">{tab}</button>)}</div>;
}

function NameFields({ labels = ['First*', 'MI', 'Last*'], value, onChange }: { labels?: string[]; value?: CustomerName; onChange?: (name: CustomerName) => void }) {
  const fields: Array<keyof CustomerName> = ['firstName', 'middleName', 'lastName'];
  return <div className="name-fields">{labels.map((label, index) => <input key={label} placeholder={label} aria-label={label} value={value?.[fields[index]] ?? ''} onChange={(event) => onChange?.({ ...(value ?? { firstName: '', middleName: '', lastName: '' }), [fields[index]]: event.target.value })} />)}</div>;
}

function LinkList({ items }: { items: string[] }) {
  return <div className="link-list">{items.map((item) => <a href="#" key={item} onClick={(event) => event.preventDefault()}>{item}</a>)}</div>;
}

function FooterChevron() {
  return <div className="footer-chevron"><ChevronDown size={18} /></div>;
}

function QuoteCard({ activeTab, onTabChange, name, onNameChange, onStart }: { activeTab: Tab; onTabChange: (tab: Tab) => void; name: CustomerName; onNameChange: (name: CustomerName) => void; onStart: () => void }) {
  return <Card title="QUOTES & APPS" tone="teal" className="quote-card"><CardTabs activeTab={activeTab} onTabChange={onTabChange} /><form onSubmit={(event) => { event.preventDefault(); onStart(); }}><label className="field-label">Name</label><NameFields value={name} onChange={onNameChange} /><div className="helper">Start or search existing quotes or apps</div><button className="primary-button align-right" type="submit">START</button></form><LinkList items={links.quotes} /><div className="subheading">Personal Lines quoting links...</div><LinkList items={links.personal} /><div className="spaced-links"><LinkList items={links.leads} /></div><FooterChevron /></Card>;
}

function CustomerCard({ name, onNameChange, onSearch }: { name: CustomerName; onNameChange: (name: CustomerName) => void; onSearch: () => void }) {
  return <Card title="CUSTOMER SERVICE / CLAIMS"><form onSubmit={(event) => { event.preventDefault(); onSearch(); }}><label className="field-label">Search by</label><select defaultValue="Name (insured, driver, etc.)"><option>Name (insured, driver, etc.)</option><option>Policy number</option><option>Claim number</option></select><NameFields value={name} onChange={onNameChange} /><button className="primary-button align-right" type="submit">SEARCH</button></form><div className="card-section-label resource-label">RESOURCES</div><FooterChevron /></Card>;
}

function ProductHelpCard({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void }) {
  return <Card title="QUICK PRODUCT HELP"><CardTabs activeTab={activeTab} onTabChange={onTabChange} /><label className="muted-label">Select a product</label><div className="select-action"><select defaultValue="Private Passenger Auto"><option>Private Passenger Auto</option><option>Homeowners</option><option>Commercial Auto</option></select><button aria-label="Open product help" type="button"><ChevronRight size={22} /></button></div><div className="card-section-label">PRODUCT LINKS</div><LinkList items={['Underwriting Guidelines', 'Rules Manual', 'Named Insured Status Domestic']} /><FooterChevron /></Card>;
}

function NewsCard({ activeTab, onTabChange, news, index, onSlide }: { activeTab: 'ERIE NEWS' | 'ERIE PUBLICATIONS'; onTabChange: (tab: 'ERIE NEWS' | 'ERIE PUBLICATIONS') => void; news: typeof newsSlides[number]; index: number; onSlide: (direction: number) => void }) {
  const newsTabs = ['ERIE NEWS', 'ERIE PUBLICATIONS'] as const;
  return <Card title="NEWS FEED" tone="navy" className="news-card"><CardTabs activeTab={activeTab} onTabChange={onTabChange} items={newsTabs as unknown as ('ERIE NEWS' | 'ERIE PUBLICATIONS')[]} /><div className="news-hero"><button onClick={() => onSlide(-1)} aria-label="Previous story"><ArrowLeft size={25} /></button><div className="news-badge">{news.badge.split('\n').map((line) => <span key={line}>{line}</span>)}</div><button onClick={() => onSlide(1)} aria-label="Next story"><ArrowRight size={25} /></button></div><div className="news-copy"><h2>{news.title}</h2><p><strong>{news.date}</strong><br />{news.body} <a href="#" onClick={(event) => event.preventDefault()}>Visit AE.com for updated tier details and FAQs.</a></p></div><div className="news-bottom"><div className="dots">{newsSlides.map((slide, dotIndex) => <button key={slide.title} className={dotIndex === index ? 'active' : ''} onClick={() => onSlide(dotIndex - index)} aria-label={`Show story ${dotIndex + 1}`} />)}</div><a href="#" onClick={(event) => event.preventDefault()}>News Archive</a></div></Card>;
}

function QuickToolsCard() {
  return <Card title="QUICK TOOLS"><div className="card-section-label">FORMS &amp; MANUALS</div><LinkList items={['ERIEbooks', 'Forms on Demand']} /><div className="card-section-label">CALCULATORS</div><LinkList items={['Commercial Building Valuation', 'Home Cost Estimator']} /><div className="card-section-label">RESOURCES</div><LinkList items={['Learning Management System | Guide', 'Certificates of Insurance']} /><FooterChevron /></Card>;
}

function BillingCard() {
  return <Card title="BILLING & PAYMENTS" tone="teal"><div className="card-section-label">MAKE A PAYMENT</div><LinkList items={['One-time payment service', 'Payment Center']} /><div className="card-section-label">FORMS</div><LinkList items={['Account Billing Request Form (AF-60)']} /><div className="card-section-label">RESOURCES</div><LinkList items={['Payment center Resources', 'ERIEpay Resources', 'Billing Resources (Commercial lines)']} /><FooterChevron /></Card>;
}

function ContestsCard() {
  return <Card title="CONTESTS & INCENTIVES"><div className="contest-art"><span>abm</span><small>Agent Business Momentum</small></div></Card>;
}

function ReportsCard() {
  return <Card title="REPORTS"><label className="muted-label">Select a report</label><div className="select-action"><select defaultValue="ERIE Performance Rep..."><option>ERIE Performance Rep...</option><option>Sales production report</option><option>Book of business report</option></select><button aria-label="Open report" type="button"><ChevronRight size={22} /></button></div></Card>;
}

function ContactsCard() {
  return <Card title="ERIE CONTACTS"><label className="muted-label">Search the phone directory</label><div className="icon-input"><input placeholder="Name, title, or department" aria-label="Search contacts" /><Search size={17} /></div></Card>;
}

function TaskForceCard() {
  return <Card title="TASK FORCE" tone="teal"><LinkList items={['What is Task Force', 'Message from the Moderator (4/21/26)', 'Top Priorities (4/21/26)']} /></Card>;
}

export default App;
