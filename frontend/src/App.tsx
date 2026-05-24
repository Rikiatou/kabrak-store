import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
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
import { useAuthStore } from './stores/authStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/deliveries" element={<DeliveriesPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/loyalty" element={<LoyaltyPage />} />
          <Route path="/stores" element={<StoresPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
