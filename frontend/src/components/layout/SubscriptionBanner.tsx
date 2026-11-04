import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function SubscriptionBanner() {
  const { subscription, language } = useAuthStore();
  if (!subscription?.endDate) return null;
  const fr = language === 'fr';
  const days = Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / 86_400_000));
  const isTrial = subscription.status === 'TRIAL';
  if (!isTrial && days > 3) return null;

  const text = days === 0
    ? (fr ? 'Votre accès a expiré. Payez pour continuer à vendre.' : 'Your access has expired. Pay to keep selling.')
    : isTrial
      ? (fr ? `Essai gratuit : ${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}.` : `Free trial: ${days} day${days > 1 ? 's' : ''} left.`)
      : (fr ? `Votre abonnement se termine dans ${days} jour${days > 1 ? 's' : ''}.` : `Your subscription ends in ${days} day${days > 1 ? 's' : ''}.`);

  return (
    <div className={`px-3 sm:px-6 py-2 text-sm flex items-center justify-between gap-3 ${days <= 2 ? 'bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100' : 'bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100'}`}>
      <span>{text}</span>
      <Link to="/billing" className="shrink-0 font-semibold underline">{fr ? 'Payer par Orange Money' : 'Pay with Orange Money'}</Link>
    </div>
  );
}
