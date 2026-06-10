import { useAuthStore } from '@/stores/authStore';

export function NotFoundPage() {
  const token = useAuthStore((s) => s.token);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-8xl font-black text-gray-200 dark:text-gray-700 select-none">404</p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-2 mb-1">Page introuvable</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <a
          href={token ? '/dashboard' : '/'}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          {token ? 'Retour au tableau de bord' : "Retour à l'accueil"}
        </a>
      </div>
    </div>
  );
}
