import { useEffect, useRef, useState } from 'react';
import { Camera, X, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'camera' | 'manual'>('manual');
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (mode !== 'camera') return;

    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch {
        setCameraError(t('scanner.cameraError'));
        setMode('manual');
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [mode, t]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-card text-card-foreground rounded-xl border shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-sm font-semibold">{t('scanner.title')}</span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('common.close')} title={t('common.close')}>
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
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              <Keyboard className="w-4 h-4" /> {t('scanner.manual')}
            </button>
            <button
              onClick={() => setMode('camera')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                mode === 'camera'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              <Camera className="w-4 h-4" /> {t('scanner.camera')}
            </button>
          </div>

          {mode === 'camera' ? (
            <div className="relative">
              {cameraError ? (
                <div className="text-center py-8 text-sm text-destructive">{cameraError}</div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="w-full rounded-lg bg-black"
                    style={{ maxHeight: '300px', objectFit: 'cover' }}
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-32 border-2 border-primary rounded-lg opacity-60" />
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    {t('scanner.hint')}
                  </p>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label htmlFor="scan-code" className="text-sm font-medium mb-1.5 block">{t('scanner.code')}</label>
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  id="scan-code"
                  placeholder={t('scanner.placeholder')}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={!manualCode.trim()}>
                {t('scanner.search')}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
