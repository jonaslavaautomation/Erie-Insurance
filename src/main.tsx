import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// Shared by many lazily loaded routes (quote header, buttons, cards), so load them up front.
import './quote-page.css';
import './product-page.css';
import './portal.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
