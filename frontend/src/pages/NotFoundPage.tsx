import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/i18n/useTranslation';

export function NotFoundPage() {
  const token = useAuthStore((s) => s.token);
  const { language } = useTranslation();
  const fr = language === 'fr';
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-8xl font-black text-gray-200 dark:text-gray-700 select-none">404</p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-2 mb-1">{fr ? 'Page introuvable' : 'Page not found'}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          {fr ? 'Cette page n\'existe pas ou a été déplacée.' : 'This page does not exist or has been moved.'}
        </p>
        <a
          href={token ? '/dashboard' : '/'}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          {token ? (fr ? 'Retour au tableau de bord' : 'Back to dashboard') : (fr ? 'Retour à l\'accueil' : 'Back to home')}
        </a>
      </div>
    </div>
  );
}
