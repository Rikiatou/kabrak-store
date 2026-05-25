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
          <Route path="/products" element={<ModeGuard mode="PRODUCT"><ProductsPage /></ModeGuard>} />
          <Route path="/orders" element={<ModeGuard mode="PRODUCT"><OrdersPage /></ModeGuard>} />
          <Route path="/categories" element={<ModeGuard mode="PRODUCT"><CategoriesPage /></ModeGuard>} />
          <Route path="/deliveries" element={<ModeGuard mode="PRODUCT"><DeliveriesPage /></ModeGuard>} />
          <Route path="/loyalty" element={<ModeGuard mode="PRODUCT"><LoyaltyPage /></ModeGuard>} />
          <Route path="/pos" element={<ModeGuard mode="PRODUCT"><POSPage /></ModeGuard>} />
          {/* Service mode routes */}
          <Route path="/projects" element={<ModeGuard mode="SERVICE"><ProjectsPage /></ModeGuard>} />
          <Route path="/services" element={<ModeGuard mode="SERVICE"><ServicesPage /></ModeGuard>} />
          <Route path="/recurring" element={<ModeGuard mode="SERVICE"><RecurringPage /></ModeGuard>} />
          {/* Shared routes */}
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/stores" element={<StoresPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
