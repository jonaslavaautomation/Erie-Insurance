import { useMemo, useState } from 'react';
import { Home, Info } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '@/product-page.css';
import QuoteHeader from '@/components/QuoteHeader';
import { Modal } from '@/components/ui';
import { newQuoteDraft, usePortal } from '@/data/store';
import { AGENT } from '@/data/seed';
import type { ProductKey } from '@/data/types';

type ProductState = Record<ProductKey, boolean>;
type AgentState = Record<ProductKey, string>;

const productLabels: Record<ProductKey, string> = {
  auto: 'Auto',
  home: 'Home',
  umbrella: 'Umbrella (Personal Catastrophe Liability)',
  boat: 'Boat',
  life: 'ERIExpress Life',
  commercial: 'Commercial Lines (Ultrapack Plus, Fivestar Contractors, Commercial Auto, Workers’ Comp)',
};

const productOrder: ProductKey[] = ['auto', 'home', 'umbrella', 'boat', 'life', 'commercial'];
const none: Record<ProductKey, boolean> = { auto: false, home: false, umbrella: false, boat: false, life: false, commercial: false };
const agentOptions = ['-- Select --', ...AGENT.agentNumbers];

function ProductSelectionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { saveQuote, policies, notify } = usePortal();
  const firstName = params.get('firstName') ?? '';
  const middleName = params.get('middleName') ?? '';
  const lastName = params.get('lastName') ?? '';
  const address = params.get('address') ?? '';
  const city = params.get('city') ?? '';
  const state = params.get('state') ?? 'WI';
  const zip = params.get('zip') ?? '';
  const dob = params.get('dob') ?? '';
  const customerId = params.get('customerId') ?? undefined;
  const preselect = params.get('product') as ProductKey | null;
  const [selected, setSelected] = useState<ProductState>(preselect && preselect in none ? { ...none, [preselect]: true } : { ...none, auto: true, home: true });
  const [agents, setAgents] = useState<AgentState>({ auto: '', home: '', umbrella: '', boat: '', life: '', commercial: '' });
  const [errors, setErrors] = useState<Partial<Record<ProductKey, boolean>>>({});
  const [noProduct, setNoProduct] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);

  const fullName = useMemo(() => [firstName, lastName].filter(Boolean).join(' ') || 'Prospect', [firstName, lastName]);
  const existing = customerId ? policies.filter((p) => p.customerId === customerId) : [];
  const selectedCount = productOrder.filter((p) => selected[p]).length;
  const conversion = Math.min(92, 30 + selectedCount * 12 + existing.length * 10);

  const toggleProduct = (product: ProductKey) => {
    setSelected((current) => ({ ...current, [product]: !current[product] }));
    setErrors((current) => ({ ...current, [product]: false }));
    setNoProduct(false);
  };
  const setAgent = (product: ProductKey, agent: string) => {
    setAgents((current) => ({ ...current, [product]: agent }));
    setErrors((current) => ({ ...current, [product]: false }));
  };
  const continueWizard = () => {
    const nextErrors: Partial<Record<ProductKey, boolean>> = {};
    productOrder.forEach((product) => {
      if (selected[product] && !agents[product]) nextErrors[product] = true;
    });
    setErrors(nextErrors);
    if (selectedCount === 0) { setNoProduct(true); return; }
    if (Object.keys(nextErrors).length > 0) return;
    const quote = newQuoteDraft({ firstName, middleName, lastName, address, city, state, zip, dob, phone: '', email: '' }, customerId);
    quote.products = productOrder.filter((p) => selected[p]);
    quote.agentNumbers = Object.fromEntries(quote.products.map((p) => [p, agents[p]]));
    if (selected.commercial) quote.commercial.business = { ...quote.commercial.business, ownerFirst: firstName, ownerLast: lastName, address, city, state, zip };
    saveQuote(quote);
    notify(`Quote ${quote.id} created.`);
    navigate(`/quotes/${quote.id}/underwriting`);
  };

  return <div className="product-page">
    <QuoteHeader />
    <main className="product-main">
      <div className="product-breadcrumb"><Home size={12} fill="#003b70" /> <strong>PRODUCT</strong></div>
      <div className="required-note"><span>*</span>=Required</div>
      <section className="product-card prospect-card"><h1>Prospect Conversion Potential</h1><div className="prospect-top"><div className="prospect-info"><div className="prospect-label">Prospect</div><div className="prospect-details"><strong>{fullName}</strong><span>{address}</span><span>{city}, {state} {zip}</span>{existing.length > 0 && <span className="existing-note">Existing customer · {existing.length} active polic{existing.length === 1 ? 'y' : 'ies'}</span>}</div></div><div className="conversion"><div className="conversion-title">Conversion Potential for this Prospect <Info size={13} aria-label="Estimated from products selected and existing relationship" /></div><div className="meter"><span>0%</span><div className="meter-track"><div className="meter-fill" style={{ width: `${conversion}%` }} /></div><span>100%</span></div><div className="industry-marker"><span>Industry Standard · this prospect {conversion}%</span></div></div></div><button type="button" className="record-alert" onClick={() => setRecordsOpen(true)}><Info size={14} fill="white" /> <strong>Public records show that {fullName} may have a: Recreational Vehicle and/or Golf Cart</strong><span className="record-link">View details</span></button></section>

      <section className="product-section"><h2>Product</h2>{noProduct && <div className="agent-error block">Select at least one product to continue.</div>}{selected.umbrella && !selected.auto && !selected.home && !existing.some((p) => p.type === 'Auto' || p.type === 'Home') && <div className="px-note">Umbrella without ERIE auto or home: you’ll enter the other carrier’s underlying limits on the Umbrella step (auto 250/500/100 or 500 CSL, home liability $300,000 required).</div>}{selected.auto && selected.home && selected.umbrella && <div className="px-note good">Auto + Home + Umbrella qualifies for the additional 5% bundle credit.</div>}<div className="product-card product-list">{productOrder.map((product) => <ProductRow key={product} product={product} checked={selected[product]} agent={agents[product]} hasError={Boolean(errors[product])} onToggle={toggleProduct} onAgentChange={setAgent} />)}</div></section>

      <div className="product-actions"><button className="outline-action" type="button" onClick={() => navigate('/')}>EXIT</button><div><button className="outline-action" type="button" onClick={() => navigate(`/quotes/search-results?${params.toString()}`)}>PREVIOUS</button><button className="continue-action" type="button" onClick={continueWizard}>CONTINUE</button></div></div>
    </main>
    {recordsOpen && <Modal title="Public records results" onClose={() => setRecordsOpen(false)} footer={<button type="button" className="px-btn" onClick={() => { setRecordsOpen(false); notify('Cross-sell opportunity saved to the prospect notes.', 'info'); }}>Save as cross-sell note</button>}>
      <p>Third-party public records associated with <strong>{fullName}</strong> at {address || 'this address'}:</p>
      <table className="px-table"><thead><tr><th>Item</th><th>Source</th><th>Confidence</th></tr></thead><tbody><tr><td>2019 Club Car Onward (golf cart)</td><td>State registration</td><td>High</td></tr><tr><td>2016 Jayco Jay Flight 28BHS (travel trailer)</td><td>DMV title record</td><td>Medium</td></tr></tbody></table>
      <p className="px-muted">These items can be covered by a recreational vehicle endorsement or a separate policy. Confirm ownership with the prospect.</p>
    </Modal>}
  </div>;
}

function ProductRow({ product, checked, agent, hasError, onToggle, onAgentChange }: { product: ProductKey; checked: boolean; agent: string; hasError: boolean; onToggle: (product: ProductKey) => void; onAgentChange: (product: ProductKey, agent: string) => void }) {
  return <div className={`product-row ${checked ? 'expanded' : ''}`}><label className="product-row-header"><input type="checkbox" checked={checked} onChange={() => onToggle(product)} /><span>{productLabels[product]}</span></label>{checked && <div className="product-row-body"><label className="agent-label"><span>*</span> Agent Number</label><div className="agent-control"><select className={hasError ? 'field-error' : ''} value={agent} onChange={(event) => onAgentChange(product, event.target.value)} aria-label={`${productLabels[product]} agent number`}><option value="">{agentOptions[0]}</option>{agentOptions.slice(1).map((option) => <option key={option} value={option}>{option}</option>)}</select>{hasError && <span className="agent-error">Please select an Agent Number</span>}</div></div>}</div>;
}

export default ProductSelectionPage;
