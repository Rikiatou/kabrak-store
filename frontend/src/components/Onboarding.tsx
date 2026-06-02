import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const ONBOARDING_KEY = 'kabrak_onboarding_done';

const getSlides = (plan: string, mode: string, language: string) => {
  const fr = language === 'fr';

  const baseSlides = [
    {
      icon: '🏪',
      title: fr ? 'Bienvenue sur KABRAK Store' : 'Welcome to KABRAK Store',
      description: fr
        ? 'Gère ta boutique, ton stock, tes commandes et tes factures en un seul endroit.'
        : 'Manage your store, stock, orders and invoices in one place.',
    },
  ];

  if (mode === 'PRODUCT') {
    baseSlides.push(
      {
        icon: '📦',
        title: fr ? 'Commence par les produits' : 'Start with products',
        description: fr
          ? 'Ajoute tes produits avec leurs prix et stock. C\'est la base de ton catalogue.'
          : 'Add your products with prices and stock. This is the base of your catalog.',
      },
      {
        icon: '👥',
        title: fr ? 'Enregistre tes clients' : 'Register your clients',
        description: fr
          ? 'Crée tes clients pour suivre leur historique d\'achats et les fidéliser.'
          : 'Create your clients to track their purchase history and build loyalty.',
      },
      {
        icon: '🛒',
        title: fr ? 'Vends facilement' : 'Sell easily',
        description: fr
          ? 'Crée des commandes en quelques clics. Le stock se met à jour automatiquement.'
          : 'Create orders in a few clicks. Stock updates automatically.',
      },
      {
        icon: '📄',
        title: fr ? 'Factures professionnelles' : 'Professional invoices',
        description: fr
          ? 'Envoie des factures par WhatsApp avec ton logo. Tes clients seront impressionnés.'
          : 'Send invoices via WhatsApp with your logo. Your clients will be impressed.',
      }
    );

    if (plan === 'SHOP' || plan === 'BUSINESS') {
      baseSlides.push(
        {
          icon: '💻',
          title: fr ? 'Caisse POS' : 'POS Cash Register',
          description: fr
            ? 'Utilise la caisse pour les ventes en magasin. Scan produit, monnaie automatique.'
            : 'Use the cash register for in-store sales. Scan product, automatic change.',
        },
        {
          icon: '📊',
          title: fr ? 'Rapports détaillés' : 'Detailed reports',
          description: fr
            ? 'Analyse tes ventes, bénéfices, top clients et produits. Exporte en Excel.'
            : 'Analyze your sales, profits, top clients and products. Export to Excel.',
        }
      );
    }

    if (plan === 'BUSINESS') {
      baseSlides.push(
        {
          icon: '🏢',
          title: fr ? 'Multi-boutiques' : 'Multi-stores',
          description: fr
            ? 'Gère plusieurs points de vente depuis un seul compte. Rapports par boutique.'
            : 'Manage multiple points of sale from one account. Reports by store.',
        },
        {
          icon: '🤖',
          title: fr ? 'Rapports IA' : 'AI Reports',
          description: fr
            ? 'Analyse intelligente avec recommandations personnalisées. Pose des questions en langage naturel.'
            : 'Intelligent analysis with personalized recommendations. Ask questions in natural language.',
        }
      );
    }
  } else {
    // SERVICE mode
    baseSlides.push(
      {
        icon: '📋',
        title: fr ? 'Crée tes services' : 'Create your services',
        description: fr
          ? 'Définis tes offres de services avec prix, durée et type de facturation.'
          : 'Define your service offerings with price, duration and billing type.',
      },
      {
        icon: '📁',
        title: fr ? 'Gère tes projets' : 'Manage your projects',
        description: fr
          ? 'Crée des projets clients avec budget, jalons et suivi de paiement.'
          : 'Create client projects with budget, milestones and payment tracking.',
      },
      {
        icon: '📄',
        title: fr ? 'Facturation récurrente' : 'Recurring billing',
        description: fr
          ? 'Automatise les factures pour tes abonnements mensuels ou trimestriels.'
          : 'Automate invoices for your monthly or quarterly subscriptions.',
      },
      {
        icon: '👥',
        title: fr ? 'Enregistre tes clients' : 'Register your clients',
        description: fr
          ? 'Crée tes clients pour suivre leur historique d\'achats et les fidéliser.'
          : 'Create your clients to track their purchase history and build loyalty.',
      }
    );
  }

  return baseSlides;
};

export function Onboarding() {
  const { language, tenant } = useAuthStore();
  const fr = language === 'fr';
  const plan = tenant?.plan || 'STORE';
  const mode = tenant?.businessMode || 'PRODUCT';
  const slides = getSlides(plan, mode, language);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      setIsOpen(true);
    }
  }, []);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsOpen(false);
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏪</span>
            <span className="font-bold text-gray-900 dark:text-white">KABRAK Store</span>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <div className="text-6xl mb-6">{slides[currentSlide].icon}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {slides[currentSlide].title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {slides[currentSlide].description}
          </p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 pb-4">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentSlide ? 'bg-violet-600 w-6' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t dark:border-gray-700">
          <button
            onClick={handlePrev}
            disabled={currentSlide === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {fr ? 'Précédent' : 'Previous'}
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors"
          >
            {currentSlide === slides.length - 1 ? (
              <>
                <CheckCircle className="w-4 h-4" />
                {fr ? 'Commencer' : 'Get Started'}
              </>
            ) : (
              <>
                {fr ? 'Suivant' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
