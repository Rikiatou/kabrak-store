import { useEffect, useState, useCallback } from 'react';
import { CalendarDays, MessageCircle } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import api, { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import toast from 'react-hot-toast';

interface AgendaOrder {
  id: string; reference: string; status: string; finalAmount: number; dueDate: string; notes?: string | null;
  client?: { id: string; name: string; phone?: string | null } | null;
  items: Array<{ id: string; quantity: number; variant?: string | null; product: { name: string } }>;
  invoice?: { amountPaid: number; amountDue: number; paymentStatus: string } | null;
}

export function AgendaPage() {
  const { language } = useTranslation();
  const fr = language === 'fr';
  const tenant = useAuthStore((s) => s.tenant);
  const [orders, setOrders] = useState<AgendaOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/agenda');
      setOrders(data.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markDelivered = async (id: string) => {
    try {
      await api.patch(`/orders/${id}/status`, { status: 'DELIVERED' });
      toast.success(fr ? 'Commande remise' : 'Order handed over');
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const remind = (o: AgendaOrder) => {
    const phone = (o.client?.phone || '').replace(/\D/g, '');
    const when = new Date(o.dueDate).toLocaleString(fr ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    const due = o.invoice?.amountDue || 0;
    const msg = fr
      ? `Bonjour ${o.client?.name || ''}, votre commande ${o.reference} chez ${tenant?.name || ''} est prévue ${when}.${due > 0 ? ` Reste à payer : ${formatCurrency(due)}.` : ''}`
      : `Hello ${o.client?.name || ''}, your order ${o.reference} at ${tenant?.name || ''} is scheduled ${when}.${due > 0 ? ` Remaining: ${formatCurrency(due)}.` : ''}`;
    window.open(`https://wa.me/${phone.startsWith('237') ? phone : `237${phone}`}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const groups = orders.reduce<Record<string, AgendaOrder[]>>((acc, o) => {
    const key = new Date(o.dueDate).toDateString();
    (acc[key] ||= []).push(o);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">{fr ? 'Agenda des commandes' : 'Order agenda'}</h1>
        <p className="text-sm text-muted-foreground">{fr ? 'Commandes à préparer et à remettre (gâteaux, sur commande…), 31 prochains jours' : 'Orders to prepare and hand over (cakes, made-to-order…), next 31 days'}</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-kabrak-500" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <CalendarDays className="w-14 h-14 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">{fr ? 'Aucune commande datée. Ajoutez une date de retrait dans la caisse.' : 'No dated orders. Add a pickup date at checkout.'}</p>
        </div>
      ) : (
        Object.entries(groups).map(([day, list]) => (
          <div key={day} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground capitalize">
              {new Date(list[0].dueDate).toLocaleDateString(fr ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            {list.map((o) => (
              <Card key={o.id}>
                <CardContent className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {new Date(o.dueDate).toLocaleTimeString(fr ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })} · {o.client?.name || (fr ? 'Client de passage' : 'Walk-in')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {o.items.map((i) => `${i.quantity}× ${i.product.name}${i.variant ? ` · ${i.variant}` : ''}`).join(', ')}
                    </p>
                    {o.notes && <p className="text-xs text-muted-foreground italic truncate">{o.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-xs">
                      <p className="font-semibold text-sm">{formatCurrency(o.finalAmount)}</p>
                      <p className={o.invoice && o.invoice.amountDue > 0 ? 'text-amber-600' : 'text-green-600'}>
                        {o.invoice && o.invoice.amountDue > 0
                          ? `${fr ? 'Acompte' : 'Deposit'} ${formatCurrency(o.invoice.amountPaid)}`
                          : fr ? 'Payé' : 'Paid'}
                      </p>
                    </div>
                    {o.client?.phone && (
                      <Button size="sm" variant="outline" onClick={() => remind(o)}><MessageCircle className="w-4 h-4" /></Button>
                    )}
                    {o.status !== 'DELIVERED' && (
                      <Button size="sm" onClick={() => markDelivered(o.id)}>{fr ? 'Remis' : 'Done'}</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
