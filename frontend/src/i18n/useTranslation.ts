import { useCallback } from 'react';
import { translations } from './translations';
import type { Language } from './translations';
import { useAuthStore } from '../stores/authStore';

export function useTranslation() {
  const language = useAuthStore((s) => s.language);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let result: unknown = translations[language as Language] || translations.fr;

      for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
          result = (result as Record<string, unknown>)[k];
        } else {
          return key;
        }
      }

      if (typeof result !== 'string') return key;
      if (!params) return result;
      return result.replace(/\{(\w+)\}/g, (m, p: string) => (p in params ? String(params[p]) : m));
    },
    [language]
  );

  return { t, language };
}
