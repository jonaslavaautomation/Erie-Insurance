import { FormEvent, useMemo, useState } from 'react';
import { Archive, ChevronDown, Info, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '@/quote-page.css';
import QuoteHeader from '@/components/QuoteHeader';
import { StatusBadge } from '@/components/ui';
import { fullName, usePortal } from '@/data/store';
import { STATES } from '@/data/content';
import { AGENT } from '@/data/seed';
import type { Customer, QuoteStatus } from '@/data/types';

type QuoteForm = {
  suffix: string;
  firstName: string;
  middleName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  month: string;
  day: string;
  year: string;
};

type Filters = { effective: string; product: string; agent: string; status: string };
const filterOptions: Record<keyof Filters, { label: string; options: string[] }> = {
  effective: { label: 'Effective Date', options: ['Any', 'Next 30 days', 'Past due'] },
  product: { label: 'Product', options: ['Any', 'auto', 'home', 'boat', 'life'] },
  agent: { label: 'Agent', options: ['Any', ...AGENT.agentNumbers] },
  status: { label: 'Status', options: ['Any', 'Quote', 'Referred', 'Application', 'Issued', 'Declined'] },
};

function QuoteSearchPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { quotes, customers, deleteQuotes, archiveQuotes, notify } = usePortal();
  const firstName = params.get('firstName') ?? '';
  const lastName = params.get('lastName') ?? '';
  const [query, setQuery] = useState([lastName, firstName].filter(Boolean).join(', '));
  const [filters, setFilters] = useState<Filters>({ effective: 'Any', product: params.get('product') ?? 'Any', agent: 'Any', status: 'Any' });
  const [openFilter, setOpenFilter] = useState<keyof Filters | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | undefined>();
  const [errors, setErrors] = useState<string[]>([]);
  const [form, setForm] = useState<QuoteForm>({ suffix: '', firstName, middleName: params.get('middleName') ?? '', lastName, address: '', city: '', state: 'WI', zip: '', month: '', day: '', year: '' });

  const updateForm = (key: keyof QuoteForm, value: string) => { setForm((current) => ({ ...current, [key]: value })); setErrors([]); };
  const terms = query.toLowerCase().replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  const matches = (text: string) => terms.every((term) => text.toLowerCase().includes(term));

  const matchingQuotes = useMemo(() => quotes.filter((quote) => {
    if (showArchive !== (quote.status === 'Archived')) return false;
    if (!matches(`${fullName(quote.applicant)} ${quote.id}`)) return false;
    if (filters.product !== 'Any' && !quote.products.includes(filters.product as never)) return false;
    if (filters.agent !== 'Any' && !Object.values(quote.agentNumbers).includes(filters.agent)) return false;
    if (filters.status !== 'Any' && quote.status !== (filters.status as QuoteStatus)) return false;
    const days = (new Date(quote.effectiveDate).getTime() - Date.now()) / 86400000;
    if (filters.effective === 'Next 30 days' && (days < 0 || days > 30)) return false;
    if (filters.effective === 'Past due' && days >= 0) return false;
    return true;
  }), [quotes, query, filters, showArchive]); // eslint-disable-line react-hooks/exhaustive-deps

  const matchingCustomers = showArchive || terms.length === 0 ? [] : customers.filter((customer) => matches(fullName(customer)));

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer.id);
    setForm({ suffix: '', firstName: customer.firstName, middleName: customer.middleName, lastName: customer.lastName, address: customer.address, city: customer.city, state: customer.state, zip: customer.zip, month: customer.dob.slice(5, 7), day: customer.dob.slice(8, 10), year: customer.dob.slice(0, 4) });
    setErrors([]);
    notify(`Prefilled from customer account ${customer.id}.`, 'info');
  };

  const submitNewQuote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problems: string[] = [];
    if (!form.firstName.trim() || !form.lastName.trim()) problems.push('First and last legal name are required.');
    if (!form.address.trim() || !form.city.trim()) problems.push('Street address and city are required.');
    if (!/^\d{5}$/.test(form.zip)) problems.push('ZIP code must be 5 digits.');
    const dob = new Date(`${form.year}-${form.month.padStart(2, '0')}-${form.day.padStart(2, '0')}T12:00:00`);
    if (!/^\d{4}$/.test(form.year) || Number.isNaN(dob.getTime()) || dob > new Date()) problems.push('Enter a valid date of birth (MM / DD / YYYY).');
    else if (new Date().getFullYear() - dob.getFullYear() < 16) problems.push('Applicant must be at least 16 years old.');
    setErrors(problems);
    if (problems.length) return;
    const quoteParams = new URLSearchParams({ firstName: form.firstName, middleName: form.middleName, lastName: form.lastName, address: form.address, city: form.city, state: form.state, zip: form.zip, dob: `${form.year}-${form.month.padStart(2, '0')}-${form.day.padStart(2, '0')}` });
    if (selectedCustomer) quoteParams.set('customerId', selectedCustomer);
    if (params.get('product')) quoteParams.set('product', params.get('product')!);
    navigate(`/quotes/select-products?${quoteParams.toString()}`);
  };

  const toggleSelected = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  const archiveSelected = () => { archiveQuotes(selected, !showArchive); notify(`${selected.length} quote${selected.length === 1 ? '' : 's'} ${showArchive ? 'restored' : 'archived'}.`); setSelected([]); };
  const deleteSelected = () => { if (!window.confirm(`Delete ${selected.length} quote(s)? This cannot be undone.`)) return; deleteQuotes(selected); notify('Quotes deleted.'); setSelected([]); };
  const hasResults = matchingQuotes.length > 0 || matchingCustomers.length > 0;

  return <div className="quote-page">
    <QuoteHeader />

    <main className="quote-main">
      <section className="quote-panel new-quote-panel">
        <h1>Create a New Quote</h1>
        <form onSubmit={submitNewQuote} noValidate>
          <div className="new-quote-fields">
            <div className="quote-field-group legal-group"><label><span>*</span> Legal Name <Info size={13} aria-label="Enter the name exactly as it appears on the driver's license" /></label><div className="legal-inputs"><select aria-label="Suffix" value={form.suffix} onChange={(event) => updateForm('suffix', event.target.value)}><option></option><option>Jr.</option><option>Sr.</option><option>II</option><option>III</option></select><input value={form.firstName} onChange={(event) => updateForm('firstName', event.target.value)} placeholder="First" aria-label="First name" /><input value={form.middleName} onChange={(event) => updateForm('middleName', event.target.value)} placeholder="Middle" aria-label="Middle name" /><input value={form.lastName} onChange={(event) => updateForm('lastName', event.target.value)} placeholder="Last" aria-label="Last name" /></div></div>
            <div className="quote-field-group address-group"><label><span>*</span> Mailing Address</label><input value={form.address} onChange={(event) => updateForm('address', event.target.value)} placeholder="Street Address" aria-label="Street address" /><div className="address-row"><input value={form.city} onChange={(event) => updateForm('city', event.target.value)} placeholder="City" aria-label="City" /><select value={form.state} onChange={(event) => updateForm('state', event.target.value)} aria-label="State">{STATES.map((state) => <option key={state}>{state}</option>)}</select><input value={form.zip} onChange={(event) => updateForm('zip', event.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="Zip" aria-label="Zip code" inputMode="numeric" /></div></div>
            <div className="quote-field-group dob-group"><label><span>*</span> Date of Birth</label><div className="dob-inputs"><input value={form.month} onChange={(event) => updateForm('month', event.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="MM" aria-label="Birth month" inputMode="numeric" /><input value={form.day} onChange={(event) => updateForm('day', event.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="DD" aria-label="Birth day" inputMode="numeric" /><input value={form.year} onChange={(event) => updateForm('year', event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="YYYY" aria-label="Birth year" inputMode="numeric" /></div></div>
          </div>
          {errors.length > 0 && <ul className="quote-errors" role="alert">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}
          <div className="quote-form-footer"><button className="quote-primary-button" type="submit">START NEW QUOTE <span>→</span></button></div>
        </form>
      </section>

      <section className="quote-panel search-quotes-panel">
        <h2>{showArchive ? 'Archived Quotes / Applications' : 'Search Quotes / Applications'}</h2>
        <div className="quote-search-controls"><div className="quote-filter-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or quote number" aria-label="Search quotes and applications" /></div><div className="quote-filters">{(Object.keys(filterOptions) as (keyof Filters)[]).map((key) => <div className="quote-filter" key={key}><button type="button" className={filters[key] !== 'Any' ? 'active' : ''} onClick={() => setOpenFilter(openFilter === key ? null : key)} aria-expanded={openFilter === key}>{filters[key] === 'Any' ? filterOptions[key].label : `${filterOptions[key].label}: ${filters[key]}`}<ChevronDown size={13} /></button>{openFilter === key && <div className="quote-filter-menu">{filterOptions[key].options.map((option) => <button type="button" key={option} className={filters[key] === option ? 'selected' : ''} onClick={() => { setFilters({ ...filters, [key]: option }); setOpenFilter(null); }}>{option}</button>)}</div>}</div>)}</div></div>
        <div className="empty-results">{!hasResults ? <strong>No results found</strong> : <div className="customer-results">
          {matchingQuotes.map((quote) => <div className="customer-result quote-row" key={quote.id}><input type="checkbox" checked={selected.includes(quote.id)} onChange={() => toggleSelected(quote.id)} aria-label={`Select quote ${quote.id}`} /><button type="button" className="quote-row-main" onClick={() => navigate(quote.status === 'Issued' ? `/quotes/${quote.id}/issued` : `/quotes/${quote.id}/${quote.lastStep}`)}><span><strong>{quote.applicant.lastName}, {quote.applicant.firstName} · {quote.id}</strong><small>{quote.products.map((p) => p.toUpperCase()).join(' + ') || 'No products'} · Effective {quote.effectiveDate} · Updated {quote.updatedAt.slice(0, 10)}</small></span><StatusBadge status={quote.status} /><span className="result-action">{quote.status === 'Issued' ? 'VIEW' : 'RESUME'}</span></button></div>)}
          {matchingCustomers.map((customer) => <button className={`customer-result ${selectedCustomer === customer.id ? 'chosen' : ''}`} type="button" key={customer.id} onClick={() => selectCustomer(customer)}><span><strong>{customer.lastName}, {customer.firstName}{customer.middleName ? ` ${customer.middleName}` : ''} · Customer account</strong><small>{customer.address}, {customer.city}, {customer.state} {customer.zip}</small></span><span className="result-action">{selectedCustomer === customer.id ? 'SELECTED' : 'USE ACCOUNT'}</span></button>)}
        </div>}</div>
        <div className="quote-results-footer"><div><button className={selected.length ? 'outline-action' : 'disabled-action'} type="button" disabled={!selected.length} onClick={archiveSelected}>{showArchive ? 'RESTORE' : 'ARCHIVE'}</button><button className={selected.length ? 'outline-action danger' : 'disabled-action'} type="button" disabled={!selected.length} onClick={deleteSelected}>DELETE</button></div><button type="button" className="archive-link" onClick={() => { setShowArchive((v) => !v); setSelected([]); }}><Archive size={14} /> {showArchive ? 'Back to active quotes' : 'View Archive'}</button></div>
      </section>
    </main>
  </div>;
}

export default QuoteSearchPage;
