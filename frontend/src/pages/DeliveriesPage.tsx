import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/i18n/useTranslation';
import { formatDate } from '@/lib/utils';
import { Truck } from 'lucide-react';
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

export function DeliveriesPage() {
  const { t } = useTranslation();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeliveries = useCallback(async () => {
    try { const { data } = await api.get('/deliveries'); setDeliveries(data.data); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('delivery.title')}</h1>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kabrak-500" /></div>
      ) : deliveries.length === 0 ? (
        <div className="text-center py-12"><Truck className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">{t('common.noResults')}</p></div>
      ) : (
        <div className="space-y-3">
          {deliveries.map((del) => (
            <Card key={del.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{del.order?.reference}</p>
                  <p className="text-xs text-muted-foreground">{del.client?.name} · {del.address}</p>
                  {del.deliveryDate && <p className="text-xs text-muted-foreground">{t('delivery.deliveryDate')}: {formatDate(del.deliveryDate)}</p>}
                </div>
                <Badge variant={statusColors[del.status]}>{del.status.replace('_', ' ')}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
