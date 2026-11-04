import axios from 'axios';

/**
 * Extracts a human-readable message from an axios/unknown error.
 * Prefers the backend's `response.data.message`, then axios message, then a fallback.
 */
const CODE_MESSAGES: Record<string, { fr: string; en: string }> = {
  PLAN_REQUIRED: {
    fr: 'Cette fonction nécessite une offre supérieure. Changez d’offre dans Abonnement.',
    en: 'This feature requires a higher plan. Upgrade in Billing.',
  },
  AI_UNAVAILABLE: {
    fr: 'Le rapport IA est indisponible pour le moment. Réessayez plus tard.',
    en: 'The AI report is unavailable right now. Please try again later.',
  },
};

export function getApiErrorMessage(err: unknown, fallback = 'Une erreur est survenue'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string; code?: string } | undefined;
    const known = data?.code ? CODE_MESSAGES[data.code] : undefined;
    if (known) return localStorage.getItem('kabrak_lang') === 'en' ? known.en : known.fr;
    return data?.message || data?.error || err.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kabrak_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const path = window.location.pathname.toLowerCase();

    if (status === 401) {
      // Avoid redirect loop when already on login/register/forgot/reset pages
      const isAuthPage = path.includes('/login') || path.includes('/register') || path.includes('/forgot') || path.includes('/reset');
      if (!isAuthPage) {
        localStorage.removeItem('kabrak_token');
        window.location.href = '/login';
      }
    }

    // Subscription/trial expired — send the user to billing to renew
    const code = (error.response?.data as { code?: string } | undefined)?.code;
    const SUB_CODES = ['NO_SUBSCRIPTION', 'TRIAL_EXPIRED', 'SUBSCRIPTION_EXPIRED', 'SUBSCRIPTION_CANCELLED'];
    if (status === 403 && code && SUB_CODES.includes(code)) {
      if (!path.includes('/billing')) {
        window.location.href = '/billing';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
