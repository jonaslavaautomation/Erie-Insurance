import { useMemo, useState } from 'react';
import { Calendar, Home, Info } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '@/product-page.css';
import QuoteHeader from '@/components/QuoteHeader';
import { Modal } from '@/components/ui';
import { newQuoteDraft, today, usePortal } from '@/data/store';
import { AGENT, defaultAutoCoverages, defaultHomeCoverages } from '@/data/seed';
import { loadTemplates } from '@/lib/templates';
import { blankPl, nextQuoteNumbers } from '@/lib/personalLines';
import { HOME_POLICY_TYPES } from '@/pages/pl/DwellingStep';
import type { AutoCoverages, HomeCoverages, ProductKey } from '@/data/types';

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

const productOrder: ProductKey[] = ['auto', 'home', 'boat', 'life', 'umbrella', 'commercial'];
const none: Record<ProductKey, boolean> = { auto: false, home: false, umbrella: false, boat: false, life: false, commercial: false };
const agentOptions = ['-- Select --', ...AGENT.agentNumbers];

// Agency coverage templates applied when the quote is created.
const AUTO_TEMPLATES: Record<string, Partial<AutoCoverages>> = {
  'Agency Standard - Auto': { bodilyInjury: '250/500', propertyDamage: '100,000', uninsuredMotorist: '250/500', underinsuredMotorist: '250/500', medicalPayments: '10,000', comprehensiveDeductible: 250, collisionDeductible: 500, autoPlus: true, rateLock: true },
  'High Limits - Auto': { bodilyInjury: '500/500', propertyDamage: '250,000', uninsuredMotorist: '500 CSL', underinsuredMotorist: '500 CSL', medicalPayments: '10,000', comprehensiveDeductible: 250, collisionDeductible: 500, autoPlus: true, rateLock: true },
  'Basic - Auto': { bodilyInjury: '100/300', propertyDamage: '100,000', uninsuredMotorist: '100/300', underinsuredMotorist: '100/300', medicalPayments: '5,000', comprehensiveDeductible: 500, collisionDeductible: 1000, autoPlus: false, rateLock: true },
};
const HOME_TEMPLATES: Record<string, Partial<HomeCoverages>> = {
  'Agency Standard - Home': { personalLiability: 300000, medicalPayments: 5000, deductible: 1000, waterBackup: true },
  'High Limits - Home': { personalLiability: 500000, medicalPayments: 5000, deductible: 1000, waterBackup: true, equipmentBreakdown: true, identityRecovery: true },
  'Basic - Home': { personalLiability: 300000, medicalPayments: 1000, deductible: 2500 },
};

type Detail = { template: string; effective: string; policyType: string };

function ProductSelectionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { saveQuote, policies, quotes, notify } = usePortal();
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
  const [details, setDetails] = useState<Record<'auto' | 'home', Detail>>({ auto: { template: '', effective: today(), policyType: '' }, home: { template: '', effective: today(), policyType: '' } });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [noProduct, setNoProduct] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const saved = useMemo(loadTemplates, []);

  const fullName = useMemo(() => [firstName, lastName].filter(Boolean).join(' ') || 'Prospect', [firstName, lastName]);
  const existing = customerId ? policies.filter((p) => p.customerId === customerId) : [];
  const selectedCount = productOrder.filter((p) => selected[p]).length;
  const conversion = Math.min(92, 30 + selectedCount * 12 + existing.length * 10);

  const toggleProduct = (product: ProductKey) => {
    setSelected((current) => ({ ...current, [product]: !current[product] }));
    setNoProduct(false);
  };
  const setAgent = (product: ProductKey, agent: string) => { setAgents((c) => ({ ...c, [product]: agent })); setErrors((c) => ({ ...c, [`${product}-agent`]: false })); };
  const setDetail = (product: 'auto' | 'home', patch: Partial<Detail>) => { setDetails((c) => ({ ...c, [product]: { ...c[product], ...patch } })); setErrors((c) => ({ ...c, ...Object.fromEntries(Object.keys(patch).map((k) => [`${product}-${k}`, false])) })); };

  const continueWizard = () => {
    const next: Record<string, boolean> = {};
    productOrder.forEach((product) => {
      if (!selected[product]) return;
      if (!agents[product]) next[`${product}-agent`] = true;
      if (product === 'auto' || product === 'home') {
        const d = details[product];
        if (!d.template) next[`${product}-template`] = true;
        if (!d.effective || d.effective < today()) next[`${product}-effective`] = true;
        if (product === 'home' && !d.policyType) next['home-policyType'] = true;
      }
    });
    setErrors(next);
    if (selectedCount === 0) { setNoProduct(true); return; }
    if (Object.values(next).some(Boolean)) return;
    const quote = newQuoteDraft({ firstName, middleName, lastName, address, city, state, zip, dob, phone: '', email: '' }, customerId);
    quote.products = productOrder.filter((p) => selected[p]);
    quote.agentNumbers = Object.fromEntries(quote.products.map((p) => [p, agents[p]]));
    quote.numbers = nextQuoteNumbers(quotes, quote.products);
    if (selected.commercial) quote.commercial.business = { ...quote.commercial.business, ownerFirst: firstName, ownerLast: lastName, address, city, state, zip };
    const personal = selected.auto || selected.home;
    if (personal) {
      // Auto and home quote on the personal lines screens: Customer → … → Coverages.
      quote.flow = 'pl';
      quote.pl = blankPl();
      quote.effectiveDate = selected.auto ? details.auto.effective : details.home.effective;
      quote.templates = { ...(selected.auto ? { auto: details.auto.template } : {}), ...(selected.home ? { home: details.home.template } : {}) };
      if (selected.auto) {
        const savedAuto = saved.find((t) => t.name === details.auto.template)?.autoCoverages;
        quote.autoCoverages = { ...defaultAutoCoverages, ...(savedAuto ?? AUTO_TEMPLATES[details.auto.template]) };
      }
      if (selected.home) {
        const savedHome = saved.find((t) => t.name === details.home.template)?.homeCoverages;
        const form = HOME_POLICY_TYPES.find((t) => t.label === details.home.policyType)?.form ?? 'HO-3';
        quote.homePolicyType = details.home.policyType;
        quote.homeCoverages = { ...defaultHomeCoverages, ...(savedHome ?? HOME_TEMPLATES[details.home.template]), dwelling: 0, otherStructuresPct: 0, personalPropertyPct: 0, form };
        quote.property = { ...quote.property, yearBuilt: 0, squareFeet: 0, stories: 0, roofYear: 0, construction: '', dwellingStyle: '', alarm: undefined, roofMaterial: '', swimmingPool: false, sprinklers: false, families: 1, lossSettlement: 'Guaranteed Replacement Cost', perils: 'Comprehensive Perils', roofWindHailSettlement: 'No', ppLossSettlement: 'Replacement Cost', ppPerils: 'Comprehensive Perils' };
      }
      quote.lastStep = 'customer';
    }
    saveQuote(quote);
    notify(`Quote ${quote.numbers[quote.products[0]]} created.`);
    navigate(`/quotes/${quote.id}/${personal ? 'customer' : 'underwriting'}`);
  };

  const templateOptions = (p: 'auto' | 'home') => [...Object.keys(p === 'auto' ? AUTO_TEMPLATES : HOME_TEMPLATES), ...saved.map((t) => t.name)];

  return <div className="product-page">
    <QuoteHeader />
    <main className="product-main">
      <div className="product-breadcrumb"><Home size={12} fill="#003b70" /> <strong>PRODUCT</strong></div>
      <div className="required-note"><span>*</span>=Required</div>
      <section className="product-card prospect-card"><h1>Prospect Conversion Potential</h1><div className="prospect-top"><div className="prospect-info"><div className="prospect-label">Prospect</div><div className="prospect-details"><strong>{fullName.toUpperCase()}</strong><span>{address.toUpperCase()}</span><span>{`${city}, ${state} ${zip}`.toUpperCase()}</span>{existing.length > 0 && <span className="existing-note">Existing customer · {existing.length} active polic{existing.length === 1 ? 'y' : 'ies'}</span>}</div></div><div className="conversion"><div className="conversion-title">Conversion Potential for this Prospect <Info size={13} aria-label="Estimated from products selected and existing relationship" /></div><div className="meter"><span>0%</span><div className="meter-track"><div className="meter-fill" style={{ width: `${conversion}%` }} /><span className="meter-mark" style={{ left: '27%' }} /></div><span>100%</span></div><div className="industry-marker"><span>Industry Standard</span></div></div></div><button type="button" className="record-alert" onClick={() => setRecordsOpen(true)}><Info size={14} fill="white" /> <strong>Public records show that {fullName} may have a: Recreational Vehicle and/or Golf Cart</strong></button></section>

      <section className="product-section"><h2>Product</h2>{noProduct && <div className="agent-error block">Select at least one product to continue.</div>}{selected.umbrella && !selected.auto && !selected.home && !existing.some((p) => p.type === 'Auto' || p.type === 'Home') && <div className="px-note">Umbrella without ERIE auto or home: you’ll enter the other carrier’s underlying limits on the Umbrella step (auto 250/500/100 or 500 CSL, home liability $300,000 required).</div>}{(selected.auto || selected.home) && !selected.umbrella && <div className="px-note">Umbrella is added automatically when the auto/home quote is rated.</div>}<div className="product-card product-list">{productOrder.map((product) => {
        const checked = selected[product];
        const pl = product === 'auto' || product === 'home';
        const d = pl ? details[product as 'auto' | 'home'] : undefined;
        return <div key={product} className={`product-row ${checked ? 'expanded' : ''}`}>
          <label className="product-row-header"><input type="checkbox" checked={checked} onChange={() => toggleProduct(product)} /><span>{productLabels[product]}</span></label>
          {checked && <div className={`product-row-body ${pl && agents[product] ? 'two' : ''}`}>
            <div className="product-fields">
              <div className="product-field"><label><span>*</span>Agent Number</label><div className="agent-control"><select className={errors[`${product}-agent`] ? 'field-error' : ''} value={agents[product]} onChange={(e) => setAgent(product, e.target.value)} aria-label={`${productLabels[product]} agent number`}><option value="">{agentOptions[0]}</option>{agentOptions.slice(1).map((o) => <option key={o} value={o}>{o}</option>)}</select>{errors[`${product}-agent`] && <span className="agent-error">Please select an Agent Number</span>}</div></div>
              {pl && agents[product] && <>
                {product === 'home' && <div className="product-field"><label><span>*</span>Policy Type</label><div className="agent-control"><select className={errors['home-policyType'] ? 'field-error wide' : 'wide'} value={d!.policyType} onChange={(e) => setDetail('home', { policyType: e.target.value })} aria-label="Home policy type"><option value="">-- Select --</option>{HOME_POLICY_TYPES.map((t) => <option key={t.label}>{t.label}</option>)}</select>{errors['home-policyType'] && <span className="agent-error">Please select a Policy Type</span>}</div></div>}
                <div className="product-field"><label><span>*</span>Template</label><div className="agent-control"><select className={errors[`${product}-template`] ? 'field-error wide' : 'wide'} value={d!.template} onChange={(e) => setDetail(product as 'auto' | 'home', { template: e.target.value })} aria-label={`${productLabels[product]} template`}><option value="">-- Select --</option>{templateOptions(product as 'auto' | 'home').map((t) => <option key={t}>{t}</option>)}</select>{errors[`${product}-template`] && <span className="agent-error">Please select a Template</span>}</div></div>
              </>}
            </div>
            {pl && agents[product] && <div className="product-fields"><div className="product-field"><label><span>*</span>Effective Date</label><div className="agent-control"><span className="date-with-icon"><input type="date" className={errors[`${product}-effective`] ? 'field-error' : ''} value={d!.effective} min={today()} onChange={(e) => setDetail(product as 'auto' | 'home', { effective: e.target.value })} aria-label={`${productLabels[product]} effective date`} /><Calendar size={14} /></span><small>(mm/dd/yyyy)</small>{errors[`${product}-effective`] && <span className="agent-error">Effective Date can’t be in the past</span>}</div></div></div>}
          </div>}
        </div>;
      })}</div></section>

      <div className="product-actions"><button className="outline-action" type="button" onClick={() => navigate('/')}>EXIT</button><div><button className="outline-action" type="button" onClick={() => navigate(`/quotes/search-results?${params.toString()}`)}>PREVIOUS</button><button className="continue-action" type="button" onClick={continueWizard}>CONTINUE</button></div></div>
    </main>
    {recordsOpen && <Modal title="Public records results" onClose={() => setRecordsOpen(false)} footer={<button type="button" className="px-btn" onClick={() => { setRecordsOpen(false); notify('Cross-sell opportunity saved to the prospect notes.', 'info'); }}>Save as cross-sell note</button>}>
      <p>Third-party public records associated with <strong>{fullName}</strong> at {address || 'this address'}:</p>
      <table className="px-table"><thead><tr><th>Item</th><th>Source</th><th>Confidence</th></tr></thead><tbody><tr><td>2019 Club Car Onward (golf cart)</td><td>State registration</td><td>High</td></tr><tr><td>2016 Jayco Jay Flight 28BHS (travel trailer)</td><td>DMV title record</td><td>Medium</td></tr></tbody></table>
      <p className="px-muted">These items can be covered by a recreational vehicle endorsement or a separate policy. Confirm ownership with the prospect.</p>
    </Modal>}
  </div>;
}

export default ProductSelectionPage;
