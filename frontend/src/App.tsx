import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { OrdersPage } from './pages/OrdersPage';
import { ClientsPage } from './pages/ClientsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { DeliveriesPage } from './pages/DeliveriesPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ReportsPage } from './pages/ReportsPage';
import { BillingPage } from './pages/BillingPage';
import { LoyaltyPage } from './pages/LoyaltyPage';
import { StoresPage } from './pages/StoresPage';
import { POSPage } from './pages/POSPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ServicesPage } from './pages/ServicesPage';
import { RecurringPage } from './pages/RecurringPage';
import { SettingsPage } from './pages/SettingsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { useAuthStore } from './stores/authStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ModeGuard({ mode, children }: { mode: 'PRODUCT' | 'SERVICE'; children: React.ReactNode }) {
  const tenant = useAuthStore((s) => s.tenant);
  const businessMode = tenant?.businessMode || 'PRODUCT';
  if (businessMode !== mode) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PlanGuard({ plans, children }: { plans: string[]; children: React.ReactNode }) {
  const tenant = useAuthStore((s) => s.tenant);
  const plan = tenant?.plan || 'STORE';
  if (plans.includes(plan)) return <>{children}</>;

  const whatsappLink = `https://wa.me/237600000000?text=${encodeURIComponent('Bonjour, je voudrais upgrader mon plan KABRAK Store vers SHOP pour accéder au stock et à la caisse.')}`;

  const featuresMap: Record<string, string[]> = {
    '/products': ['Catalogue produits', 'Gestion stock par taille/couleur', 'Alertes stock faible'],
    '/categories': ['Catégories de produits', 'Organisation du catalogue'],
    '/deliveries': ['Gestion des livraisons', 'Suivi commandes livrées'],
    '/loyalty': ['Programme fidélité', 'Points & récompenses clients'],
    '/pos': ['Caisse enregistreuse POS', 'Scan produit', 'Ticket immédiat'],
    '/employees': ['Gestion des employés', 'Accès multi-utilisateurs'],
    '/reports': ['Rapports avancés', 'Bénéfice net', 'Top clients & périodes'],
  };

  const path = window.location.pathname;
  const features = featuresMap[path] || ['Cette fonctionnalité avancée'];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
        <span className="text-3xl">🔒</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Fonctionnalité KABRAK SHOP
      </h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs">
        Votre plan actuel <span className="font-semibold text-gray-700 dark:text-gray-300">{plan}</span> ne comprend pas cette section.
        Passez à <span className="font-semibold text-amber-600">KABRAK SHOP</span> pour débloquer :
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
          💬 Passer à SHOP — 7 900 FCFA/mois
        </a>
        <a href="/billing" className="block w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground text-center hover:bg-accent transition-colors">
          Voir mon abonnement
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
  }, [token, fetchMe]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          {/* Product mode routes */}
          <Route path="/products" element={<ModeGuard mode="PRODUCT"><PlanGuard plans={['SHOP','BUSINESS']}><ProductsPage /></PlanGuard></ModeGuard>} />
          <Route path="/orders" element={<ModeGuard mode="PRODUCT"><OrdersPage /></ModeGuard>} />
          <Route path="/categories" element={<ModeGuard mode="PRODUCT"><PlanGuard plans={['SHOP','BUSINESS']}><CategoriesPage /></PlanGuard></ModeGuard>} />
          <Route path="/deliveries" element={<ModeGuard mode="PRODUCT"><PlanGuard plans={['SHOP','BUSINESS']}><DeliveriesPage /></PlanGuard></ModeGuard>} />
          <Route path="/loyalty" element={<ModeGuard mode="PRODUCT"><PlanGuard plans={['SHOP','BUSINESS']}><LoyaltyPage /></PlanGuard></ModeGuard>} />
          <Route path="/pos" element={<ModeGuard mode="PRODUCT"><PlanGuard plans={['SHOP','BUSINESS']}><POSPage /></PlanGuard></ModeGuard>} />
          {/* Service mode routes */}
          <Route path="/projects" element={<ModeGuard mode="SERVICE"><ProjectsPage /></ModeGuard>} />
          <Route path="/services" element={<ModeGuard mode="SERVICE"><ServicesPage /></ModeGuard>} />
          <Route path="/recurring" element={<ModeGuard mode="SERVICE"><RecurringPage /></ModeGuard>} />
          {/* Shared routes */}
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/employees" element={<PlanGuard plans={['SHOP','BUSINESS']}><EmployeesPage /></PlanGuard>} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/stores" element={<StoresPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
