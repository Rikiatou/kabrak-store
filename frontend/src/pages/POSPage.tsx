import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { cn, formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import { Search, Plus, Minus, Trash2, ShoppingCart, ScanLine, User, CreditCard, Banknote, Smartphone, Landmark, X, Package, FileText } from 'lucide-react';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import api from '@/lib/api';
import { cacheGet, cacheSet, isNetworkError, newOfflineId, queueSale } from '@/lib/offline';
import { VariantPicker, type ProductVariant } from '@/components/VariantPicker';

interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  totalStock: number;
  image?: string;
  businessType: string;
  variants?: ProductVariant[] | null;
}

interface CartItem {
  product: Product;
  quantity: number;
  variant?: string;
}

interface Client {
  id: string;
  name: string;
  phone?: string;
}

// Must match the backend order schema's paymentMethod enum.
type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'OTHER';

export function POSPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const tenant = useAuthStore((s) => s.tenant);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [lastOrder, setLastOrder] = useState<{ id: string; reference: string } | null>(null);
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountPaid, setAmountPaid] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  const canScan = tenant?.plan === 'SHOP' || tenant?.plan === 'BUSINESS';

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get('/products', { params: { search, limit: 50, isService: false } });
      setProducts(data.data || []);
      if (!search) cacheSet('pos_products', data.data || []);
    } catch (err) {
      const cached = isNetworkError(err) ? cacheGet<Product[]>('pos_products') : null;
      if (cached) {
        const q = search.toLowerCase();
        setProducts(q ? cached.filter((p) => p.name.toLowerCase().includes(q)) : cached);
        if (!search) toast(t('offline.cachedData'), { id: 'pos-offline' });
      } else {
        toast.error(getErrorMessage(err, t('common.loadError')));
      }
    }
    finally { setLoadingProducts(false); }
  }, [search, t]);

  const fetchClients = useCallback(async () => {
    try {
      const { data } = await api.get('/clients', { params: { search: clientSearch, limit: 20 } });
      setClients(data.data || []);
      if (!clientSearch) cacheSet('pos_clients', data.data || []);
    } catch (err) {
      const cached = isNetworkError(err) ? cacheGet<Client[]>('pos_clients') : null;
      if (cached) {
        const q = clientSearch.toLowerCase();
        setClients(q ? cached.filter((c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q)) : cached);
      } else {
        toast.error(getErrorMessage(err, t('common.loadError')));
      }
    }
  }, [clientSearch, t]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { if (showClientPicker) fetchClients(); }, [showClientPicker, fetchClients]);

  const cartKey = (item: CartItem) => `${item.product.id}|${item.variant || ''}`;
  const stockFor = (item: CartItem) =>
    item.variant ? item.product.variants?.find((v) => v.name === item.variant)?.stock ?? 0 : item.product.totalStock;

  const addToCart = (product: Product, variant?: string) => {
    if (product.variants?.length && !variant) { setVariantProduct(product); return; }
    const key = `${product.id}|${variant || ''}`;
    setCart(prev => {
      const existing = prev.find(item => cartKey(item) === key);
      if (existing) {
        if (existing.quantity >= stockFor(existing)) return prev;
        return prev.map(item => cartKey(item) === key ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1, variant }];
    });
  };

  const updateQuantity = (key: string, delta: number) => {
    setCart(prev => prev
      .map(item => {
        if (cartKey(item) !== key) return item;
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > stockFor(item)) return item;
        return { ...item, quantity: newQty };
      })
      .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (key: string) => {
    setCart(prev => prev.filter(item => cartKey(item) !== key));
  };

  const clearCart = async () => {
    if (await confirm({ title: t('pos.clearConfirm'), confirmLabel: t('pos.clear') })) setCart([]);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);
  const change = amountPaid > total ? amountPaid - total : 0;
  const remaining = amountPaid > 0 && amountPaid < total ? total - amountPaid : 0;
  const paymentStatus = amountPaid >= total ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'PENDING';
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  const handleBarcodeScan = async (code: string) => {
    try {
      const { data } = await api.get(`/products/barcode/${code}`);
      if (data.data) {
        addToCart(data.data);
        setShowScanner(false);
      }
    } catch {
      toast.error(t('pos.productNotFound'));
    }
  };

  const resetSale = () => {
    setCart([]);
    setSelectedClient(null);
    setAmountPaid(0);
    setDiscount(0);
    setNotes('');
  };

  // Mirror the server's stock deduction locally so the offline catalogue stays accurate.
  const deductLocalStock = (sold: CartItem[]) => {
    const apply = (list: Product[]) => list.map((p) => {
      const lines = sold.filter((i) => i.product.id === p.id);
      if (!lines.length) return p;
      const qty = lines.reduce((sum, i) => sum + i.quantity, 0);
      return {
        ...p,
        totalStock: Math.max(0, p.totalStock - qty),
        variants: p.variants?.map((v) => {
          const vq = lines.filter((i) => i.variant === v.name).reduce((sum, i) => sum + i.quantity, 0);
          return vq ? { ...v, stock: Math.max(0, v.stock - vq) } : v;
        }) ?? p.variants,
      };
    });
    setProducts((prev) => apply(prev));
    const cached = cacheGet<Product[]>('pos_products');
    if (cached) cacheSet('pos_products', apply(cached));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    // Same id online and in the offline queue: if the response is lost after the server saved the sale, the replay is deduplicated.
    const offlineId = newOfflineId();
    const payload = {
      offlineId,
      clientId: selectedClient?.id || null,
      paymentMethod,
      amountPaid: Math.min(amountPaid, total),
      discount: Math.min(discount, subtotal),
      notes: notes || undefined,
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.sellingPrice,
        variant: item.variant || undefined,
      })),
    };
    const saveOffline = () => {
      queueSale(payload, total, offlineId);
      deductLocalStock(cart);
      toast.success(t('offline.saleQueued'));
      setLastOrder(null);
      resetSale();
    };
    try {
      if (!navigator.onLine) {
        saveOffline();
      } else {
        const { data } = await api.post('/orders', payload);
        toast.success(t('pos.saleRecorded'));
        setLastOrder({ id: data.data.id, reference: data.data.reference });
        resetSale();
        fetchProducts();
      }
    } catch (err) {
      if (isNetworkError(err)) saveOffline();
      else toast.error(getErrorMessage(err, t('pos.saleError')));
    }
    setProcessing(false);
  };

  const createInvoiceForLastOrder = async () => {
    if (!lastOrder) return;
    try {
      await api.post('/invoices', { orderId: lastOrder.id });
      toast.success(t('orders.invoiceCreated'));
      navigate('/invoices');
    } catch (err) { toast.error((err as { response?: { status?: number } })?.response?.status === 400 ? t('invoices.alreadyCreated') : getErrorMessage(err, t('common.error'))); }
  };

  const paymentOptions: { key: PaymentMethod; icon: typeof Banknote; label: string }[] = [
    { key: 'CASH', icon: Banknote, label: t('payment.CASH') },
    { key: 'MOBILE_MONEY', icon: Smartphone, label: t('payment.MOBILE_MONEY') },
    { key: 'BANK_TRANSFER', icon: Landmark, label: t('payment.BANK_TRANSFER') },
    { key: 'OTHER', icon: CreditCard, label: t('payment.OTHER') },
  ];

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-7rem)] lg:flex-row lg:overflow-hidden">
      {/* Products */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-3 flex items-center gap-2 sm:mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t('pos.searchProduct')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {canScan && (
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setShowScanner(true)} aria-label={t('pos.scan')} title={t('pos.scan')}>
              <ScanLine className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="min-h-0 flex-1 lg:overflow-y-auto">
          {!loadingProducts && products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
              <Package className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{search ? t('common.noResults') : t('pos.noProducts')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => {
                const inCart = cart.find(item => item.product.id === product.id);
                const isOutOfStock = product.totalStock <= 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    disabled={isOutOfStock}
                    className={cn(
                      'rounded-xl border bg-card p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isOutOfStock ? 'cursor-not-allowed opacity-50' : 'hover:border-primary/40 hover:shadow-sm',
                      inCart && 'border-primary bg-primary/5'
                    )}
                  >
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className={cn('mt-0.5 text-xs', isOutOfStock ? 'text-destructive' : 'text-muted-foreground')}>
                      {isOutOfStock ? t('pos.outOfStock') : `${product.totalStock} ${t('pos.inStock')}`}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm font-bold text-primary">{formatCurrency(product.sellingPrice)}</p>
                      {inCart && (
                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                          {inCart.quantity}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="flex min-h-0 w-full flex-col rounded-xl border bg-card shadow-sm lg:w-80 xl:w-96">
        {lastOrder && cart.length === 0 && (
          <div className="flex items-center justify-between gap-2 border-b bg-success/10 px-4 py-2.5 text-sm">
            <span className="truncate">{t('pos.lastSale', { ref: lastOrder.reference })}</span>
            <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={createInvoiceForLastOrder}>
              <FileText className="mr-1.5 h-3.5 w-3.5" /> {t('orders.createInvoice')}
            </Button>
          </div>
        )}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="h-5 w-5 text-primary" />
              {t('pos.cart')}
              {itemCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{itemCount}</span>
              )}
            </h2>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart} className="h-7 text-xs text-destructive hover:text-destructive">
                {t('pos.clear')}
              </Button>
            )}
          </div>

          <div className="mt-3">
            {selectedClient ? (
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium">{selectedClient.name}</span>
                </div>
                <button onClick={() => setSelectedClient(null)} className="text-muted-foreground hover:text-destructive" aria-label={t('pos.removeClient')} title={t('pos.removeClient')}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClientPicker(true)}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                <User className="h-4 w-4" />
                {t('pos.addClient')}
              </button>
            )}
          </div>
        </div>

        <div className="max-h-72 flex-1 space-y-2 overflow-y-auto p-4 lg:max-h-none">
          {cart.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <ShoppingCart className="mx-auto mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">{t('pos.cartEmpty')}</p>
              <p className="text-xs">{t('pos.cartEmptyHint')}</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={cartKey(item)} className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.product.name}{item.variant && <span className="text-muted-foreground"> · {item.variant}</span>}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.product.sellingPrice)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(cartKey(item), -1)} aria-label={t('pos.decrease')}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(cartKey(item), 1)} aria-label={t('pos.increase')}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <p className="w-20 text-right text-sm font-semibold">{formatCurrency(item.product.sellingPrice * item.quantity)}</p>
                <button onClick={() => removeFromCart(cartKey(item))} className="p-1 text-muted-foreground hover:text-destructive" aria-label={t('pos.remove')} title={t('pos.remove')}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3 border-t p-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{t('common.subtotal')}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="pos-discount" className="mb-0 font-normal text-muted-foreground">{t('common.discount')}</Label>
              <Input
                id="pos-discount"
                type="number" min={0} inputMode="numeric" className="ml-auto h-8 w-28 text-right text-sm"
                value={discount || ''} onChange={(e) => setDiscount(Math.max(0, +e.target.value))}
              />
            </div>
            <div className="flex justify-between border-t pt-2 text-lg font-bold">
              <span>{t('common.total')}</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          <div role="radiogroup" aria-label={t('pos.paymentMethod')} className="grid grid-cols-2 gap-2">
            {paymentOptions.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                role="radio"
                aria-checked={paymentMethod === key}
                onClick={() => setPaymentMethod(key)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
                  paymentMethod === key ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          <div>
            <Label htmlFor="pos-paid" className="text-xs font-normal text-muted-foreground">{t('pos.amountReceived')}</Label>
            <div className="flex gap-2">
              <Input
                id="pos-paid"
                type="number" min={0} inputMode="numeric"
                value={amountPaid || ''}
                onChange={(e) => setAmountPaid(Math.max(0, +e.target.value))}
                className="flex-1"
              />
              <Button variant="outline" onClick={() => setAmountPaid(total)} disabled={total === 0}>
                {t('pos.exact')}
              </Button>
            </div>
            {change > 0 && (
              <p className="mt-1 text-xs font-medium text-success">{t('pos.change')} : {formatCurrency(change)}</p>
            )}
            {remaining > 0 && (
              <p className="mt-1 text-xs font-medium text-warning">{t('pos.remaining')} : {formatCurrency(remaining)}</p>
            )}
          </div>

          <Button className="h-12 w-full text-base font-semibold" disabled={cart.length === 0 || processing} onClick={handleCheckout}>
            {processing ? t('pos.processing') : (
              <span className="flex items-center gap-2">
                {t('pos.completeSale')}
                {cart.length > 0 && <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-medium">{t(`status.${paymentStatus}`)}</span>}
              </span>
            )}
          </Button>
        </div>
      </div>

      <Dialog open={showClientPicker} onOpenChange={setShowClientPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('pos.selectClient')}</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder={t('common.search')} value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} autoFocus />
          </div>
          <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
            {clients.map(client => (
              <button
                key={client.id}
                onClick={() => { setSelectedClient(client); setShowClientPicker(false); }}
                className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent"
              >
                <p className="text-sm font-medium">{client.name}</p>
                {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
              </button>
            ))}
            {clients.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">{t('common.noResults')}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <VariantPicker
        productName={variantProduct?.name}
        variants={variantProduct?.variants}
        onClose={() => setVariantProduct(null)}
        onPick={(v) => { if (variantProduct) addToCart(variantProduct, v.name); setVariantProduct(null); }}
      />

      {showScanner && (
        <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}
