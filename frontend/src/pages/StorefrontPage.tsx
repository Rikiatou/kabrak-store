import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Phone, Mail, Search, Share2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import axios from 'axios';

interface Tenant {
  id: string;
  name: string;
  logo?: string;
  invoiceColor?: string;
  phone?: string;
  email?: string;
  businessMode: string;
  businessCategories: string[];
}

interface Product {
  id: string;
  name: string;
  description?: string;
  image?: string;
  sellingPrice: number;
  totalStock: number;
  businessType: string;
  adaptiveFields?: Record<string, unknown>;
}

export function StorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    if (!slug) return;
    const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '');
    const client = axios.create({ baseURL: base });
    const fetchAll = async () => {
      try {
        const [tenantRes, prodRes] = await Promise.all([
          client.get(`/api/public/tenant/${slug}`),
          client.get(`/api/public/products/${slug}?limit=100`),
        ]);
        if (tenantRes.data.success) setTenant(tenantRes.data.data);
        if (prodRes.data.success) setProducts(prodRes.data.data);
      } catch (e) {
        console.error('Storefront fetch error:', e);
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Boutique introuvable</h1>
          <p className="text-gray-500">Cette boutique n'existe pas ou a été supprimée.</p>
        </div>
      </div>
    );
  }

  const accentColor = tenant.invoiceColor || '#2563eb';

  const cleanPhone = (tenant.phone || '').replace(/[^\d]/g, '');

  const openWhatsApp = (message: string) => {
    if (!cleanPhone) { alert('Numéro WhatsApp non configuré'); return; }
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: tenant.name, text: `Découvrez ${tenant.name}`, url }); }
      catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(url);
      alert('Lien copié !');
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
            <button onClick={handleShare} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Partager">
              <Share2 className="w-4 h-4 text-gray-500" />
            </button>
            {tenant.phone && (
              <button
                onClick={() => openWhatsApp(`Bonjour ${tenant.name} ! Je voudrais passer une commande.`)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: accentColor }}
              >
                <ShoppingCart className="w-4 h-4" />
                Commander
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
          <p className="text-gray-500 text-sm sm:text-base mb-5">Découvrez nos produits · Commandez facilement</p>
          {tenant.phone && (
            <button
              onClick={() => openWhatsApp(`Bonjour ${tenant.name} ! Je voudrais passer une commande.`)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
              style={{ background: accentColor, boxShadow: `0 8px 24px ${accentColor}40` }}
            >
              <ShoppingCart className="w-4 h-4" />
              Commander sur WhatsApp
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
            placeholder="Rechercher un produit..."
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
            >Tous</button>
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
            <p className="text-sm">Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl select-none">📦</div>
                  )}
                  {product.totalStock <= 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-bold text-xs px-2 py-1 rounded-full bg-black/40">Rupture</span>
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <h3 className="font-semibold text-xs sm:text-sm text-gray-900 line-clamp-2 leading-tight">{product.name}</h3>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span className="font-black text-sm" style={{ color: accentColor }}>{formatCurrency(product.sellingPrice)}</span>
                    {product.totalStock > 0 && (
                      <button
                        onClick={() => openWhatsApp(`Bonjour ! Je veux commander *${product.name}* à ${product.sellingPrice.toLocaleString()} FCFA.`)}
                        className="text-[10px] sm:text-xs px-2 py-1 rounded-lg font-bold text-white whitespace-nowrap flex-shrink-0"
                        style={{ background: accentColor }}
                      >
                        Commander
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating WhatsApp button (mobile) */}
      {tenant.phone && (
        <button
          onClick={() => openWhatsApp(`Bonjour ${tenant.name} ! Je voudrais passer une commande.`)}
          className="fixed bottom-5 right-5 z-30 sm:hidden w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95"
          style={{ background: accentColor, boxShadow: `0 8px 24px ${accentColor}60` }}
        >
          <ShoppingCart className="w-6 h-6" />
        </button>
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
