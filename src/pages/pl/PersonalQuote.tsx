import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Home } from 'lucide-react';
import '@/pl.css';
import QuoteHeader from '@/components/QuoteHeader';
import { usePortal } from '@/data/store';
import { blankPl, PlStep, stepComplete, stepsForQuote } from '@/lib/personalLines';
import type { PersonalLinesInfo, Quote } from '@/data/types';
import { Loading } from '@/pages/pl/PlUi';
import CustomerStep from '@/pages/pl/CustomerStep';
import DriversStep from '@/pages/pl/DriversStep';
import VehiclesStep from '@/pages/pl/VehiclesStep';
import DwellingStep from '@/pages/pl/DwellingStep';
import ReportsStep from '@/pages/pl/ReportsStep';
import CoveragesStep from '@/pages/pl/CoveragesStep';

type Ctx = {
  quote: Quote;
  pl: PersonalLinesInfo;
  update: (patch: Partial<Quote> | ((q: Quote) => Partial<Quote>)) => void;
  setPl: (patch: Partial<PersonalLinesInfo>) => void;
  // force: the caller just validated and completed the current step (the patch hasn't re-rendered yet).
  go: (step: PlStep | 'underwriting', force?: boolean) => void;
  busy: (text: string, then?: () => void, ms?: number) => void;
  saveExit: () => void;
  steps: PlStep[];
};
const PlContext = createContext<Ctx | null>(null);
export const usePl = () => useContext(PlContext)!;

const labels: Record<PlStep, string> = { customer: 'CUSTOMER', drivers: 'DRIVERS', vehicles: 'VEHICLES', dwelling: 'DWELLING', reports: 'REPORTS', coverages: 'COVERAGES' };

export default function PersonalQuote({ quote, step, update }: { quote: Quote; step: PlStep; update: (patch: Partial<Quote> | ((q: Quote) => Partial<Quote>)) => void }) {
  const navigate = useNavigate();
  const { saveQuote, notify } = usePortal();
  const [loading, setLoading] = useState('');
  const pl = quote.pl ?? blankPl();
  const steps = stepsForQuote(quote);
  const setPl = (patch: Partial<PersonalLinesInfo>) => update((q) => ({ pl: { ...(q.pl ?? blankPl()), ...patch } }));

  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  // A step opens only when every step before it is complete.
  const firstOpen = steps.find((s) => !stepComplete(quote, s));
  const reachable = (s: PlStep) => steps.indexOf(s) <= steps.indexOf(firstOpen ?? 'coverages');
  useEffect(() => { if (!reachable(step) && firstOpen) navigate(`/quotes/${quote.id}/${firstOpen}`, { replace: true }); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (target: PlStep | 'underwriting', force = false) => {
    if (!force && target !== 'underwriting' && !reachable(target)) { notify(`Complete ${labels[firstOpen!]} before continuing.`, 'error'); return; }
    update({ lastStep: target });
    navigate(`/quotes/${quote.id}/${target}`);
  };
  const busy = (text: string, then?: () => void, ms = 800) => { setLoading(text); window.setTimeout(() => { setLoading(''); then?.(); }, ms); };
  const saveExit = () => { saveQuote({ ...quote, lastStep: step }); notify(`Quote saved — ${quote.applicant.lastName}, ${quote.applicant.firstName}.`); navigate('/quotes/search-results'); };

  const body: Record<PlStep, ReactNode> = { customer: <CustomerStep />, drivers: <DriversStep />, vehicles: <VehiclesStep />, dwelling: <DwellingStep />, reports: <ReportsStep />, coverages: <CoveragesStep /> };

  return <PlContext.Provider value={{ quote, pl, update, setPl, go, busy, saveExit, steps }}>
    <div className="pl-page">
      <QuoteHeader quote={quote} />
      <main className="pl-main">
        <nav className="pl-steps" aria-label="Quote steps">
          <button type="button" className="pl-home" aria-label="Quotes home" onClick={saveExit}><Home size={15} fill="currentColor" /></button>
          {steps.map((s) => { const done = stepComplete(quote, s); return <button type="button" key={s} className={`${s === step ? 'current' : ''} ${done ? 'done' : ''} ${reachable(s) ? '' : 'locked'}`} aria-current={s === step ? 'step' : undefined} onClick={() => go(s)}>{done && <CheckCircle2 size={13} className="pl-step-check" />}{labels[s]}</button>; })}
        </nav>
        <div className="pl-required-note"><span className="pl-req">*</span>=Required{step !== 'reports' && step !== 'coverages' && <>, <span className="pl-appreq">‡</span>=Required for Application</>}</div>
        {body[step]}
      </main>
      {loading && <Loading text={loading} />}
    </div>
  </PlContext.Provider>;
}
