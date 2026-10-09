import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PortalStoreProvider } from '@/data/store';
import { Toasts } from '@/components/ui';
import Dashboard from '@/pages/Dashboard';

// Everything beyond the dashboard loads on demand to keep the first paint small.
const QuoteSearchPage = lazy(() => import('@/QuoteSearchPage'));
const ProductSelectionPage = lazy(() => import('@/ProductSelectionPage'));
const QuoteWizard = lazy(() => import('@/pages/QuoteWizard'));
const QuotesListPage = lazy(() => import('@/pages/QuotesPages').then((m) => ({ default: m.QuotesListPage })));
const TemplatesPage = lazy(() => import('@/pages/QuotesPages').then((m) => ({ default: m.TemplatesPage })));
const CommercialQuotePage = lazy(() => import('@/pages/CommercialQuotePage'));
const CustomerSearchPage = lazy(() => import('@/pages/CustomerPages').then((m) => ({ default: m.CustomerSearchPage })));
const CustomerPage = lazy(() => import('@/pages/CustomerPages').then((m) => ({ default: m.CustomerPage })));
const PolicyPage = lazy(() => import('@/pages/PolicyPage'));
const ClaimsListPage = lazy(() => import('@/pages/ClaimsPages').then((m) => ({ default: m.ClaimsListPage })));
const ClaimReportPage = lazy(() => import('@/pages/ClaimsPages').then((m) => ({ default: m.ClaimReportPage })));
const ClaimDetailPage = lazy(() => import('@/pages/ClaimsPages').then((m) => ({ default: m.ClaimDetailPage })));
const BillingPage = lazy(() => import('@/pages/BillingPages').then((m) => ({ default: m.BillingPage })));
const PaymentPage = lazy(() => import('@/pages/BillingPages').then((m) => ({ default: m.PaymentPage })));
const AutoPayPage = lazy(() => import('@/pages/BillingPages').then((m) => ({ default: m.AutoPayPage })));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const WorkQueuePage = lazy(() => import('@/pages/WorkQueuePage'));
const info = () => import('@/pages/InfoPages');
const ContactsPage = lazy(() => info().then((m) => ({ default: m.ContactsPage })));
const ContestsPage = lazy(() => info().then((m) => ({ default: m.ContestsPage })));
const LoginPage = lazy(() => info().then((m) => ({ default: m.LoginPage })));
const NewsArchivePage = lazy(() => info().then((m) => ({ default: m.NewsArchivePage })));
const NewsArticlePage = lazy(() => info().then((m) => ({ default: m.NewsArticlePage })));
const NotFoundPage = lazy(() => info().then((m) => ({ default: m.NotFoundPage })));
const ProductGuidePage = lazy(() => info().then((m) => ({ default: m.ProductGuidePage })));
const ResourcePage = lazy(() => info().then((m) => ({ default: m.ResourcePage })));
const SearchPage = lazy(() => info().then((m) => ({ default: m.SearchPage })));

function App() {
  return <PortalStoreProvider><BrowserRouter><Suspense fallback={<div className="route-loading" role="status">Loading…</div>}><Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/search" element={<SearchPage />} />
    <Route path="/work-queue" element={<WorkQueuePage />} />

    <Route path="/quotes" element={<QuotesListPage />} />
    <Route path="/quotes/templates" element={<TemplatesPage />} />
    <Route path="/quotes/search-results" element={<QuoteSearchPage />} />
    <Route path="/quotes/select-products" element={<ProductSelectionPage />} />
    <Route path="/quotes/underwriting" element={<Navigate to="/quotes" replace />} />
    <Route path="/quotes/:quoteId/:step" element={<QuoteWizard />} />
    <Route path="/commercial/quote" element={<CommercialQuotePage />} />

    <Route path="/customers" element={<CustomerSearchPage />} />
    <Route path="/customers/:id" element={<CustomerPage />} />
    <Route path="/policies/:number" element={<PolicyPage />} />

    <Route path="/claims" element={<ClaimsListPage />} />
    <Route path="/claims/new" element={<ClaimReportPage />} />
    <Route path="/claims/:number" element={<ClaimDetailPage />} />

    <Route path="/billing" element={<BillingPage />} />
    <Route path="/billing/pay" element={<PaymentPage />} />
    <Route path="/billing/autopay" element={<AutoPayPage />} />

    <Route path="/reports" element={<Navigate to="/reports/performance" replace />} />
    <Route path="/reports/:id" element={<ReportsPage />} />
    <Route path="/products/:slug" element={<ProductGuidePage />} />
    <Route path="/resources/:slug" element={<ResourcePage />} />
    <Route path="/news" element={<NewsArchivePage />} />
    <Route path="/news/:id" element={<NewsArticlePage />} />
    <Route path="/contacts" element={<ContactsPage />} />
    <Route path="/contests" element={<ContestsPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense><Toasts /></BrowserRouter></PortalStoreProvider>;
}

export default App;
