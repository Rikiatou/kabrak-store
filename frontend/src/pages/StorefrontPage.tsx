import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Phone, Mail, Search, Share2, Plus, Minus, X, Trash2, Lock, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import axios from 'axios';
import toast from 'react-hot-toast';
import { hasMainRange, hasPack, mainPrice, packLabel, packUnits, priceOf, tieredPrice, tiersText, variantsOf } from '@/lib/variants';

interface CartLine { key: string; product: Product; variant?: string; option?: string; quantity: number }

const sizeStock = (p: Product): Array<[string, number]> => {
  // Products sold by pack are ordered by pack on the storefront
  if (variantsOf(p).length) return variantsOf(p).map((v) => [v.name, Math.floor(v.stock / packUnits(p, hasPack(p)))] as [string, number]);
  const raw = p.adaptiveFields?.sizes;
  if (typeof raw !== 'string' || !raw.includes(':')) return [];
  return raw.split(',').map((part) => part.split(':').map((x) => x.trim())).filter((kv) => kv.length === 2 && kv[0]).map(([k, v]) => [k, parseInt(v) || 0] as [string, number]);
};
const optionList = (p: Product): string[] => {
  if (variantsOf(p).length) return [];
  const raw = p.adaptiveFields?.color ?? p.adaptiveFields?.flavors;
  return typeof raw === 'string' ? raw.split(/[,/]/).map((x) => x.trim()).filter(Boolean) : [];
};

const photosOf = (p: Product): string[] => (p.images?.length ? p.images : p.image ? [p.image] : []);

const LANG_KEY = 'kabrak-storefront-lang';

interface Tenant {
  id: string;
  name: string;
  logo?: string;
  invoiceColor?: string;
  phone?: string;
  email?: string;
  businessMode: string;
  businessCategories: string[];
  storefrontOpen?: boolean;
  language?: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  image?: string;
  images?: string[];
  sellingPrice: number;
  totalStock: number;
  businessType: string;
  adaptiveFields?: Record<string, unknown>;
  variants?: Array<{ name: string; sellingPrice: number; stock: number; packPrice?: number | null }>;
  packSize?: number | null;
  packPrice?: number | null;
  packName?: string | null;
  priceTiers?: Array<{ minQty: number; price: number }> | null;
}

export function StorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [locked, setLocked] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [picking, setPicking] = useState<{ product: Product; variant: string; option: string; quantity: number } | null>(null);
  const [checkout, setCheckout] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '', note: '' });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ reference: string; message: string } | null>(null);
  const [viewing, setViewing] = useState<{ product: Product; index: number } | null>(null);
  const [savedLang] = useState(() => localStorage.getItem(LANG_KEY));
  const [lang, setLang] = useState<'fr' | 'en'>(() => (savedLang === 'en' || savedLang === 'fr' ? savedLang : 'fr'));
  const fr = lang === 'fr';
  const toggleLang = () => {
    const next = fr ? 'en' : 'fr';
    localStorage.setItem(LANG_KEY, next);
    setLang(next);
  };

  useEffect(() => {
    if (!slug) return;
    const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '');
    const client = axios.create({ baseURL: base });
    const fetchAll = async () => {
      try {
        const tenantRes = await client.get(`/api/public/tenant/${slug}`);
        if (tenantRes.data.success) {
          setTenant(tenantRes.data.data);
          if (!savedLang) setLang(tenantRes.data.data?.language === 'en' ? 'en' : 'fr');
        }
        if (tenantRes.data.data?.storefrontOpen === false) { setLocked(true); return; }
        const prodRes = await client.get(`/api/public/products/${slug}?limit=200`);
        if (prodRes.data.success) setProducts(prodRes.data.data);
      } catch (e) {
        console.error('Storefront fetch error:', e);
      toast.error(fr ? 'Erreur lors du chargement de la boutique' : 'Error loading store');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [slug]);

  const filteredProducts = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedCategory && p.businessType !== selectedCategory) return false;
    return true;
  });

  const categories = Array.from(new Set(products.map(p => p.businessType)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{fr ? 'Boutique introuvable' : 'Store not found'}</h1>
          <p className="text-gray-500">{fr ? 'Cette boutique n\'existe pas ou a été supprimée.' : 'This store does not exist or has been deleted.'}</p>
        </div>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <Lock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">{tenant.name}</h1>
          <p className="text-gray-500 text-sm">{fr ? 'Cette boutique en ligne n’est pas disponible pour le moment.' : 'This online store is not available at the moment.'}</p>
          {tenant.phone && (
            <a href={`https://wa.me/${tenant.phone.replace(/[^\d]/g, '')}`} className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold">
              {fr ? 'Contacter sur WhatsApp' : 'Contact on WhatsApp'}
            </a>
          )}
        </div>
      </div>
    );
  }

  const accentColor = tenant.invoiceColor || '#2563eb';

  const cleanPhone = (tenant.phone || '').replace(/[^\d]/g, '');

  const openWhatsApp = (message: string) => {
    if (!cleanPhone) { toast.error(fr ? 'Numéro WhatsApp non configuré' : 'WhatsApp number not configured'); return; }
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const apiClient = axios.create({ baseURL: (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '') });
  const cartCount = cart.reduce((n, l) => n + l.quantity, 0);
  const linePrice = (l: CartLine) =>
    tieredPrice(l.product, l.variant, hasPack(l.product), cart.filter((c) => c.product.id === l.product.id).reduce((n, c) => n + c.quantity, 0));
  const cartTotal = cart.reduce((n, l) => n + l.quantity * linePrice(l), 0);
  const shownPrice = (p: Product) => `${hasMainRange(p) ? (fr ? 'dès ' : 'from ') : ''}${formatCurrency(mainPrice(p))}${hasPack(p) ? ` / ${packLabel(p, fr)}` : ''}`;
  const inCart = (productId: string, variant?: string) => cart.filter((l) => l.product.id === productId && (variant === undefined || l.variant === variant)).reduce((n, l) => n + l.quantity, 0);
  const maxFor = (p: Product, variant?: string) => {
    const sizes = sizeStock(p);
    const sized = variant ? sizes.find(([k]) => k === variant)?.[1] ?? 0 : Infinity;
    return Math.max(0, Math.min(sized - (variant ? inCart(p.id, variant) : 0), Math.floor(p.totalStock / packUnits(p, hasPack(p))) - inCart(p.id)));
  };

  const startAdd = (p: Product) => {
    const sizes = sizeStock(p).filter(([, q]) => q > 0);
    const options = optionList(p);
    if (sizes.length === 0 && options.length <= 1) { addLine(p, undefined, options[0], 1); return; }
    setPicking({ product: p, variant: sizes[0]?.[0] ?? '', option: options.length > 1 ? '' : options[0] ?? '', quantity: 1 });
  };

  const addLine = (p: Product, variant: string | undefined, option: string | undefined, quantity: number) => {
    if (quantity > maxFor(p, variant)) { toast.error(fr ? 'Stock insuffisant' : 'Not enough stock'); return; }
    const key = `${p.id}|${variant || ''}|${option || ''}`;
    setCart((c) => c.some((l) => l.key === key)
      ? c.map((l) => l.key === key ? { ...l, quantity: l.quantity + quantity } : l)
      : [...c, { key, product: p, variant, option, quantity }]);
    toast.success(fr ? 'Ajouté au panier' : 'Added to cart');
  };

  const changeQty = (key: string, delta: number) => {
    setCart((c) => c.flatMap((l) => {
      if (l.key !== key) return [l];
      if (delta > 0 && maxFor(l.product, l.variant) < delta) { toast.error(fr ? 'Stock insuffisant' : 'Not enough stock'); return [l]; }
      const q = l.quantity + delta;
      return q > 0 ? [{ ...l, quantity: q }] : [];
    }));
  };

  const lineLabel = (l: CartLine) => [l.product.name, [l.variant, l.option, hasPack(l.product) ? packLabel(l.product, fr) : ''].filter(Boolean).join(', ')].filter(Boolean).join(' · ');

  const submitOrder = async () => {
    if (customer.name.trim().length < 2 || customer.phone.replace(/[^\d]/g, '').length < 6) {
      toast.error(fr ? 'Entrez votre nom et votre numéro de téléphone' : 'Enter your name and phone number');
      return;
    }
    setSending(true);
    try {
      const res = await apiClient.post(`/api/public/storefront/${slug}/order`, {
        customerName: customer.name.trim(),
        customerPhone: customer.phone.trim(),
        note: customer.note.trim() || undefined,
        items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity, variant: l.variant || undefined, option: l.option || undefined, pack: hasPack(l.product) || undefined })),
      });
      const ref = res.data.data.reference as string;
      const message = [
        `Bonjour ${tenant.name} ! Nouvelle commande ${ref}`,
        ...cart.map((l) => `- ${l.quantity} x ${lineLabel(l)} : ${formatCurrency(l.quantity * linePrice(l))}`),
        `Total : ${formatCurrency(cartTotal)}`,
        `Nom : ${customer.name.trim()} · Tél : ${customer.phone.trim()}`,
        customer.note.trim() ? `Note : ${customer.note.trim()}` : '',
      ].filter(Boolean).join('\n');
      setDone({ reference: ref, message });
      setCart([]);
      setCheckout(false);
      if (cleanPhone) window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    } catch (err) {
      const data = axios.isAxiosError(err) ? err.response?.data : undefined;
      toast.error(data?.code === 'INSUFFICIENT_STOCK' || data?.code === 'PRODUCT_UNAVAILABLE'
        ? (fr ? `${data.message}. Modifiez votre panier.` : 'Some items are no longer in stock. Please update your cart.')
        : data?.code === 'TOO_MANY_ORDERS'
          ? (fr ? 'Trop de commandes, réessayez dans quelques minutes.' : 'Too many orders, try again in a few minutes.')
          : (fr ? 'La commande n’a pas pu être envoyée. Réessayez.' : 'The order could not be sent. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: tenant.name, text: fr ? `Découvrez ${tenant.name}` : `Check out ${tenant.name}`, url }); }
      catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(url);
      toast.success(fr ? 'Lien copié !' : 'Link copied!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Sticky header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {tenant.logo ? (
              <img src={tenant.logo} alt={tenant.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: accentColor }}>
                {tenant.name[0].toUpperCase()}
              </div>
            )}
            <span className="font-bold text-gray-900 truncate">{tenant.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={toggleLang} className="px-2 py-1 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100" title={fr ? 'Switch to English' : 'Passer en français'}>
              {fr ? 'EN' : 'FR'}
            </button>
            <button onClick={handleShare} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title={fr ? 'Partager' : 'Share'}>
              <Share2 className="w-4 h-4 text-gray-500" />
            </button>
            {tenant.phone && (
              <button
                onClick={() => openWhatsApp(`Bonjour ${tenant.name} ! Je voudrais passer une commande.`)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: accentColor }}
              >
                <ShoppingCart className="w-4 h-4" />
                {fr ? 'Commander' : 'Order'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${accentColor}15 0%, ${accentColor}05 100%)` }}>
        <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14 text-center">
          {tenant.logo && (
            <img src={tenant.logo} alt={tenant.name} className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 shadow-lg" />
          )}
          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 mb-2">{tenant.name}</h1>
          <p className="text-gray-500 text-sm sm:text-base mb-5">{fr ? 'Découvrez nos produits · Commandez facilement' : 'Discover our products · Order easily'}</p>
          {tenant.phone && (
            <button
              onClick={() => openWhatsApp(`Bonjour ${tenant.name} ! Je voudrais passer une commande.`)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
              style={{ background: accentColor, boxShadow: `0 8px 24px ${accentColor}40` }}
            >
              <ShoppingCart className="w-4 h-4" />
              {fr ? 'Commander sur WhatsApp' : 'Order on WhatsApp'}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={fr ? 'Rechercher un produit...' : 'Search products...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:border-transparent text-sm"
            style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
          />
        </div>
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('')}
              className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
              style={!selectedCategory ? { background: accentColor, color: 'white' } : { background: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}
            >{fr ? 'Tous' : 'All'}</button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                style={selectedCategory === cat ? { background: accentColor, color: 'white' } : { background: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}
              >{cat}</button>
            ))}
          </div>
        )}
      </div>

      {/* Products */}
      <div className="max-w-5xl mx-auto px-4 pb-24">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{fr ? 'Aucun produit trouvé' : 'No products found'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {photosOf(product).length > 0 ? (
                    <button type="button" onClick={() => setViewing({ product, index: 0 })} className="w-full h-full">
                      <img src={photosOf(product)[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </button>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl select-none">📦</div>
                  )}
                  {photosOf(product).length > 1 && (
                    <span className="absolute top-1.5 right-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-black/50 text-white pointer-events-none">
                      1/{photosOf(product).length}
                    </span>
                  )}
                  {product.totalStock <= 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-bold text-xs px-2 py-1 rounded-full bg-black/40">{fr ? 'Rupture' : 'Out of stock'}</span>
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <h3 className="font-semibold text-xs sm:text-sm text-gray-900 line-clamp-2 leading-tight">{product.name}</h3>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span className="font-black text-sm" style={{ color: accentColor }}>{shownPrice(product)}</span>
                    {product.totalStock > 0 && (
                      <button
                        onClick={() => startAdd(product)}
                        className="text-[10px] sm:text-xs px-2 py-1 rounded-lg font-bold text-white whitespace-nowrap flex-shrink-0"
                        style={{ background: accentColor }}
                      >
                        {fr ? 'Ajouter' : 'Add'}
                      </button>
                    )}
                  </div>
                  {sizeStock(product).length > 0 && (
                    <p className="mt-1 text-[10px] text-gray-400 truncate">
                      {sizeStock(product).filter(([, q]) => q > 0).map(([k]) => k).join(' · ') || (fr ? 'Rupture' : 'Out of stock')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart bar */}
      {cartCount > 0 ? (
        <button
          onClick={() => setCheckout(true)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl text-white font-semibold shadow-xl"
          style={{ background: accentColor, boxShadow: `0 8px 24px ${accentColor}60` }}
        >
          <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> {fr ? 'Panier' : 'Cart'} ({cartCount})</span>
          <span>{formatCurrency(cartTotal)} →</span>
        </button>
      ) : tenant.phone && (
        <button
          onClick={() => openWhatsApp(`Bonjour ${tenant.name} ! Je voudrais passer une commande.`)}
          className="fixed bottom-5 right-5 z-30 sm:hidden w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white"
          style={{ background: accentColor, boxShadow: `0 8px 24px ${accentColor}60` }}
        >
          <Phone className="w-6 h-6" />
        </button>
      )}

      {/* Photo viewer */}
      {viewing && (() => {
        const imgs = photosOf(viewing.product);
        const go = (d: number) => setViewing({ ...viewing, index: (viewing.index + d + imgs.length) % imgs.length });
        return (
          <div className="fixed inset-0 z-40 bg-black/80 flex items-end sm:items-center justify-center" onClick={() => setViewing(null)}>
            <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="relative bg-gray-100 aspect-square">
                <img src={imgs[viewing.index]} alt={viewing.product.name} className="w-full h-full object-contain" />
                <button onClick={() => setViewing(null)} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white"><X className="w-4 h-4" /></button>
                {imgs.length > 1 && (
                  <>
                    <button onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white text-xl leading-none" aria-label={fr ? 'Photo précédente' : 'Previous photo'}>‹</button>
                    <button onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white text-xl leading-none" aria-label={fr ? 'Photo suivante' : 'Next photo'}>›</button>
                  </>
                )}
              </div>
              {imgs.length > 1 && (
                <div className="flex gap-2 px-4 pt-3 overflow-x-auto">
                  {imgs.map((u, i) => (
                    <button key={u + i} onClick={() => setViewing({ ...viewing, index: i })}
                      className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border-2"
                      style={{ borderColor: i === viewing.index ? accentColor : 'transparent' }}>
                      <img src={u} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="p-4 space-y-2">
                <h3 className="font-bold text-gray-900">{viewing.product.name}</h3>
                {viewing.product.description && <p className="text-sm text-gray-500 whitespace-pre-line">{viewing.product.description}</p>}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="font-black" style={{ color: accentColor }}>{shownPrice(viewing.product)}</span>
                  {viewing.product.totalStock > 0 ? (
                    <button onClick={() => { const p = viewing.product; setViewing(null); startAdd(p); }}
                      className="px-4 py-2 rounded-lg text-sm font-bold text-white" style={{ background: accentColor }}>
                      {fr ? 'Ajouter au panier' : 'Add to cart'}
                    </button>
                  ) : (
                    <span className="text-sm font-semibold text-gray-400">{fr ? 'Rupture' : 'Out of stock'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Size / option picker */}
      {picking && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setPicking(null)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-gray-900">{picking.product.name}</h3>
                <p className="text-sm font-bold" style={{ color: accentColor }}>{picking.variant ? formatCurrency(priceOf(picking.product, picking.variant, hasPack(picking.product))) : shownPrice(picking.product)}</p>
                {tiersText(picking.product, formatCurrency, fr) && <p className="text-xs text-green-700">{tiersText(picking.product, formatCurrency, fr)}</p>}
              </div>
              <button onClick={() => setPicking(null)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            {sizeStock(picking.product).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">{variantsOf(picking.product).length ? (fr ? 'Choix' : 'Option') : (fr ? 'Taille' : 'Size')}</p>
                <div className="flex flex-wrap gap-2">
                  {sizeStock(picking.product).map(([k, q]) => (
                    <button
                      key={k}
                      disabled={q <= 0}
                      onClick={() => setPicking({ ...picking, variant: k, quantity: 1 })}
                      className="min-w-[44px] px-3 py-2 rounded-lg border text-sm font-semibold disabled:opacity-30 disabled:line-through"
                      style={picking.variant === k ? { background: accentColor, color: 'white', borderColor: accentColor } : {}}
                    >{k}</button>
                  ))}
                </div>
              </div>
            )}
            {optionList(picking.product).length > 1 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">{picking.product.adaptiveFields?.flavors ? (fr ? 'Parfum' : 'Flavour') : (fr ? 'Couleur' : 'Colour')}</p>
                <div className="flex flex-wrap gap-2">
                  {optionList(picking.product).map((o) => (
                    <button
                      key={o}
                      onClick={() => setPicking({ ...picking, option: o })}
                      className="px-3 py-2 rounded-lg border text-sm"
                      style={picking.option === o ? { background: accentColor, color: 'white', borderColor: accentColor } : {}}
                    >{o}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500">{fr ? 'Quantité' : 'Quantity'}</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setPicking({ ...picking, quantity: Math.max(1, picking.quantity - 1) })} className="w-9 h-9 rounded-lg border flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                <span className="w-6 text-center font-bold">{picking.quantity}</span>
                <button onClick={() => setPicking({ ...picking, quantity: picking.quantity + 1 })} className="w-9 h-9 rounded-lg border flex items-center justify-center"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            <button
              disabled={(sizeStock(picking.product).length > 0 && !picking.variant) || (optionList(picking.product).length > 1 && !picking.option)}
              onClick={() => { addLine(picking.product, picking.variant || undefined, picking.option || undefined, picking.quantity); setPicking(null); }}
              className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-40"
              style={{ background: accentColor }}
            >
              {fr ? 'Ajouter au panier' : 'Add to cart'} · {formatCurrency(picking.quantity * priceOf(picking.product, picking.variant, hasPack(picking.product)))}
            </button>
          </div>
        </div>
      )}

      {/* Checkout */}
      {checkout && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setCheckout(false)}>
          <div className="bg-white w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{fr ? 'Votre commande' : 'Your order'}</h3>
              <button onClick={() => setCheckout(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="divide-y">
              {cart.map((l) => (
                <div key={l.key} className="py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{lineLabel(l)}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(linePrice(l))}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeQty(l.key, -1)} className="w-7 h-7 rounded border flex items-center justify-center">{l.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-500" /> : <Minus className="w-3.5 h-3.5" />}</button>
                    <span className="w-5 text-center text-sm font-bold">{l.quantity}</span>
                    <button onClick={() => changeQty(l.key, 1)} className="w-7 h-7 rounded border flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold"><span>Total</span><span style={{ color: accentColor }}>{formatCurrency(cartTotal)}</span></div>
            <div className="space-y-2">
              <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder={fr ? 'Votre nom *' : 'Your name *'} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
              <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} type="tel" placeholder={fr ? 'Votre téléphone / WhatsApp *' : 'Your phone / WhatsApp *'} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
              <textarea value={customer.note} onChange={(e) => setCustomer({ ...customer, note: e.target.value })} rows={2} placeholder={fr ? 'Adresse de livraison, date souhaitée, message…' : 'Delivery address, preferred date, message…'} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <button onClick={submitOrder} disabled={sending || cart.length === 0} className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50" style={{ background: accentColor }}>
              {sending ? (fr ? 'Envoi…' : 'Sending…') : (fr ? 'Envoyer la commande' : 'Send order')}
            </button>
            <p className="text-[11px] text-gray-400 text-center">{fr ? 'Le paiement se fait avec la boutique (espèces, Orange Money, MTN…).' : 'Payment is arranged with the shop (cash, Orange Money, MTN…).'}</p>
          </div>
        </div>
      )}

      {/* Confirmation */}
      {done && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center px-4" onClick={() => setDone(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center space-y-3" onClick={(e) => e.stopPropagation()}>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <h3 className="font-bold text-gray-900">{fr ? 'Commande envoyée !' : 'Order sent!'}</h3>
            <p className="text-sm text-gray-500">{fr ? `Référence ${done.reference}. La boutique va vous contacter pour confirmer.` : `Reference ${done.reference}. The shop will contact you to confirm.`}</p>
            {cleanPhone && (
              <button onClick={() => openWhatsApp(done.message)} className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold">
                {fr ? 'Envoyer aussi sur WhatsApp' : 'Also send on WhatsApp'}
              </button>
            )}
            <button onClick={() => setDone(null)} className="w-full py-2.5 rounded-xl border text-sm">{fr ? 'Fermer' : 'Close'}</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {tenant.phone && <><Phone className="w-3.5 h-3.5" /><span>{tenant.phone}</span></>}
            {tenant.email && <><Mail className="w-3.5 h-3.5 ml-3" /><span>{tenant.email}</span></>}
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} {tenant.name}</p>
        </div>
      </footer>
    </div>
  );
}
