import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';

export interface ProductVariant {
  name: string;
  stock: number;
}

interface Props {
  productName?: string;
  variants: ProductVariant[] | null | undefined;
  onPick: (variant: ProductVariant) => void;
  onClose: () => void;
}

export function VariantPicker({ productName, variants, onPick, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <Dialog open={!!variants} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('pos.chooseVariant')}{productName ? ` · ${productName}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {(variants || []).map((v) => {
            const out = v.stock <= 0;
            return (
              <button
                key={v.name}
                type="button"
                disabled={out}
                onClick={() => onPick(v)}
                className={cn(
                  'rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  out ? 'cursor-not-allowed opacity-50' : 'hover:border-primary hover:bg-accent'
                )}
              >
                <p className="text-sm font-semibold">{v.name}</p>
                <p className={cn('text-xs', out ? 'text-destructive' : 'text-muted-foreground')}>
                  {out ? t('pos.outOfStock') : `${v.stock} ${t('pos.inStock')}`}
                </p>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
