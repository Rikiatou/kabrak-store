import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { homePathFor, navItems } from '@/lib/navItems';
import { useAuthStore } from '@/stores/authStore';
import { ALWAYS_ALLOWED, canAccess, hasFullAccess } from '@/lib/modules';
import { Header } from './Header';
import { SubscriptionBanner } from './SubscriptionBanner';

// Sends a staff account away from modules the owner did not give it (e.g. typed URL, login landing on /dashboard).
function ModuleGate({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const { pathname } = useLocation();
  if (hasFullAccess(user)) return <>{children}</>;
  const item = navItems.find((i) => pathname === i.path || pathname.startsWith(`${i.path}/`));
  if (!item || ALWAYS_ALLOWED.has(item.key) || canAccess(user, item.key)) return <>{children}</>;
  return <Navigate to={homePathFor(user, tenant)} replace />;
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64 transition-all duration-300">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <SubscriptionBanner />
        <main className="p-3 sm:p-4 md:p-6">
          <ModuleGate><Outlet /></ModuleGate>
        </main>
      </div>
    </div>
  );
}
