import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import { Search, Plus, Minus, Trash2, ShoppingCart, ScanLine, User, CreditCard, Banknote, Smartphone, X, Lock, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { InvoiceModal } from '@/components/InvoiceModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api, { getApiErrorMessage } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import toast from 'react-hot-toast';
import { cacheGet, cacheSet, queueSale, isNetworkError, newOfflineId } from '@/lib/offline';
import { OfflineBanner } from '@/components/OfflineBanner';
import { type Sellable, hasMainRange, hasPack, isMainMode, itemLabel, mainPrice, packLabel, packUnits, priceOf, stockText, tierPrice, tieredPrice, tiersText, variantsOf } from '@/lib/variants';

interface Product extends Sellable {
  id: string;
  name: string;
  sellingPrice: number;
  totalStock: number;
  image?: string;
  businessType: string;
  adaptiveFields?: Record<string, unknown>;
  barcode?: string | null;
  sku?: string | null;
}

const matchesCode = (p: Product, code: string) => !!code && (p.barcode === code || p.sku === code || variantsOf(p).some((v) => v.barcode === code));
const variantForCode = (p: Product, code: string) => variantsOf(p).find((v) => v.barcode === code)?.name;

interface CartItem {
  product: Product;
  quantity: number;
  variant?: string;
  pack?: boolean;
}

interface Client {
  id: string;
  name: string;
  phone?: string;
}

function applyLocalSale(list: Product[], sold: CartItem[]): Product[] {
  return list.map((p) => {
    const lines = sold.filter((i) => i.product.id === p.id);
    if (lines.length === 0) return p;
    let sizes = p.adaptiveFields?.sizes as string | undefined;
    const variants = variantsOf(p).map((v) => ({ ...v }));
    let units = 0;
    for (const line of lines) {
      const n = line.quantity * packUnits(p, line.pack);
      units += n;
      if (!line.variant) continue;
      const v = variants.find((x) => x.name.toLowerCase() === line.variant!.toLowerCase());
      if (v) { v.stock -= n; continue; }
      if (!sizes) continue;
      sizes = sizes.split(',').map((part) => {
        const [k, q] = part.split(':').map((x) => x.trim());
        return k && k.toLowerCase() === line.variant!.toLowerCase() ? `${k}:${(parseInt(q) || 0) - n}` : part.trim();
      }).join(', ');
    }
    return {
      ...p,
      totalStock: p.totalStock - units,
      variants: variants.length ? variants : p.variants,
      adaptiveFields: sizes !== undefined ? { ...p.adaptiveFields, sizes } : p.adaptiveFields,
    };
  });
}

export function POSPage() {
  const { t, language } = useTranslation();
  const tenant = useAuthStore((s) => s.tenant);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [newClient, setNewClient] = useState<{ name: string; phone: string } | null>(null);
  const [savingClient, setSavingClient] = useState(false);
  const [drawerClosed, setDrawerClosed] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'BANK_TRANSFER'>('CASH');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [discount, setDiscount] = useState<number | ''>('');
  const staffMaxDiscount = useAuthStore((s) => (s.user?.role === 'OWNER' || s.user?.role === 'MANAGER' ? null : s.tenant?.maxStaffDiscount ?? null));
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<unknown>(null);
  const [variantPicker, setVariantPicker] = useState<{ product: Product; pack: boolean } | null>(null);
  const fr = language === 'fr';

  useEffect(() => {
    api.get('/cash-sessions/current').then((r) => setDrawerClosed(!r.data.data)).catch(() => {});
  }, []);

  const createClient = async () => {
    if (!newClient || !newClient.name.trim()) return;
    setSavingClient(true);
    try {
      const { data } = await api.post('/clients', { name: newClient.name.trim(), phone: newClient.phone.trim() || undefined });
      setSelectedClient(data.data);
      setClients((prev) => [data.data, ...prev]);
      setNewClient(null);
      setShowClientPicker(false);
      toast.success(language === 'fr' ? 'Client créé' : 'Client created');
    } catch (err) {
      toast.error(isNetworkError(err)
        ? (language === 'fr' ? 'Pas de connexion : impossible de créer un client hors ligne.' : 'No connection: clients cannot be created offline.')
        : getApiErrorMessage(err));
    } finally {
      setSavingClient(false);
    }
  };

  const canScan = tenant?.plan === 'SHOP' || tenant?.plan === 'BUSINESS';

  const debouncedSearch = useDebounce(search);
  const debouncedClientSearch = useDebounce(clientSearch);

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get('/products', { params: { search: debouncedSearch, limit: 200, isService: false } });
      setProducts(data.data || []);
      if (!debouncedSearch) cacheSet('pos_products', data.data || []);
    } catch (err) {
      const cached = isNetworkError(err) ? cacheGet<Product[]>('pos_products') : null;
      if (cached) {
        const q = debouncedSearch.toLowerCase();
        setProducts(q ? cached.filter((p) => p.name.toLowerCase().includes(q) || matchesCode(p, debouncedSearch.trim())) : cached);
        return;
      }
      console.error(err); toast.error(getApiErrorMessage(err));
    }
  }, [debouncedSearch]);

  const fetchClients = useCallback(async () => {
    try {
      const { data } = await api.get('/clients', { params: { search: debouncedClientSearch, limit: 100 } });
      setClients(data.data || []);
      if (!debouncedClientSearch) cacheSet('pos_clients', data.data || []);
    } catch (err) {
      const cached = isNetworkError(err) ? cacheGet<Client[]>('pos_clients') : null;
      if (cached) {
        const q = debouncedClientSearch.toLowerCase();
        setClients(q ? cached.filter((c) => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)) : cached);
        return;
      }
      console.error(err); toast.error(getApiErrorMessage(err));
    }
  }, [debouncedClientSearch]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { if (showClientPicker) fetchClients(); }, [showClientPicker, fetchClients]);

  const parseSizes = (sizesStr: string): string[] =>
    sizesStr.split(',').map(s => s.trim()).filter(s => s.includes(':'));

  const needsChoice = (p: Product) =>
    variantsOf(p).length > 0 || (typeof p.adaptiveFields?.sizes === 'string' && p.adaptiveFields.sizes.includes(':'));

  const addToCart = (product: Product, choice?: { variant?: string; pack?: boolean }) => {
    if (!choice && needsChoice(product)) {
      setVariantPicker({ product, pack: hasPack(product) });
      return;
    }
    const variant = choice?.variant;
    // Products sold by pack go in as a pack; the cart line can switch to a single unit.
    const pack = choice ? !!choice.pack : hasPack(product);
    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id && (item.variant || '') === (variant || '') && !!item.pack === pack);
      if (idx >= 0) return prev.map((item, j) => j === idx ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { product, quantity: 1, variant, pack }];
    });
    setVariantPicker(null);
  };

  const updateQuantity = (idx: number, delta: number) => {
    setCart(prev => prev
      .map((item, j) => (j !== idx ? item : item.quantity + delta <= 0 ? null : { ...item, quantity: item.quantity + delta }))
      .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (idx: number) => {
    setCart(prev => prev.filter((_, j) => j !== idx));
  };

  const mainQty = (id: string) => cart.filter((i) => i.product.id === id && isMainMode(i.product, i.pack)).reduce((n, i) => n + i.quantity, 0);
  const tierOn = (item: CartItem) => isMainMode(item.product, item.pack) && tierPrice(item.product, mainQty(item.product.id)) !== null;
  const linePrice = (item: CartItem) => tieredPrice(item.product, item.variant, item.pack, mainQty(item.product.id));

  const subtotal = cart.reduce((sum, item) => sum + (linePrice(item) * item.quantity), 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));
  // Empty "amount received" means the client paid the exact total; credit needs an explicit 0
  const paidNow = amountPaid === '' ? total : Number(amountPaid) || 0;
  const change = paidNow > total ? paidNow - total : 0;
  const paymentStatus = paidNow >= total ? 'PAID' : paidNow > 0 ? 'PARTIAL' : 'PENDING';
  // A discount of half the ticket or more is usually the amount received typed in the wrong box
  const bigDiscount = subtotal > 0 && (Number(discount) || 0) >= subtotal / 2;
  const [discountCheck, setDiscountCheck] = useState(false);
  const discountLimit = staffMaxDiscount === null ? null : Math.round((subtotal * staffMaxDiscount) / 100);
  const overLimit = discountLimit !== null && (Number(discount) || 0) > discountLimit;

  const addScanned = (p: Product, variant?: string) => {
    const stock = variant ? (variantsOf(p).find((v) => v.name === variant)?.stock ?? 0) : p.totalStock;
    if (stock <= 0) {
      toast.error(language === 'fr' ? `${p.name} : rupture de stock` : `${p.name}: out of stock`);
      return;
    }
    if (variant) { addToCart(p, { variant, pack: hasPack(p) }); toast.success(`+1 ${p.name} · ${variant}`); return; }
    if (needsChoice(p)) setShowScanner(false);
    addToCart(p);
    if (!needsChoice(p)) toast.success(`+1 ${p.name}`);
  };

  // Looks in the products already on the device first, so scanning also works offline.
  const handleBarcodeScan = async (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    const local = products.find((p) => matchesCode(p, code)) || (cacheGet<Product[]>('pos_products') || []).find((p) => matchesCode(p, code));
    if (local) { addScanned(local, variantForCode(local, code)); return; }
    try {
      const { data } = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
      if (data.data) addScanned(data.data, data.variant || undefined);
    } catch (err) {
      toast.error(isNetworkError(err)
        ? (language === 'fr' ? `Code ${code} introuvable sur cet appareil (hors ligne)` : `Code ${code} not found on this device (offline)`)
        : (language === 'fr' ? `Aucun produit avec le code ${code}` : `No product with code ${code}`));
    }
  };

  const startCheckout = () => {
    if (overLimit) {
      toast.error(language === 'fr'
        ? `Remise maximale : ${staffMaxDiscount} % (${formatCurrency(discountLimit ?? 0)}). Demandez à la propriétaire.`
        : `Maximum discount: ${staffMaxDiscount}% (${formatCurrency(discountLimit ?? 0)}). Ask the owner.`);
      return;
    }
    if (bigDiscount) setDiscountCheck(true);
    else handleCheckout();
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (processing) return;
    setProcessing(true);
    const payload = {
      clientId: selectedClient?.id || null,
      paymentMethod,
      amountPaid: Math.min(paidNow, total),
      discount: Number(discount) || 0,
      notes: notes || undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: linePrice(item),
        variant: item.variant || undefined,
        pack: item.pack || undefined,
      })),
    };
    const offlineId = newOfflineId();
    try {
      const res = await api.post('/orders', { ...payload, offlineId });
      const orderData = res.data.data;
      // Show invoice immediately if created
      if (orderData?.invoice) {
        setCompletedInvoice({ ...orderData.invoice, client: orderData.client, order: { reference: orderData.reference, paymentMethod, items: orderData.items } });
        setShowInvoice(true);
      } else {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
      resetData();
      fetchProducts();
    } catch (err) {
      if (isNetworkError(err)) {
        // No connection: keep the sale on the device, it is sent automatically when back online
        queueSale(payload, total, offlineId);
        setProducts((prev) => applyLocalSale(prev, cart));
        const cached = cacheGet<Product[]>('pos_products');
        if (cached) cacheSet('pos_products', applyLocalSale(cached, cart));
        toast.success(language === 'fr' ? 'Vente enregistrée hors ligne. Elle sera synchronisée au retour d\'internet.' : 'Sale saved offline. It will sync when you are back online.');
        resetData();
        return;
      }
      console.error(err);
      toast.error(getApiErrorMessage(err, language === 'fr' ? 'Erreur lors de la vente' : 'Error during sale'));
    } finally {
      setProcessing(false);
    }
  };

  const resetData = () => {
    setCart([]);
    setSelectedClient(null);
    setAmountPaid('');
    setDiscount('');
    setNotes('');
    setDueDate('');
    setPaymentMethod('CASH');
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Enter' && cart.length > 0 && !processing) startCheckout();
      if (e.key === 'Escape' && cart.length > 0) resetData();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart, processing, bigDiscount, overLimit]);

  const renderClientPicker = () => {
    if (!showClientPicker) return null;
    return (
      <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{language === 'fr' ? 'Choisir un client' : 'Select client'}</h3>
              <button onClick={() => { setShowClientPicker(false); setNewClient(null); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            {newClient ? (
              <div className="space-y-2">
                <Input autoFocus placeholder={language === 'fr' ? 'Nom du client *' : 'Client name *'} value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
                <Input type="tel" placeholder={language === 'fr' ? 'Téléphone (WhatsApp)' : 'Phone (WhatsApp)'} value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setNewClient(null)}>{language === 'fr' ? 'Retour' : 'Back'}</Button>
                  <Button className="flex-1" onClick={createClient} disabled={savingClient || !newClient.name.trim()}>{savingClient ? '...' : (language === 'fr' ? 'Créer et choisir' : 'Create & select')}</Button>
                </div>
              </div>
            ) : (<>
            <Button variant="outline" className="w-full" onClick={() => setNewClient({ name: clientSearch, phone: '' })}>
              <UserPlus className="w-4 h-4 mr-1" />{language === 'fr' ? 'Nouveau client' : 'New client'}
            </Button>
            <Input
              placeholder={language === 'fr' ? 'Chercher...' : 'Search...'}
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => { setSelectedClient(client); setShowClientPicker(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <p className="text-sm font-medium">{client.name}</p>
                  {client.phone && <p className="text-xs text-gray-400">{client.phone}</p>}
                </button>
              ))}
              {clients.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">{t('common.noResults')}</p>
              ) : null}
            </div>
            </>)}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
      {/* Left: Products */}
      <div className="lg:flex-1 flex flex-col min-w-0 min-h-0">
        <OfflineBanner />
        {drawerClosed && (
          <Link to="/closing" className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 px-3 py-2 text-sm">
            <Lock className="w-4 h-4 shrink-0" />
            <span className="flex-1">{language === 'fr' ? 'La caisse n\'est pas ouverte. Ouvrez-la pour avoir le rapport Z ce soir.' : 'The drawer is not open. Open it to get tonight\'s Z report.'}</span>
            <span className="font-semibold underline">{language === 'fr' ? 'Ouvrir' : 'Open'}</span>
          </Link>
        )}
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder={language === 'fr' ? 'Chercher un produit ou un code-barres...' : 'Search product or barcode...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                // USB / Bluetooth scanners type the code then press Enter
                if (e.key !== 'Enter' || !search.trim()) return;
                e.preventDefault();
                const code = search.trim();
                if (!/^[\w-]{4,}$/.test(code)) return;
                setSearch('');
                handleBarcodeScan(code);
              }}
            />
          </div>
          {canScan ? (
            <Button variant="outline" size="default" onClick={() => setShowScanner(true)}>
              <ScanLine className="w-4 h-4" />
            </Button>
          ) : null}
        </div>

        <div className="max-h-[55vh] lg:max-h-none lg:flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {products.map((product) => {
              const inCart = cart.find(item => item.product.id === product.id);
              const isOutOfStock = product.totalStock <= 0;
              return (
                <button
                  key={product.id}
                  onClick={() => !isOutOfStock && addToCart(product)}
                  disabled={isOutOfStock}
                  className={`rounded-xl border text-left transition-all cursor-pointer overflow-hidden ${
                    isOutOfStock
                      ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50'
                      : inCart
                        ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-200 hover:shadow-sm'
                  }`}
                >
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-20 object-cover" />
                  ) : (
                    <div className="w-full h-20 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <ShoppingCart className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{product.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{stockText(product, product.totalStock, fr)} {fr ? 'en stock' : 'in stock'}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="font-bold text-sm text-blue-600">{hasMainRange(product) ? (fr ? 'dès ' : 'from ') : ''}{formatCurrency(mainPrice(product))}</p>
                      {inCart ? (
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                          {inCart.quantity}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-full lg:w-80 xl:w-96 flex flex-col bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm min-h-0 lg:max-h-full">
        {/* Cart header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
              {language === 'fr' ? 'Panier' : 'Cart'}
              {cart.length > 0 ? (
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              ) : null}
            </h2>
            <div className="flex gap-2">
              {cart.length > 0 ? (
                <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-600">
                  {language === 'fr' ? 'Vider' : 'Clear'}
                </button>
              ) : null}
              <button onClick={resetData} className="text-xs text-gray-400 hover:text-gray-600">
                {language === 'fr' ? 'Réinitialiser' : 'Reset'}
              </button>
            </div>
          </div>

          {/* Client selector */}
          <div className="mt-3">
            {selectedClient ? (
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedClient.name}</span>
                </div>
                <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClientPicker(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
              >
                <User className="w-4 h-4" />
                {language === 'fr' ? 'Ajouter client (optionnel)' : 'Add client (optional)'}
              </button>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-4 lg:py-12">
              <ShoppingCart className="w-8 h-8 lg:w-12 lg:h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{language === 'fr' ? 'Panier vide' : 'Cart empty'}</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={`${item.product.id}-${idx}`} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.product.name}</p>
                  {(item.variant || item.pack) && <span className="text-xs font-semibold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">{itemLabel(item.variant, item.pack ? item.product.packSize : null, fr)}</span>}
                  <p className="text-xs text-gray-400">
                    {formatCurrency(linePrice(item))}
                    {tierOn(item) && <span className="ml-1 text-green-600 font-semibold">{fr ? 'prix de gros' : 'bulk price'}</span>}
                    {!tierOn(item) && tiersText(item.product, formatCurrency, fr) && <span className="ml-1 text-gray-400">({tiersText(item.product, formatCurrency, fr)})</span>}
                    {hasPack(item.product) && (
                      <button type="button" onClick={() => setCart((prev) => prev.map((it, j) => (j === idx ? { ...it, pack: !it.pack } : it)))} className="ml-2 text-blue-600 font-semibold underline">
                        {item.pack ? (fr ? '→ unité' : '→ unit') : `→ ${(item.product.packName || (fr ? 'paquet' : 'pack')).toLowerCase()}`}
                      </button>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQuantity(idx, -1)} className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(idx, 1)} className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-right w-20">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(linePrice(item) * item.quantity)}</p>
                </div>
                <button onClick={() => removeFromCart(idx)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Totals + Payment */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3 flex-shrink-0">
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>{language === 'fr' ? 'Sous-total' : 'Subtotal'}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{language === 'fr' ? 'Remise' : 'Discount'}</span>
              <Input
                type="number" min={0} className="h-7 w-24 text-xs ml-auto text-right"
                value={discount ?? ''} onChange={(e) => setDiscount(e.target.value === '' ? '' : Math.max(0, +e.target.value))}
              />
            </div>
            {overLimit && (
              <p className="text-xs text-red-600 font-medium">
                {language === 'fr'
                  ? `Remise maximale autorisée : ${staffMaxDiscount} % (${formatCurrency(discountLimit ?? 0)}).`
                  : `Maximum discount allowed: ${staffMaxDiscount}% (${formatCurrency(discountLimit ?? 0)}).`}
              </p>
            )}
            {bigDiscount && !overLimit && (
              <p className="text-xs text-red-600 font-medium">
                {language === 'fr'
                  ? `Remise de ${formatCurrency(Number(discount) || 0)} : la vente comptera ${formatCurrency(total)}. Le montant payé par le client se met dans « Montant reçu », pas ici.`
                  : `Discount of ${formatCurrency(Number(discount) || 0)}: the sale will count ${formatCurrency(total)}. The amount the customer paid goes in "Amount received", not here.`}
              </p>
            )}
            <details className="text-sm text-gray-500" open={Boolean(notes || dueDate)}>
              <summary className="cursor-pointer select-none">{language === 'fr' ? 'Note / date de retrait (optionnel)' : 'Note / pickup date (optional)'}</summary>
              <div className="mt-2 space-y-2">
                <Input
                  className="h-8 text-xs" maxLength={200}
                  placeholder={language === 'fr' ? 'Ex : écrire « Joyeux anniversaire Awa »' : 'e.g. write "Happy birthday Awa"'}
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                />
                <Input type="datetime-local" className="h-8 text-xs" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </details>
            <div className="flex justify-between font-bold text-lg text-gray-900 dark:text-white pt-1 border-t border-gray-100 dark:border-gray-700">
              <span>Total</span>
              <span className="text-blue-600">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="flex gap-2">
            {[
              { key: 'CASH' as const, icon: Banknote, label: language === 'fr' ? 'Espèces' : 'Cash' },
              { key: 'ORANGE_MONEY' as const, icon: Smartphone, label: 'OM' },
              { key: 'MTN_MOMO' as const, icon: Smartphone, label: 'MTN' },
              { key: 'BANK_TRANSFER' as const, icon: CreditCard, label: language === 'fr' ? 'Virement' : 'Transfer' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setPaymentMethod(key)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  paymentMethod === key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {/* Amount paid */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{language === 'fr' ? 'Montant reçu' : 'Amount received'}</label>
            <div className="flex gap-2">
              <Input
                type="number" min={0}
                value={amountPaid ?? ''}
                placeholder={total > 0 ? String(total) : ''}
                onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Math.max(0, +e.target.value))}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={() => setAmountPaid(total)}>
                {language === 'fr' ? 'Exact' : 'Exact'}
              </Button>
              <Button variant={amountPaid === 0 ? 'default' : 'outline'} size="sm" onClick={() => setAmountPaid(amountPaid === 0 ? '' : 0)}>
                {language === 'fr' ? 'À crédit' : 'On credit'}
              </Button>
            </div>
            {change > 0 ? (
              <p className="text-xs text-green-600 mt-1 font-medium">
                {language === 'fr' ? 'Monnaie' : 'Change'}: {formatCurrency(change)}
              </p>
            ) : null}
          </div>

          {/* Checkout button */}
          <Button
            className="w-full h-12 text-base font-bold"
            disabled={cart.length === 0 || processing}
            onClick={startCheckout}
          >
            {processing
              ? (language === 'fr' ? 'Traitement...' : 'Processing...')
              : (language === 'fr' ? `Valider la vente${paymentStatus === 'PAID' ? '' : paymentStatus === 'PARTIAL' ? ' (acompte)' : ' (à crédit)'}` : `Complete sale${paymentStatus === 'PAID' ? '' : paymentStatus === 'PARTIAL' ? ' (deposit)' : ' (on credit)'}`)
            }
          </Button>
        </div>
      </div>

      {/* Client picker modal */}
      {renderClientPicker()}

      {/* Scanner */}
      {showScanner ? (
        <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
      ) : null}

      {/* Variant / pack picker */}
      {variantPicker ? (() => {
        const p = variantPicker.product;
        const pack = variantPicker.pack;
        const units = packUnits(p, pack);
        const legacy = parseSizes((p.adaptiveFields?.sizes as string) || '').map((e) => {
          const [k, q] = e.split(':');
          return { name: k.trim(), stock: parseInt(q, 10) || 0 };
        });
        const choices = variantsOf(p).length ? variantsOf(p) : legacy;
        return (
          <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm shadow-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">{p.name}</h3>
                  <button onClick={() => setVariantPicker(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
                {hasPack(p) && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[true, false].map((isPack) => (
                      <button
                        key={String(isPack)}
                        onClick={() => setVariantPicker({ product: p, pack: isPack })}
                        className={`py-2 rounded-lg text-sm font-semibold border ${pack === isPack ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-600'}`}
                      >
                        {isPack ? packLabel(p, fr) : (fr ? "À l'unité" : 'Single')}
                      </button>
                    ))}
                  </div>
                )}
                {choices.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-500 mb-3">{fr ? 'Choisir la variante :' : 'Choose the variant:'}</p>
                    <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
                      {choices.map((v) => {
                        const available = Math.floor(v.stock / units);
                        return (
                          <button
                            key={v.name}
                            disabled={available <= 0}
                            onClick={() => addToCart(p, { variant: v.name, pack })}
                            className={`p-3 rounded-xl border-2 text-center transition-all ${
                              available <= 0
                                ? 'opacity-40 cursor-not-allowed border-gray-200 bg-gray-50'
                                : 'border-blue-200 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                            }`}
                          >
                            <div className="font-bold text-sm">{v.name}</div>
                            <div className="text-xs font-semibold text-blue-600">{formatCurrency(priceOf(p, v.name, pack))}</div>
                            <div className={`text-xs mt-0.5 ${available <= (p.lowStockAlert ?? 3) ? 'text-orange-500 font-semibold' : 'text-gray-400'}`}>{available} {pack ? (fr ? 'paquet(s)' : 'pack(s)') : (fr ? 'dispo' : 'left')}</div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <Button className="w-full" disabled={Math.floor(p.totalStock / units) <= 0} onClick={() => addToCart(p, { pack })}>
                    {fr ? 'Ajouter' : 'Add'} · {formatCurrency(priceOf(p, undefined, pack))}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })() : null}

      <ConfirmDialog
        open={discountCheck}
        title={language === 'fr' ? 'Grosse remise' : 'Large discount'}
        message={language === 'fr'
          ? `Sous-total ${formatCurrency(subtotal)}, remise ${formatCurrency(Number(discount) || 0)} : la vente sera enregistrée à ${formatCurrency(total)}. C'est bien une remise, et pas le montant reçu ?`
          : `Subtotal ${formatCurrency(subtotal)}, discount ${formatCurrency(Number(discount) || 0)}: the sale will be saved at ${formatCurrency(total)}. Is this really a discount, not the amount received?`}
        confirmLabel={language === 'fr' ? 'Oui, valider' : 'Yes, complete'}
        cancelLabel={language === 'fr' ? 'Corriger' : 'Fix it'}
        onConfirm={() => { setDiscountCheck(false); handleCheckout(); }}
        onCancel={() => setDiscountCheck(false)}
      />

      {/* Invoice modal after checkout */}
      {showInvoice && completedInvoice ? (
        <InvoiceModal
          invoice={completedInvoice as Parameters<typeof InvoiceModal>[0]['invoice']}
          onClose={() => { setShowInvoice(false); setCompletedInvoice(null); }}
        />
      ) : null}

      {/* Success toast (fallback when no invoice) */}
      {showSuccess ? (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2">
          <p className="font-bold">{language === 'fr' ? 'Vente enregistrée !' : 'Sale recorded!'}</p>
        </div>
      ) : null}
    </div>
  );
}
