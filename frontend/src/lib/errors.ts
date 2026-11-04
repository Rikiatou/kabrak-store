import { translations, type Language } from '@/i18n/translations';
import { useAuthStore } from '@/stores/authStore';

type ErrorData = { message?: string; code?: string } & Record<string, unknown>;

/** Server message, or its translation when the API sends a known `code` (see `errors` in translations). */
export function getErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: ErrorData } })?.response?.data;
  if (data?.code) {
    const lang = useAuthStore.getState().language as Language;
    const dict = (translations[lang] || translations.fr) as { errors?: Record<string, string> };
    const template = dict.errors?.[data.code];
    if (template) return template.replace(/\{(\w+)\}/g, (m, p: string) => (data[p] !== undefined ? String(data[p]) : m));
  }
  return data?.message || fallback;
}
