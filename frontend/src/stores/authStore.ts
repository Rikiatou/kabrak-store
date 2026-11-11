import { create } from 'zustand';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  modules?: string[];
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
  address?: string;
  invoiceColor?: string;
  maxStaffDiscount?: number | null;
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

export interface Boutique {
  id: string;
  name: string;
  isMain: boolean;
  included: boolean;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  subscription: Subscription | null;
  boutiques: Boutique[];
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
  switchBoutique: (id: string) => Promise<void>;
}

const PROFILE_KEY = 'kabrak_profile';

function readCachedProfile(token: string) {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    return raw && raw.token === token ? raw.data : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  subscription: null,
  boutiques: [],
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
    localStorage.removeItem(PROFILE_KEY);
    set({ user: null, tenant: null, subscription: null, boutiques: [], token: null });
  },

  // Each boutique has its own data, so reload the whole app on the new token.
  switchBoutique: async (id) => {
    const { data } = await api.post(`/stores/${id}/switch`);
    localStorage.setItem('kabrak_token', data.data.token);
    localStorage.removeItem(PROFILE_KEY);
    window.location.assign('/dashboard');
  },

  fetchMe: async () => {
    const token = get().token;
    if (!token) return;

    // Prevent concurrent calls
    if (get().isLoading) return;

    set({ isLoading: true });
    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ token, data: data.data }));
      set({
        user: data.data.user,
        tenant: data.data.tenant,
        subscription: data.data.subscription,
        boutiques: data.data.boutiques || [],
        language: data.data.tenant.language || get().language,
        isLoading: false,
      });
    } catch (err: unknown) {
      // Only clear token on 401 (auth failure), not on transient network errors
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        localStorage.removeItem('kabrak_token');
        localStorage.removeItem(PROFILE_KEY);
        set({ user: null, tenant: null, subscription: null, boutiques: [], token: null, isLoading: false });
      } else {
        // Offline start: reuse the last profile saved for this same token
        const cached = readCachedProfile(token);
        set(cached
          ? { user: cached.user, tenant: cached.tenant, subscription: cached.subscription, boutiques: cached.boutiques || [], isLoading: false }
          : { isLoading: false });
      }
    }
  },
}));
