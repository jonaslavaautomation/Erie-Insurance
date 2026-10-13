import { ReactNode, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleHelp, XCircle } from 'lucide-react';

/** Right-aligned label + control row. Errors print above the control, with ⊗ before the label. */
export function Row({ label, required, appReq, error, tip, children, wide, className = '' }: { label: ReactNode; required?: boolean; appReq?: boolean; error?: string; tip?: string; children: ReactNode; wide?: boolean; className?: string }) {
  return <div className={`pl-row ${error ? 'invalid' : ''} ${wide ? 'wide' : ''} ${className}`}>
    <div className="pl-label">{error && <XCircle className="pl-err-icon" size={13} />}{required && <span className="pl-req">*</span>}{appReq && <span className="pl-appreq">‡</span>}{label}</div>
    <div className="pl-control">{error && <div className="pl-err-text" role="alert">{error}</div>}<div className="pl-control-line">{children}{tip && <Tip text={tip} />}</div></div>
  </div>;
}

export function Tip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return <span className="pl-tip"><button type="button" aria-label="More information" onClick={() => setOpen((v) => !v)} onBlur={() => setOpen(false)}><CircleHelp size={13} /></button>{open && <span className="pl-tip-pop" role="tooltip">{text}</span>}</span>;
}

export function StatusIcon({ state }: { state: 'ok' | 'warn' | 'error' }) {
  if (state === 'ok') return <CheckCircle2 className="pl-status ok" size={16} aria-label="Complete" />;
  if (state === 'warn') return <AlertTriangle className="pl-status warn" size={16} aria-label="Needs review" />;
  return <XCircle className="pl-status error" size={16} aria-label="Incomplete or incorrect" />;
}

export function YesNo({ name, value, onChange }: { name: string; value: boolean | undefined; onChange: (v: boolean) => void }) {
  return <span className="pl-yesno" role="radiogroup">{[true, false].map((v) => <label key={String(v)}><input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} /> {v ? 'Yes' : 'No'}</label>)}</span>;
}

export function ErrorBanner({ show }: { show: boolean }) {
  return show ? <div className="pl-banner-error" role="alert"><XCircle size={14} /> One or more fields are incomplete or incorrect</div> : null;
}

export function Loading({ text }: { text: string }) {
  return <div className="pl-loading" role="status" aria-live="polite"><div className="pl-loading-box"><span className="pl-dots">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ transform: `rotate(${i * 45}deg) translate(0, -22px)`, animationDelay: `${i * 0.12}s` }} />)}</span><span>{text}</span></div></div>;
}

export function PlModal({ title, warn, children, onCancel, onContinue, continueLabel = 'CONTINUE', cancelLabel = 'CANCEL', wide, extraLeft }: { title: string; warn?: boolean; children: ReactNode; onCancel?: () => void; onContinue?: () => void; continueLabel?: string; cancelLabel?: string; wide?: boolean; extraLeft?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && onCancel) onCancel(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCancel]);
  return <div className="pl-modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
    <div className={`pl-modal ${wide ? 'wide' : ''}`} ref={ref} tabIndex={-1}>
      <h2>{warn && <AlertTriangle className="pl-status warn" size={18} />} {title}</h2>
      <div className="pl-modal-body">{children}</div>
      {(onCancel || onContinue || extraLeft) && <div className="pl-modal-actions"><div>{extraLeft}{onCancel && <button type="button" className="pl-btn outline" onClick={onCancel}>{cancelLabel}</button>}</div>{onContinue && <button type="button" className="pl-btn" onClick={onContinue}>{continueLabel}</button>}</div>}
    </div>
  </div>;
}

/** mm / dd / yyyy as one masked input; stores ISO yyyy-mm-dd. */
export function DateInput({ value, onChange, label, invalid }: { value: string; onChange: (iso: string) => void; label: string; invalid?: boolean }) {
  const [text, setText] = useState(value ? `${value.slice(5, 7)}/${value.slice(8, 10)}/${value.slice(0, 4)}` : '');
  useEffect(() => { setText(value ? `${value.slice(5, 7)}/${value.slice(8, 10)}/${value.slice(0, 4)}` : ''); }, [value]);
  const change = (raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 8);
    const t = d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    setText(t);
    if (d.length === 8) {
      const iso = `${d.slice(4)}-${d.slice(0, 2)}-${d.slice(2, 4)}`;
      const dt = new Date(`${iso}T12:00:00`);
      onChange(!Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === iso ? iso : '');
    } else if (!d) onChange('');
  };
  return <span className="pl-date"><input aria-label={label} value={text} onChange={(e) => change(e.target.value)} placeholder="mm/dd/yyyy" inputMode="numeric" className={invalid ? 'bad' : ''} /><small>(mm/dd/yyyy)</small></span>;
}
