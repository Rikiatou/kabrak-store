import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Package, Pencil, Trash2, X, ScanLine, Download } from 'lucide-react';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  businessType: string;
  costPrice: number;
  sellingPrice: number;
  totalStock: number;
  lowStockAlert: number;
  isActive: boolean;
  image?: string;
  adaptiveFields?: Record<string, unknown>;
  category?: { id: string; name: string } | null;
}

const ADAPTIVE_FIELDS: Record<string, { label: string; fields: string[] }> = {
  SHOES: { label: 'Chaussures', fields: ['brand', 'color', 'sizes'] },
  CLOTHING: { label: 'Vêtements', fields: ['category', 'color', 'sizes'] },
  PERFUMES: { label: 'Parfums', fields: ['brand', 'volume'] },
  COSMETICS: { label: 'Cosmétiques', fields: ['brand', 'type'] },
  CAKES: { label: 'Gâteaux', fields: ['flavors', 'sizes'] },
  FOOD: { label: 'Nourriture', fields: ['menuItems'] },
  HIJABS_ABAYAS: { label: 'Hijabs/Abayas', fields: ['color', 'sizes'] },
  JEWELRY: { label: 'Bijoux', fields: ['material', 'type'] },
  BAGS: { label: 'Sacs', fields: ['brand', 'color', 'material'] },
  KITCHEN_PRODUCTS: { label: 'Cuisine', fields: ['type'] },
  OTHER: { label: 'Autre', fields: [] },
};

const defaultForm = {
  name: '', businessType: 'OTHER', costPrice: 0, sellingPrice: 0,
  totalStock: 0, lowStockAlert: 5, categoryId: null as string | null,
  adaptiveFields: {} as Record<string, unknown>,
};

export function ProductsPage() {
  const { t } = useTranslation();
  const tenant = useAuthStore((s) => s.tenant);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get('/products', { params: { search, limit: 100 } });
      setProducts(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, form);
      } else {
        await api.post('/products', form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm);
      fetchProducts();
    } catch (err) { console.error(err); }
  };

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      businessType: product.businessType,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      totalStock: product.totalStock,
      lowStockAlert: product.lowStockAlert,
      categoryId: product.category?.id || null,
      adaptiveFields: (product.adaptiveFields || {}) as Record<string, unknown>,
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.confirm') + '?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) { console.error(err); }
  };

  const handleBarcodeScan = async (code: string) => {
    try {
      const { data } = await api.get(`/products/barcode/${code}`);
      if (data.data) {
        handleEdit(data.data);
        setShowScanner(false);
      }
    } catch {
      alert('Produit non trouvé pour ce code');
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/exports/products', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produits-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const businessTypes = tenant?.businessCategories || ['OTHER'];
  const canScan = tenant?.plan === 'SHOP' || tenant?.plan === 'BUSINESS';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('products.title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          {canScan && (
            <Button variant="outline" size="sm" onClick={() => setShowScanner(true)}>
              <ScanLine className="w-4 h-4 mr-1" /> Scanner
            </Button>
          )}
          <Button onClick={() => { setForm(defaultForm); setEditingId(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> {t('products.addProduct')}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingId ? t('common.edit') : t('products.addProduct')}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t('products.name')}</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">{t('products.category')}</label>
                  <div className="flex flex-wrap gap-2">
                    {businessTypes.map((bt) => (
                      <button key={bt} type="button"
                        onClick={() => setForm({ ...form, businessType: bt })}
                        className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer',
                          form.businessType === bt ? 'bg-kabrak-500 text-white border-kabrak-500' : 'border-border hover:border-kabrak-300'
                        )}>
                        {ADAPTIVE_FIELDS[bt]?.label || bt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t('products.costPrice')} (FCFA)</label>
                    <Input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: +e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t('products.sellingPrice')} (FCFA)</label>
                    <Input type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: +e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t('products.stock')}</label>
                    <Input type="number" value={form.totalStock} onChange={(e) => setForm({ ...form, totalStock: +e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t('products.lowStock')}</label>
                    <Input type="number" value={form.lowStockAlert} onChange={(e) => setForm({ ...form, lowStockAlert: +e.target.value })} />
                  </div>
                </div>

                {/* Adaptive Fields */}
                {form.businessType && ADAPTIVE_FIELDS[form.businessType]?.fields.map((field) => (
                  <div key={field}>
                    <label className="text-sm font-medium mb-1 block capitalize">{field}</label>
                    {field === 'sizes' ? (
                      <Input
                        placeholder="Ex: S:5, M:10, L:7"
                        value={typeof form.adaptiveFields[field] === 'string' ? form.adaptiveFields[field] as string : ''}
                        onChange={(e) => setForm({ ...form, adaptiveFields: { ...form.adaptiveFields, [field]: e.target.value } })}
                      />
                    ) : (
                      <Input
                        value={(form.adaptiveFields[field] as string) || ''}
                        onChange={(e) => setForm({ ...form, adaptiveFields: { ...form.adaptiveFields, [field]: e.target.value } })}
                      />
                    )}
                  </div>
                ))}

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" className="flex-1">
                    {t('common.save')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kabrak-500" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">{t('common.noResults')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">{product.name}</h3>
                    <p className="text-xs text-muted-foreground">{ADAPTIVE_FIELDS[product.businessType]?.label || product.businessType}</p>
                  </div>
                  <Badge variant={product.totalStock <= product.lowStockAlert ? 'warning' : 'secondary'}>
                    {product.totalStock} {t('products.stock')}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('products.costPrice')}</p>
                    <p className="text-sm">{formatCurrency(product.costPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t('products.sellingPrice')}</p>
                    <p className="text-sm font-bold text-kabrak-500">{formatCurrency(product.sellingPrice)}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(product)}>
                    <Pencil className="w-3 h-3 mr-1" /> {t('common.edit')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(product.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Barcode Scanner */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
