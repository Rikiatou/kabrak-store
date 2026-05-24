import { useCallback } from 'react';
import { translations } from './translations';
import type { Language } from './translations';
import { useAuthStore } from '../stores/authStore';

export function useTranslation() {
  const language = useAuthStore((s) => s.language);

  const t = useCallback(
    (key: string): string => {
      const keys = key.split('.');
      let result: unknown = translations[language as Language] || translations.fr;

      for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
          result = (result as Record<string, unknown>)[k];
        } else {
          return key;
        }
      }

      return typeof result === 'string' ? result : key;
    },
    [language]
  );

  return { t, language };
}
