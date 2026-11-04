import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/spinner';
import { useTranslation } from '@/i18n/useTranslation';
import { formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import { Truck, MapPin, Calendar } from 'lucide-react';
import api from '@/lib/api';

interface Delivery {
  id: string; status: string; address: string; phone?: string;
  deliveryDate?: string; deliveredAt?: string;
  order?: { reference: string };
  client?: { name: string } | null;
}

const statusColors: Record<string, 'default' | 'warning' | 'success' | 'destructive'> = {
  PENDING: 'warning', PICKED_UP: 'default', IN_TRANSIT: 'default', DELIVERED: 'success', FAILED: 'destructive',
};

const statusKeys: Record<string, string> = {
  PENDING: 'delivery.pending', PICKED_UP: 'delivery.pickedUp', IN_TRANSIT: 'delivery.inTransit',
  DELIVERED: 'delivery.delivered', FAILED: 'delivery.failed',
};

export function DeliveriesPage() {
  const { t } = useTranslation();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeliveries = useCallback(async () => {
    try { const { data } = await api.get('/deliveries'); setDeliveries(data.data); }
    catch (err) { toast.error(getErrorMessage(err, t('common.loadError'))); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('delivery.title')} />

      {loading ? (
        <LoadingState />
      ) : deliveries.length === 0 ? (
        <EmptyState icon={Truck} title={t('delivery.empty')} description={t('delivery.emptyDesc')} />
      ) : (
        <div className="space-y-3">
          {deliveries.map((del) => (
            <Card key={del.id}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{del.order?.reference}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{[del.client?.name, del.address].filter(Boolean).join(' · ')}</span>
                  </p>
                  {del.deliveryDate && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" /> {t('delivery.deliveryDate')} : {formatDate(del.deliveryDate)}
                    </p>
                  )}
                </div>
                <Badge variant={statusColors[del.status]} className="shrink-0">{statusKeys[del.status] ? t(statusKeys[del.status]) : del.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
