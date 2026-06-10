import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Phone, Mail, Search, Heart, Share2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Tenant {
  id: string;
  name: string;
  logo?: string;
  invoiceColor?: string;
  phone?: string;
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
    const fetchAll = async () => {
      try {
        const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '');
        const [tenantRes, prodRes] = await Promise.all([
          fetch(`${base}/api/public/tenant/${slug}`).then(r => r.json()),
          fetch(`${base}/api/public/products/${slug}?limit=100`).then(r => r.json()),
        ]);
        if (tenantRes.success) setTenant(tenantRes.data);
        if (prodRes.success) setProducts(prodRes.data);
      } catch (e) {
        console.error(e);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logo && (
              <img src={tenant.logo} alt={tenant.name} className="w-10 h-10 rounded-full object-cover border-2" style={{ borderColor: accentColor }} />
            )}
            <div>
              <h1 className="font-bold text-lg text-gray-900">{tenant.name}</h1>
              <p className="text-xs text-gray-500">Boutique en ligne</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Share2 className="w-5 h-5 text-gray-600" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors" style={{ background: accentColor, color: 'white' }}>
              <ShoppingCart className="w-4 h-4" />
              <span>Commander sur WhatsApp</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Bienvenue chez {tenant.name}</h2>
          <p className="text-gray-600">Découvrez nos produits et commandez sur WhatsApp</p>
          {tenant.phone && (
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
              <Phone className="w-4 h-4" />
              <span>{tenant.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${!selectedCategory ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Tous
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucun produit trouvé
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-gray-100 relative">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-4xl">📦</span>
                    </div>
                  )}
                  {product.totalStock <= 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">Rupture</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold text-base" style={{ color: accentColor }}>{formatCurrency(product.sellingPrice)}</span>
                    <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      <Heart className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold text-gray-900 mb-3">{tenant.name}</h3>
              <p className="text-sm text-gray-600">Votre boutique de confiance pour tous vos achats.</p>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Contact</h3>
              {tenant.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Phone className="w-4 h-4" />
                  <span>{tenant.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span>contact@kabrak.com</span>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Powered by</h3>
              <p className="text-sm text-gray-600">KABRAK Store</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} {tenant.name}. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
