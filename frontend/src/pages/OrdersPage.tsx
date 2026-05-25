import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n/useTranslation';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Plus, ShoppingCart, X, MessageCircle } from 'lucide-react';
import api from '@/lib/api';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variant?: string;
  product: { id: string; name: string };
}

interface Order {
  id: string;
  reference: string;
  status: string;
  totalAmount: number;
  finalAmount: number;
  amountPaid: number;
  amountRemaining: number;
  paymentMethod: string;
  paymentStatus: string;
  notes?: string;
  createdAt: string;
  client?: { id: string; name: string; phone?: string } | null;
  items: OrderItem[];
  createdBy: { firstName: string; lastName: string };
}

interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  totalStock: number;
}

interface Client {
  id: string;
  name: string;
  phone?: string;
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  PENDING: 'warning', CONFIRMED: 'default', PREPARING: 'default',
  READY: 'success', DELIVERING: 'default', DELIVERED: 'success', CANCELLED: 'destructive',
  PAID: 'success', PARTIAL: 'warning',
};

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  variant?: string;
}

export function OrdersPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState(0);
  const [discount, setDiscount] = useState(0);

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/orders', { params: { limit: 50 } });
      setOrders(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const openNewOrder = async () => {
    const [prodRes, clientRes] = await Promise.all([
      api.get('/products', { params: { limit: 200 } }),
      api.get('/clients', { params: { limit: 200 } }),
    ]);
    setProducts(prodRes.data.data);
    setClients(clientRes.data.data);
    setCart([]);
    setSelectedClient('');
    setAmountPaid(0);
    setDiscount(0);
    setShowForm(true);
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: product.id, name: product.name, quantity: 1, unitPrice: product.sellingPrice }];
    });
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const finalTotal = cartTotal - discount;

  const handleCreateOrder = async () => {
    try {
      await api.post('/orders', {
        clientId: selectedClient || undefined,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, variant: i.variant })),
        discount,
        paymentMethod,
        amountPaid,
      });
      setShowForm(false);
      fetchOrders();
    } catch (err) { console.error(err); }
  };

  const handleWhatsApp = (order: Order) => {
    const phone = order.client?.phone?.replace(/\s+/g, '').replace('+', '');
    if (!phone) return;
    const items = order.items.map((i) => `${i.product.name} x${i.quantity} = ${formatCurrency(i.totalPrice)}`).join('\n');
    const message = encodeURIComponent(
      `*KABRAK - Facture*\n\nRef: ${order.reference}\n\n${items}\n\n` +
      `Total: ${formatCurrency(order.finalAmount)}\nPayé: ${formatCurrency(order.amountPaid)}\n` +
      `Reste: ${formatCurrency(order.amountRemaining)}\n\nMerci pour votre achat!`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">{t('orders.title')}</h1>
        <Button size="sm" onClick={openNewOrder}>
          <Plus className="w-4 h-4 mr-1" /> {t('orders.newOrder')}
        </Button>
      </div>

      {/* New Order Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('orders.newOrder')}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Client Selection */}
              <div>
                <label className="text-sm font-medium mb-1 block">{t('clients.title')}</label>
                <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                  <option value="">-- Client anonyme --</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                </select>
              </div>

              {/* Product selection */}
              <div>
                <label className="text-sm font-medium mb-1 block">{t('products.title')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {products.map((p) => (
                    <button key={p.id} onClick={() => addToCart(p)} type="button"
                      className="text-left p-2 border rounded-lg hover:border-kabrak-500 transition-colors cursor-pointer text-xs">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-muted-foreground">{formatCurrency(p.sellingPrice)} · Stock: {p.totalStock}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cart */}
              {cart.length > 0 && (
                <div className="border rounded-lg p-3 space-y-2">
                  {cart.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <Input type="number" className="w-16 h-8 text-center" min={1} value={item.quantity}
                          onChange={(e) => setCart((prev) => prev.map((ci, ci2) => ci2 === i ? { ...ci, quantity: +e.target.value } : ci))} />
                        <span className="w-24 text-right">{formatCurrency(item.unitPrice * item.quantity)}</span>
                        <Button variant="ghost" size="sm" onClick={() => setCart((prev) => prev.filter((_, ci2) => ci2 !== i))}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-2 space-y-1">
                    <div className="flex justify-between text-sm"><span>Sous-total</span><span>{formatCurrency(cartTotal)}</span></div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Remise</span>
                      <Input type="number" className="w-24 h-8 text-right" value={discount} onChange={(e) => setDiscount(+e.target.value)} />
                    </div>
                    <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(finalTotal)}</span></div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t('orders.paymentMethod')}</label>
                  <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="CASH">Cash</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="BANK_TRANSFER">Virement bancaire</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t('orders.paid')} (FCFA)</label>
                  <Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(+e.target.value)} />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">{t('common.cancel')}</Button>
                <Button onClick={handleCreateOrder} className="flex-1" disabled={cart.length === 0}>{t('common.save')}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kabrak-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">{t('common.noResults')}</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-sm sm:text-base">{order.reference}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.client?.name || 'Client anonyme'} · {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                    <div className="sm:text-right">
                      <p className="font-bold text-sm sm:text-base">{formatCurrency(order.finalAmount)}</p>
                      <div className="flex gap-1">
                        <Badge variant={statusColors[order.status]} className="text-[10px]">{t(`status.${order.status.toLowerCase()}`)}</Badge>
                        <Badge variant={statusColors[order.paymentStatus]} className="text-[10px]">{t(`status.${order.paymentStatus.toLowerCase()}`)}</Badge>
                      </div>
                    </div>
                    {order.client?.phone && (
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleWhatsApp(order)} title={t('orders.sendWhatsApp')}>
                        <MessageCircle className="w-4 h-4 text-green-500" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {order.items.map((item) => (
                    <span key={item.id} className="text-[10px] sm:text-xs bg-muted px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                      {item.product.name} x{item.quantity}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
