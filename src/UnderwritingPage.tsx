import { ChevronDown, CircleHelp } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '@/product-page.css';

function UnderwritingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const name = [params.get('firstName'), params.get('lastName')].filter(Boolean).join(' ') || 'the prospect';

  return <div className="product-page"><header className="product-topbar"><button className="product-brand" type="button" onClick={() => navigate('/')}><span className="product-erie-mark">⌂</span><span>Erie<small>Insurance</small></span></button><div className="product-header-actions"><button type="button">Vito Bitanghol <ChevronDown size={13} /></button><button className="product-help" type="button" aria-label="Help"><CircleHelp size={23} fill="#003b70" color="#fff" /></button></div></header><main className="product-main"><div className="product-breadcrumb"><strong>UNDERWRITING</strong></div><section className="product-card underwriting-card"><h1>Underwriting</h1><p>The next quote step is ready for {name}. Continue reviewing the selected products and underwriting questions here.</p><button className="outline-action" type="button" onClick={() => navigate(`/quotes/select-products?${params.toString()}`)}>PREVIOUS</button></section></main></div>;
}

export default UnderwritingPage;
