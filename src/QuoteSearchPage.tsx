import { FormEvent, useEffect, useState } from 'react';
import { Archive, ChevronDown, CircleHelp, Info, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '@/quote-page.css';
import { supabase } from '@/lib/supabase';

type PortalCustomer = {
  id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  date_of_birth: string;
};

type QuoteForm = {
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

const filterLabels = ['Effective Date', 'Product', 'Agent', 'Status'];

function QuoteSearchPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const firstName = params.get('firstName') ?? '';
  const lastName = params.get('lastName') ?? '';
  const [query, setQuery] = useState(`${lastName}, ${firstName}`.replace(/^, |, $/g, ''));
  const [customers, setCustomers] = useState<PortalCustomer[]>([]);
  const [customerError, setCustomerError] = useState('');
  const [form, setForm] = useState<QuoteForm>({
    firstName,
    middleName: '',
    lastName,
    address: '509 Erie Insurance Way',
    city: 'Meadville',
    state: 'WI',
    zip: '16335',
    month: '07',
    day: '14',
    year: '1968',
  });

  const updateForm = (key: keyof QuoteForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const matchingCustomers = customers.filter((customer) => {
    const haystack = `${customer.first_name} ${customer.middle_name} ${customer.last_name}`.toLowerCase();
    return query.trim().length === 0 || query.toLowerCase().split(/\s+/).every((term) => haystack.includes(term));
  });

  useEffect(() => {
    let active = true;
    const loadCustomers = async () => {
      const { data, error } = await supabase.from('portal_customers').select('id, first_name, middle_name, last_name, address, city, state, zip, date_of_birth').order('last_name');
      if (!active) return;
      if (error) {
        setCustomerError('Customer accounts could not be loaded right now.');
        return;
      }
      setCustomers(data ?? []);
    };
    void loadCustomers();
    return () => { active = false; };
  }, []);

  const selectCustomer = (customer: PortalCustomer) => {
    setQuery(`${customer.last_name}, ${customer.first_name}`);
    setForm({ firstName: customer.first_name, middleName: customer.middle_name, lastName: customer.last_name, address: customer.address, city: customer.city, state: customer.state, zip: customer.zip, month: customer.date_of_birth.slice(5, 7), day: customer.date_of_birth.slice(8, 10), year: customer.date_of_birth.slice(0, 4) });
  };

  const submitNewQuote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quoteParams = new URLSearchParams({ firstName: form.firstName, lastName: form.lastName, address: form.address, city: form.city, state: form.state, zip: form.zip, dob: `${form.year}-${form.month}-${form.day}` });
    navigate(`/quotes/select-products?${quoteParams.toString()}`);
  };

  return <div className="quote-page">
    <header className="quote-topbar">
      <button className="quote-brand" onClick={() => navigate('/')} type="button" aria-label="Back to dashboard">
        <span className="quote-erie-mark">⌂</span><span className="quote-brand-name">Erie<small>Insurance</small></span>
      </button>
      <div className="quote-header-actions"><button type="button" className="templates-link">Templates</button><button type="button" className="quote-profile">Vito Bitanghol <ChevronDown size={13} /></button><button type="button" className="help-button" aria-label="Help"><CircleHelp size={22} fill="#003b70" color="white" /></button></div>
    </header>

    <main className="quote-main">
      <section className="quote-panel new-quote-panel">
        <h1>Create a New Quote</h1>
        <form onSubmit={submitNewQuote}>
          <div className="new-quote-fields">
            <div className="quote-field-group legal-group"><label><span>*</span> Legal Name <Info size={13} /></label><div className="legal-inputs"><select aria-label="Suffix"><option></option><option>Jr.</option><option>Sr.</option></select><input value={form.firstName} onChange={(event) => updateForm('firstName', event.target.value)} placeholder="First" aria-label="First name" /><input value={form.middleName} onChange={(event) => updateForm('middleName', event.target.value)} placeholder="Middle" aria-label="Middle name" /><input value={form.lastName} onChange={(event) => updateForm('lastName', event.target.value)} placeholder="Last" aria-label="Last name" /></div></div>
            <div className="quote-field-group address-group"><label><span>*</span> Mailing Address</label><input value={form.address} onChange={(event) => updateForm('address', event.target.value)} placeholder="Street Address" aria-label="Street address" /><div className="address-row"><input value={form.city} onChange={(event) => updateForm('city', event.target.value)} placeholder="City" aria-label="City" /><select value={form.state} onChange={(event) => updateForm('state', event.target.value)} aria-label="State"><option>WI</option><option>PA</option><option>OH</option><option>NY</option></select><input value={form.zip} onChange={(event) => updateForm('zip', event.target.value)} placeholder="Zip" aria-label="Zip code" /></div></div>
            <div className="quote-field-group dob-group"><label><span>*</span> Date of Birth</label><div className="dob-inputs"><input value={form.month} onChange={(event) => updateForm('month', event.target.value)} placeholder="MM" aria-label="Birth month" /><input value={form.day} onChange={(event) => updateForm('day', event.target.value)} placeholder="DD" aria-label="Birth day" /><input value={form.year} onChange={(event) => updateForm('year', event.target.value)} placeholder="YYYY" aria-label="Birth year" /></div></div>
          </div>
          <div className="quote-form-footer"><button className="quote-primary-button" type="submit">START NEW QUOTE <span>→</span></button></div>
        </form>
      </section>

      <section className="quote-panel search-quotes-panel">
        <h2>Search Quotes / Applications</h2>
        <div className="quote-search-controls"><div className="quote-filter-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search quotes and applications" /></div><div className="quote-filters">{filterLabels.map((label) => <button type="button" key={label}>{label}<ChevronDown size={13} /></button>)}</div></div>
        <div className="empty-results">{customerError ? <strong>{customerError}</strong> : matchingCustomers.length === 0 ? <strong>No results found</strong> : <div className="customer-results">{matchingCustomers.map((customer) => <button className="customer-result" type="button" key={customer.id} onClick={() => selectCustomer(customer)}><span><strong>{customer.last_name}, {customer.first_name}{customer.middle_name ? ` ${customer.middle_name}` : ''}</strong><small>{customer.address}, {customer.city}, {customer.state} {customer.zip}</small></span><span className="result-action">USE ACCOUNT</span></button>)}</div>}</div>
        <div className="quote-results-footer"><div><button className="disabled-action" type="button" disabled>ARCHIVE</button><button className="disabled-action" type="button" disabled>DELETE</button></div><button type="button" className="archive-link"><Archive size={14} /> View Archive</button></div>
      </section>
    </main>

  </div>;
}

export default QuoteSearchPage;
