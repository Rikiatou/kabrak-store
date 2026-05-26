import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';
import { formatDate } from '@/lib/utils';
import { Truck, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '@/lib/api';

interface Delivery {
  id: string; status: string; address: string; phone?: string;
  deliveryDate?: string; deliveredAt?: string;
  order?: { reference: string; id: string };
  client?: { name: string } | null;
}

interface Order {
  id: string; reference: string; status: string;
  client?: { name: string } | null;
}

const statusColors: Record<string, 'default' | 'warning' | 'success' | 'destructive'> = {
  PENDING: 'warning', PICKED_UP: 'default', IN_TRANSIT: 'default', DELIVERED: 'success', FAILED: 'destructive',
};

export function DeliveriesPage() {
  const { t, language } = useTranslation();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');

  const fetchDeliveries = useCallback(async () => {
    try { const { data } = await api.get('/deliveries'); setDeliveries(data.data); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  const fetchOrders = useCallback(async () => {
    try { const { data } = await api.get('/orders'); setOrders(data.data); }
    catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchDeliveries(); fetchOrders(); }, [fetchDeliveries, fetchOrders]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/deliveries', { orderId: selectedOrder, address, phone, deliveryDate, notes });
      setShowForm(false);
      setSelectedOrder('');
      setAddress('');
      setPhone('');
      setDeliveryDate('');
      setNotes('');
      fetchDeliveries();
    } catch (err) {
      console.error(err);
      alert(language === 'fr' ? 'Erreur lors de la création' : 'Error creating delivery');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/deliveries/${id}`, { status });
      fetchDeliveries();
    } catch (err) {
      console.error(err);
      alert(language === 'fr' ? 'Erreur lors de la mise à jour' : 'Error updating status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('delivery.title')}</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> {language === 'fr' ? 'Nouvelle livraison' : 'New delivery'}</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-bold">{language === 'fr' ? 'Créer une livraison' : 'Create delivery'}</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">{language === 'fr' ? 'Commande' : 'Order'}</label>
                <select
                  value={selectedOrder}
                  onChange={(e) => setSelectedOrder(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  required
                >
                  <option value="">{language === 'fr' ? 'Sélectionner une commande' : 'Select an order'}</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>{o.reference} - {o.client?.name || 'No client'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{language === 'fr' ? 'Adresse' : 'Address'}</label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{language === 'fr' ? 'Téléphone' : 'Phone'}</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{language === 'fr' ? 'Date de livraison' : 'Delivery date'}</label>
                <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{language === 'fr' ? 'Notes' : 'Notes'}</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button type="submit">{language === 'fr' ? 'Créer' : 'Create'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kabrak-500" /></div>
      ) : deliveries.length === 0 ? (
        <div className="text-center py-12"><Truck className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">{t('common.noResults')}</p></div>
      ) : (
        <div className="space-y-3">
          {deliveries.map((del) => (
            <Card key={del.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold">{del.order?.reference}</p>
                    <p className="text-xs text-muted-foreground">{del.client?.name} · {del.address}</p>
                    {del.deliveryDate && <p className="text-xs text-muted-foreground">{t('delivery.deliveryDate')}: {formatDate(del.deliveryDate)}</p>}
                  </div>
                  <Badge variant={statusColors[del.status]}>{del.status.replace('_', ' ')}</Badge>
                </div>
                <div className="flex gap-2 mt-3">
                  {del.status === 'PENDING' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(del.id, 'PICKED_UP')}>
                        <Clock className="w-3 h-3 mr-1" /> {language === 'fr' ? 'Ramassé' : 'Picked up'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(del.id, 'IN_TRANSIT')}>
                        <Truck className="w-3 h-3 mr-1" /> {language === 'fr' ? 'En transit' : 'In transit'}
                      </Button>
                    </>
                  )}
                  {del.status === 'IN_TRANSIT' && (
                    <Button size="sm" onClick={() => updateStatus(del.id, 'DELIVERED')}>
                      <CheckCircle className="w-3 h-3 mr-1" /> {language === 'fr' ? 'Livré' : 'Delivered'}
                    </Button>
                  )}
                  {del.status !== 'DELIVERED' && del.status !== 'FAILED' && (
                    <Button size="sm" variant="destructive" onClick={() => updateStatus(del.id, 'FAILED')}>
                      <XCircle className="w-3 h-3 mr-1" /> {language === 'fr' ? 'Échec' : 'Failed'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
