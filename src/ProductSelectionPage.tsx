import { useMemo, useState } from 'react';
import { ChevronDown, CircleHelp, Home, Info } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '@/product-page.css';

type ProductKey = 'auto' | 'home' | 'boat' | 'life';
type ProductState = Record<ProductKey, boolean>;
type AgentState = Record<ProductKey, string>;

const productLabels: Record<ProductKey, string> = {
  auto: 'Auto',
  home: 'Home',
  boat: 'Boat',
  life: 'ERIExpress Life',
};

const productOrder: ProductKey[] = ['auto', 'home', 'boat', 'life'];
const agentOptions = ['-- Select --', 'Agent #10492', 'Agent #20941'];

function ProductSelectionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const firstName = params.get('firstName') ?? '';
  const lastName = params.get('lastName') ?? '';
  const address = params.get('address') ?? '509 Erie Insurance Way';
  const city = params.get('city') ?? 'Meadville';
  const state = params.get('state') ?? 'WI';
  const zip = params.get('zip') ?? '16335';
  const [selected, setSelected] = useState<ProductState>({ auto: true, home: true, boat: false, life: false });
  const [agents, setAgents] = useState<AgentState>({ auto: '', home: '', boat: '', life: '' });
  const [errors, setErrors] = useState<Partial<Record<ProductKey, boolean>>>({});

  const fullName = useMemo(() => [firstName, lastName].filter(Boolean).join(' ') || 'David Guttenberg', [firstName, lastName]);
  const toggleProduct = (product: ProductKey) => {
    setSelected((current) => ({ ...current, [product]: !current[product] }));
    setErrors((current) => ({ ...current, [product]: false }));
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
    if (Object.keys(nextErrors).length === 0) navigate(`/quotes/underwriting?${params.toString()}`);
  };

  return <div className="product-page">
    <header className="product-topbar"><button className="product-brand" type="button" onClick={() => navigate('/')} aria-label="Back to dashboard"><span className="product-erie-mark">⌂</span><span>Erie<small>Insurance</small></span></button><div className="product-header-actions"><button type="button">Vito Bitanghol <ChevronDown size={13} /></button><button className="product-help" type="button" aria-label="Help"><CircleHelp size={23} fill="#003b70" color="#fff" /></button></div></header>
    <main className="product-main">
      <div className="product-breadcrumb"><Home size={12} fill="#003b70" /> <strong>PRODUCT</strong></div>
      <div className="required-note"><span>*</span>=Required</div>
      <section className="product-card prospect-card"><h1>Prospect Conversion Potential</h1><div className="prospect-top"><div className="prospect-info"><div className="prospect-label">Prospect</div><div className="prospect-details"><strong>{fullName}</strong><span>{address}</span><span>{city}, {state} {zip}</span></div></div><div className="conversion"><div className="conversion-title">Conversion Potential for this Prospect <Info size={13} /></div><div className="meter"><span>0%</span><div className="meter-track"><div className="meter-fill" /></div><span>100%</span></div><div className="industry-marker"><span>Industry Standard</span></div></div></div><div className="record-alert"><Info size={14} fill="white" /> <strong>Public records show that {fullName} may have a: Recreational Vehicle and/or Golf Cart</strong></div></section>

      <section className="product-section"><h2>Product</h2><div className="product-card product-list">{productOrder.map((product) => <ProductRow key={product} product={product} checked={selected[product]} agent={agents[product]} hasError={Boolean(errors[product])} onToggle={toggleProduct} onAgentChange={setAgent} />)}</div></section>

      <div className="product-actions"><button className="outline-action" type="button" onClick={() => navigate('/')}>EXIT</button><div><button className="outline-action" type="button" onClick={() => navigate(`/quotes/search-results?${params.toString()}`)}>PREVIOUS</button><button className="continue-action" type="button" onClick={continueWizard}>CONTINUE</button></div></div>
    </main>
  </div>;
}

function ProductRow({ product, checked, agent, hasError, onToggle, onAgentChange }: { product: ProductKey; checked: boolean; agent: string; hasError: boolean; onToggle: (product: ProductKey) => void; onAgentChange: (product: ProductKey, agent: string) => void }) {
  return <div className={`product-row ${checked ? 'expanded' : ''}`}><label className="product-row-header"><input type="checkbox" checked={checked} onChange={() => onToggle(product)} /><span>{productLabels[product]}</span></label>{checked && <div className="product-row-body"><label className="agent-label"><span>*</span> Agent Number</label><div className="agent-control"><select className={hasError ? 'field-error' : ''} value={agent} onChange={(event) => onAgentChange(product, event.target.value)} aria-label={`${productLabels[product]} agent number`}><option value="">{agentOptions[0]}</option>{agentOptions.slice(1).map((option) => <option key={option} value={option}>{option}</option>)}</select>{hasError && <span className="agent-error">Please select an Agent Number</span>}</div></div>}</div>;
}

export default ProductSelectionPage;
