import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleHelp } from 'lucide-react';
import { HelpDrawer, ProfileMenu } from '@/components/ui';
import '@/portal.css';

export default function QuoteHeader() {
  const navigate = useNavigate();
  const [help, setHelp] = useState(false);
  return <header className="quote-topbar">
    <button className="quote-brand" onClick={() => navigate('/')} type="button" aria-label="Back to dashboard">
      <span className="quote-erie-mark">⌂</span><span className="quote-brand-name">Erie<small>Insurance</small></span>
    </button>
    <div className="quote-header-actions">
      <button type="button" className="templates-link" onClick={() => navigate('/quotes/templates')}>Templates</button>
      <button type="button" className="templates-link" onClick={() => navigate('/quotes')}>My Quotes</button>
      <ProfileMenu variant="quote" />
      <button type="button" className="help-button" aria-label="Help" onClick={() => setHelp(true)}><CircleHelp size={22} fill="#003b70" color="white" /></button>
    </div>
    {help && <HelpDrawer onClose={() => setHelp(false)} />}
  </header>;
}
