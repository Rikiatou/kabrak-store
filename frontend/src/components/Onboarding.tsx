import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const ONBOARDING_KEY = 'kabrak_onboarding_done';

const slides = [
  {
    icon: '🏪',
    title: 'Bienvenue sur KABRAK Store',
    description: 'Gère ta boutique, ton stock, tes commandes et tes factures en un seul endroit.',
  },
  {
    icon: '📦',
    title: 'Commence par les produits',
    description: 'Ajoute tes produits avec leurs prix et stock. C\'est la base de ton catalogue.',
  },
  {
    icon: '👥',
    title: 'Enregistre tes clients',
    description: 'Crée tes clients pour suivre leur historique d\'achats et les fidéliser.',
  },
  {
    icon: '🛒',
    title: 'Vends facilement',
    description: 'Crée des commandes en quelques clics. Le stock se met à jour automatiquement.',
  },
  {
    icon: '📄',
    title: 'Factures professionnelles',
    description: 'Envoie des factures par WhatsApp avec ton logo. Tes clients seront impressionnés.',
  },
];

export function Onboarding() {
  const { language } = useAuthStore();
  const fr = language === 'fr';
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
