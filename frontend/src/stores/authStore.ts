import { create } from 'zustand';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Tenant {
  id: string;
  name: string;
  slug?: string;
  plan: string;
  businessMode: 'PRODUCT' | 'SERVICE';
  businessCategories: string[];
  currency?: string;
  language?: string;
  logo?: string;
  phone?: string;
  invoiceColor?: string;
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  priceMonthly: number;
  startDate: string;
  endDate: string;
  isExpired?: boolean;
  daysRemaining?: number;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  subscription: Subscription | null;
  token: string | null;
  language: string;
  theme: 'light' | 'dark';
  isLoading: boolean;
  setAuth: (data: { user: User; tenant: Tenant; token: string }) => void;
  setSubscription: (sub: Subscription) => void;
  setLanguage: (lang: string) => void;
  toggleTheme: () => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  subscription: null,
  token: localStorage.getItem('kabrak_token'),
  language: localStorage.getItem('kabrak_lang') || 'fr',
  theme: (localStorage.getItem('kabrak_theme') as 'light' | 'dark') || 'light',
  isLoading: false,

  setAuth: ({ user, tenant, token }) => {
    localStorage.setItem('kabrak_token', token);
    set({ user, tenant, token });
  },

  setSubscription: (sub) => set({ subscription: sub }),

  setLanguage: (lang) => {
    localStorage.setItem('kabrak_lang', lang);
    set({ language: lang });
  },

  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('kabrak_theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    set({ theme: newTheme });
  },

  logout: () => {
    localStorage.removeItem('kabrak_token');
    set({ user: null, tenant: null, subscription: null, token: null });
  },

  fetchMe: async () => {
    const token = get().token;
    if (!token) return;

    set({ isLoading: true });
    try {
      const { data } = await api.get('/auth/me');
      set({
        user: data.data.user,
        tenant: data.data.tenant,
        subscription: data.data.subscription,
        language: data.data.tenant.language || get().language,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem('kabrak_token');
      set({ user: null, tenant: null, token: null, isLoading: false });
    }
  },
}));
