import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { InstallPrompt } from './components/InstallPrompt';
import { Onboarding } from './components/Onboarding';
import { useAuthStore } from './stores/authStore';
import { useTranslation } from './i18n/useTranslation';

// Lazy-load authenticated pages to reduce initial bundle size
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const OrdersPage = lazy(() => import('./pages/OrdersPage').then(m => ({ default: m.OrdersPage })));
const ClientsPage = lazy(() => import('./pages/ClientsPage').then(m => ({ default: m.ClientsPage })));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage').then(m => ({ default: m.InvoicesPage })));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage').then(m => ({ default: m.EmployeesPage })));
const DeliveriesPage = lazy(() => import('./pages/DeliveriesPage').then(m => ({ default: m.DeliveriesPage })));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const BillingPage = lazy(() => import('./pages/BillingPage').then(m => ({ default: m.BillingPage })));
const LoyaltyPage = lazy(() => import('./pages/LoyaltyPage').then(m => ({ default: m.LoyaltyPage })));
const StoresPage = lazy(() => import('./pages/StoresPage').then(m => ({ default: m.StoresPage })));
const POSPage = lazy(() => import('./pages/POSPage').then(m => ({ default: m.POSPage })));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const ServicesPage = lazy(() => import('./pages/ServicesPage').then(m => ({ default: m.ServicesPage })));
const RecurringPage = lazy(() => import('./pages/RecurringPage').then(m => ({ default: m.RecurringPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage').then(m => ({ default: m.ExpensesPage })));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const StorefrontPage = lazy(() => import('./pages/StorefrontPage').then(m => ({ default: m.StorefrontPage })));
const PublicOrderPage = lazy(() => import('./pages/PublicOrderPage').then(m => ({ default: m.PublicOrderPage })));
const AIReportsPage = lazy(() => import('./pages/AIReportsPage').then(m => ({ default: m.AIReportsPage })));
const GuidePage = lazy(() => import('./pages/GuidePage').then(m => ({ default: m.GuidePage })));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen text-gray-500">Loading…</div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const isLoading = useAuthStore((s) => s.isLoading);
  if (!token) return <Navigate to="/login" replace />;
  if (isLoading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading…</div>;
  return <>{children}</>;
}

function ModeGuard({ mode, children }: { mode: 'PRODUCT' | 'SERVICE'; children: React.ReactNode }) {
  const tenant = useAuthStore((s) => s.tenant);
  const isLoading = useAuthStore((s) => s.isLoading);
  if (isLoading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading…</div>;
  const businessMode = tenant?.businessMode || 'PRODUCT';
  if (businessMode !== mode) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const ORDER_BASED_CATS = new Set([
  'CAKES', 'FOOD_BUSINESS', 'FOOD_DELIVERY', 'HOME_COOKING', 'MADE_TO_ORDER', 'WHATSAPP_SELLER',
]);

function DeliveriesGuard({ children }: { children: React.ReactNode }) {
  const tenant = useAuthStore((s) => s.tenant);
  const isOrderBased = !!(tenant?.businessCategories?.length &&
    tenant.businessCategories.every((cat) => ORDER_BASED_CATS.has(cat)));
  if (isOrderBased) return <>{children}</>;
  return <PlanGuard plans={['SHOP', 'BUSINESS']}>{children}</PlanGuard>;
}

function PlanGuard({ plans, children }: { plans: string[]; children: React.ReactNode }) {
  const tenant = useAuthStore((s) => s.tenant);
  const { language } = useTranslation();
  const fr = language === 'fr';
  const plan = tenant?.plan || 'STORE';
  if (plans.includes(plan)) return <>{children}</>;

  const whatsappLink = `https://wa.me/237653561862?text=${encodeURIComponent(fr ? 'Bonjour, je voudrais upgrader mon plan KABRAK Store vers SHOP pour accéder au stock et à la caisse.' : 'Hello, I would like to upgrade my KABRAK Store plan to SHOP to access stock and POS.')}`;

  const featuresMap: Record<string, { fr: string[]; en: string[] }> = {
    '/products': { fr: ['Catalogue produits', 'Gestion stock par taille/couleur', 'Alertes stock faible'], en: ['Product catalog', 'Stock management by size/color', 'Low stock alerts'] },
    '/categories': { fr: ['Catégories de produits', 'Organisation du catalogue'], en: ['Product categories', 'Catalog organization'] },
    '/deliveries': { fr: ['Gestion des livraisons', 'Suivi commandes livrées'], en: ['Delivery management', 'Delivered order tracking'] },
    '/loyalty': { fr: ['Programme fidélité', 'Points & récompenses clients'], en: ['Loyalty program', 'Client points & rewards'] },
    '/pos': { fr: ['Caisse enregistreuse POS', 'Scan produit', 'Ticket immédiat'], en: ['POS cash register', 'Product scanning', 'Instant receipt'] },
    '/employees': { fr: ['Gestion des employés', 'Accès multi-utilisateurs'], en: ['Employee management', 'Multi-user access'] },
    '/reports': { fr: ['Rapports avancés', 'Bénéfice net', 'Top clients & périodes'], en: ['Advanced reports', 'Net profit', 'Top clients & periods'] },
  };

  const path = window.location.pathname;
  const features = featuresMap[path]?.[language as 'fr' | 'en'] || (fr ? ['Cette fonctionnalité avancée'] : ['This advanced feature']);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
        <span className="text-3xl">🔒</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {fr ? 'Fonctionnalité KABRAK SHOP' : 'KABRAK SHOP Feature'}
      </h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs">
        {fr ? <>Votre plan actuel <span className="font-semibold text-gray-700 dark:text-gray-300">{plan}</span> ne comprend pas cette section. Passez à <span className="font-semibold text-amber-600">KABRAK SHOP</span> pour débloquer :</> : <>Your current plan <span className="font-semibold text-gray-700 dark:text-gray-300">{plan}</span> does not include this section. Upgrade to <span className="font-semibold text-amber-600">KABRAK SHOP</span> to unlock:</>}
      </p>
      <ul className="text-left space-y-2 mb-8">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 font-bold text-xs">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <div className="space-y-3 w-full max-w-xs">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors"
        >
          💬 {fr ? 'Passer à SHOP — 9 900 FCFA/mois' : 'Upgrade to SHOP — 9,900 FCFA/month'}
        </a>
        <a href="/billing" className="block w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground text-center hover:bg-accent transition-colors">
          {fr ? 'Voir mon abonnement' : 'View my subscription'}
        </a>
      </div>
    </div>
  );
}

function App() {
  const { token, fetchMe, theme } = useAuthStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (token) fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <InstallPrompt />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/storefront/:slug" element={<StorefrontPage />} />
        <Route path="/order/:token" element={<PublicOrderPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
              <Onboarding />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          {/* Product mode routes */}
          <Route path="/products" element={<ModeGuard mode="PRODUCT"><ProductsPage /></ModeGuard>} />
          <Route path="/orders" element={<ModeGuard mode="PRODUCT"><OrdersPage /></ModeGuard>} />
          <Route path="/pos" element={<ModeGuard mode="PRODUCT"><PlanGuard plans={['SHOP','BUSINESS']}><POSPage /></PlanGuard></ModeGuard>} />
          {/* SHOP+ only */}
          <Route path="/categories" element={<ModeGuard mode="PRODUCT"><PlanGuard plans={['SHOP','BUSINESS']}><CategoriesPage /></PlanGuard></ModeGuard>} />
          <Route path="/deliveries" element={<ModeGuard mode="PRODUCT"><DeliveriesGuard><DeliveriesPage /></DeliveriesGuard></ModeGuard>} />
          <Route path="/loyalty" element={<ModeGuard mode="PRODUCT"><PlanGuard plans={['SHOP','BUSINESS']}><LoyaltyPage /></PlanGuard></ModeGuard>} />
          {/* Service mode routes */}
          <Route path="/projects" element={<ModeGuard mode="SERVICE"><ProjectsPage /></ModeGuard>} />
          <Route path="/services" element={<ModeGuard mode="SERVICE"><ServicesPage /></ModeGuard>} />
          <Route path="/recurring" element={<ModeGuard mode="SERVICE"><RecurringPage /></ModeGuard>} />
          {/* Shared routes */}
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/employees" element={<PlanGuard plans={['SHOP','BUSINESS']}><EmployeesPage /></PlanGuard>} />
          <Route path="/reports" element={<PlanGuard plans={['SHOP','BUSINESS']}><ReportsPage /></PlanGuard>} />
          <Route path="/ai-reports" element={<PlanGuard plans={['SHOP','BUSINESS']}><AIReportsPage /></PlanGuard>} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/stores" element={<StoresPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/suppliers" element={<PlanGuard plans={['SHOP','BUSINESS']}><SuppliersPage /></PlanGuard>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/guide" element={<GuidePage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
