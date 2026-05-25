import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import { Search, Plus, Minus, Trash2, ShoppingCart, ScanLine, User, CreditCard, Banknote, Smartphone, X } from 'lucide-react';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import api from '@/lib/api';

interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  totalStock: number;
  image?: string;
  businessType: string;
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
  const [showScanner, setShowScanner] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ORANGE_MONEY' | 'CARD'>('CASH');
  const [amountPaid, setAmountPaid] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  const canScan = tenant?.plan === 'SHOP' || tenant?.plan === 'BUSINESS';

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get('/products', { params: { search, limit: 50, isService: false } });
      setProducts(data.data || []);
    } catch (err) { console.error(err); }
  }, [search]);

  const fetchClients = useCallback(async () => {
    try {
      const { data } = await api.get('/clients', { params: { search: clientSearch, limit: 20 } });
      setClients(data.data || []);
    } catch (err) { console.error(err); }
  }, [clientSearch]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { if (showClientPicker) fetchClients(); }, [showClientPicker, fetchClients]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.totalStock) return prev;
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(item => {
        if (item.product.id !== productId) return item;
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.product.totalStock) return item;
        return { ...item, quantity: newQty };
      })
      .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);
  const change = amountPaid > total ? amountPaid - total : 0;
  const paymentStatus = amountPaid >= total ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'PENDING';

  const handleBarcodeScan = async (code: string) => {
    try {
      const { data } = await api.get(`/products/barcode/${code}`);
      if (data.data) {
        addToCart(data.data);
        setShowScanner(false);
      }
    } catch {
      alert(language === 'fr' ? 'Produit non trouvé' : 'Product not found');
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      await api.post('/orders', {
        clientId: selectedClient?.id || null,
        paymentMethod,
        amountPaid: Math.min(amountPaid, total),
        discount,
        notes: notes || undefined,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.sellingPrice,
          variant: item.variant || undefined,
        })),
      });
      setShowSuccess(true);
      setCart([]);
      setSelectedClient(null);
      setAmountPaid(0);
      setDiscount(0);
      setNotes('');
      fetchProducts();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert(language === 'fr' ? 'Erreur lors de la vente' : 'Error during sale');
    }
    setProcessing(false);
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-3 sm:gap-4 overflow-hidden">
      {/* Left: Products */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder={language === 'fr' ? 'Chercher un produit...' : 'Search product...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {canScan && (
            <Button variant="outline" size="default" onClick={() => setShowScanner(true)}>
              <ScanLine className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {products.map((product) => {
              const inCart = cart.find(item => item.product.id === product.id);
              const isOutOfStock = product.totalStock <= 0;
              return (
                <button
                  key={product.id}
                  onClick={() => !isOutOfStock && addToCart(product)}
                  disabled={isOutOfStock}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isOutOfStock
                      ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50'
                      : inCart
                        ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-200 hover:shadow-sm'
                  }`}
                >
                  <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{product.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{product.totalStock} {language === 'fr' ? 'en stock' : 'in stock'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="font-bold text-sm text-blue-600">{formatCurrency(product.sellingPrice)}</p>
                    {inCart && (
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                        {inCart.quantity}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-full lg:w-80 xl:w-96 flex flex-col bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm min-h-0 max-h-[50vh] lg:max-h-full">
        {/* Cart header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
              {language === 'fr' ? 'Panier' : 'Cart'}
              {cart.length > 0 && (
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </h2>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-600">
                {language === 'fr' ? 'Vider' : 'Clear'}
              </button>
            )}
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
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{language === 'fr' ? 'Panier vide' : 'Cart empty'}</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.product.name}</p>
                  <p className="text-xs text-gray-400">{formatCurrency(item.product.sellingPrice)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQuantity(item.product.id, -1)} className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, 1)} className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-right w-20">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(item.product.sellingPrice * item.quantity)}</p>
                </div>
                <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Totals + Payment */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>{language === 'fr' ? 'Sous-total' : 'Subtotal'}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{language === 'fr' ? 'Remise' : 'Discount'}</span>
              <Input
                type="number" min={0} className="h-7 w-24 text-xs ml-auto text-right"
                value={discount || ''} onChange={(e) => setDiscount(+e.target.value)}
              />
            </div>
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
              { key: 'CARD' as const, icon: CreditCard, label: language === 'fr' ? 'Carte' : 'Card' },
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
                value={amountPaid || ''}
                onChange={(e) => setAmountPaid(+e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={() => setAmountPaid(total)}>
                {language === 'fr' ? 'Exact' : 'Exact'}
              </Button>
            </div>
            {change > 0 && (
              <p className="text-xs text-green-600 mt-1 font-medium">
                {language === 'fr' ? 'Monnaie' : 'Change'}: {formatCurrency(change)}
              </p>
            )}
          </div>

          {/* Checkout button */}
          <Button
            className="w-full h-12 text-base font-bold"
            disabled={cart.length === 0 || processing}
            onClick={handleCheckout}
          >
            {processing
              ? (language === 'fr' ? 'Traitement...' : 'Processing...')
              : (language === 'fr' ? `Valider la vente (${paymentStatus})` : `Complete sale (${paymentStatus})`)
            }
          </Button>
        </div>
      </div>

      {/* Client picker modal */}
      {showClientPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{language === 'fr' ? 'Choisir un client' : 'Select client'}</h3>
                <button onClick={() => setShowClientPicker(false)}><X className="w-5 h-5" /></button>
              </div>
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
                {clients.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">{t('common.noResults')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scanner */}
      {showScanner && (
        <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
      )}

      {/* Success toast */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2">
          <p className="font-bold">{language === 'fr' ? 'Vente enregistrée !' : 'Sale recorded!'}</p>
        </div>
      )}
    </div>
  );
}
