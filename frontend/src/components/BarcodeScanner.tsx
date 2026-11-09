import { useEffect, useRef, useState } from 'react';
import { Camera, X, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
  onScan: (code: string) => void;
  onClose: () => void;
}

const isTouchDevice = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

export function BarcodeScanner({ onScan, onClose }: Props) {
  const { t, language } = useTranslation();
  const fr = language === 'fr';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<'camera' | 'manual'>(isTouchDevice() ? 'camera' : 'manual');
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState('');
  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    if (mode !== 'camera') return;
    let cancelled = false;
    let controls: { stop: () => void } | null = null;
    let lastCode = '';

    const startCamera = async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (cancelled || !videoRef.current) return;
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current,
          (result) => {
            if (!result || cancelled) return;
            const code = result.getText().trim();
            if (!code || code === lastCode) return;
            lastCode = code;
            navigator.vibrate?.(80);
            onScanRef.current(code);
            setTimeout(() => { lastCode = ''; }, 2000);
          },
        );
        if (cancelled) controls.stop();
      } catch {
        if (cancelled) return;
        setCameraError(fr ? 'Impossible d\'accéder à la caméra. Autorisez la caméra ou tapez le code.' : 'Cannot access the camera. Allow the camera or type the code.');
        setMode('manual');
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [mode, fr]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm font-bold">{fr ? 'Scanner code-barres' : 'Barcode scanner'}</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4">
          {/* Mode tabs */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setMode('manual')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                mode === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <Keyboard className="w-4 h-4" /> {fr ? 'Manuel' : 'Manual'}
            </button>
            <button
              onClick={() => setMode('camera')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                mode === 'camera'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <Camera className="w-4 h-4" /> {fr ? 'Caméra' : 'Camera'}
            </button>
          </div>

          {mode === 'camera' ? (
            <div className="relative">
              <>
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="w-full rounded-lg bg-black"
                    style={{ maxHeight: '300px', objectFit: 'cover' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-32 border-2 border-kabrak-500 rounded-lg opacity-50" />
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    {fr ? 'Placez le code-barres dans le cadre' : 'Place the barcode in the frame'}
                  </p>
              </>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              {cameraError && <p className="text-xs text-red-500">{cameraError}</p>}
              <div>
                <label className="text-sm font-medium mb-1 block">{fr ? 'Code-barres / SKU' : 'Barcode / SKU'}</label>
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder={fr ? 'Entrez ou scannez le code...' : 'Enter or scan the code...'}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={!manualCode.trim()}>
                {t('common.confirm')}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
