import { useState, useEffect } from 'react';
import { X, Download, Share, Plus, Smartphone } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const DISMISSED_KEY = 'kabrak_install_dismissed';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;
}

export function InstallPrompt() {
  const { language } = useAuthStore();
  const fr = language === 'fr';

  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    if (isIOS()) {
      setTimeout(() => setShowIOS(true), 3000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as typeof deferredPrompt);
      setTimeout(() => setShowAndroid(true), 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setShowAndroid(false);
    setShowIOS(false);
  };

  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(DISMISSED_KEY, '1');
      setShowAndroid(false);
    }
    setInstalling(false);
    setDeferredPrompt(null);
  };

  if (!showAndroid && !showIOS) return null;

  return (
    <>
      {/* Android Banner */}
      {showAndroid && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
          <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/icon-192.png" alt="KABRAK" className="w-8 h-8 rounded-lg" />
                <span className="text-white font-bold text-sm">KABRAK Store</span>
              </div>
              <button onClick={dismiss} className="p-1 text-white/70 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {fr ? 'Installer l\'application' : 'Install the app'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    {fr
                      ? 'Accédez à KABRAK directement depuis votre écran d\'accueil, sans navigateur.'
                      : 'Access KABRAK directly from your home screen, no browser needed.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={dismiss}
                  className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {fr ? 'Plus tard' : 'Later'}
                </button>
                <button
                  onClick={handleInstallAndroid}
                  disabled={installing}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
                  {installing ? (fr ? 'Installation...' : 'Installing...') : (fr ? 'Installer' : 'Install')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iOS Modal */}
      {showIOS && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/icon-192.png" alt="KABRAK" className="w-10 h-10 rounded-xl" />
                <div>
                  <p className="text-white font-bold">KABRAK Store</p>
                  <p className="text-white/70 text-xs">
                    {fr ? 'Installer sur iPhone / iPad' : 'Install on iPhone / iPad'}
                  </p>
                </div>
              </div>
              <button onClick={dismiss} className="p-1.5 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center leading-relaxed">
                {fr
                  ? 'Sur iOS, voici comment ajouter KABRAK à votre écran d\'accueil :'
                  : 'On iOS, here\'s how to add KABRAK to your home screen:'}
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-blue-600 font-bold text-lg">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {fr ? 'Appuyez sur le bouton Partager' : 'Tap the Share button'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {fr ? 'L\'icône avec une flèche vers le haut en bas de Safari' : 'The icon with an upward arrow at the bottom of Safari'}
                    </p>
                  </div>
                  <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Share className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-blue-600 font-bold text-lg">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {fr ? 'Faites défiler et appuyez sur...' : 'Scroll down and tap...'}
                    </p>
                    <p className="text-xs font-semibold text-blue-600 mt-0.5">
                      {fr ? '« Sur l\'écran d\'accueil »' : '"Add to Home Screen"'}
                    </p>
                  </div>
                  <div className="w-9 h-9 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                    <Plus className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-blue-600 font-bold text-lg">3</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {fr ? 'Appuyez sur « Ajouter »' : 'Tap "Add"'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {fr ? 'KABRAK apparaît sur votre écran d\'accueil comme une vraie app !' : 'KABRAK appears on your home screen like a real app!'}
                    </p>
                  </div>
                  <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center">
                    <img src="/icon-192.png" alt="" className="w-6 h-6 rounded-md" />
                  </div>
                </div>
              </div>

              <button
                onClick={dismiss}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm hover:opacity-90 transition-all"
              >
                {fr ? 'J\'ai compris ✓' : 'Got it ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
