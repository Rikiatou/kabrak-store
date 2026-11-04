import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState, Spinner } from '@/components/ui/spinner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { getErrorMessage } from '@/lib/errors';
import { downloadFile } from '@/lib/download';
import { businessTypeKey } from '@/lib/businessType';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Package, Pencil, Trash2, ScanLine, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import api from '@/lib/api';
import { NativeSelect } from '@/components/ui/select';
import type { ProductVariant } from '@/components/VariantPicker';
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
  variants?: ProductVariant[] | null;
}

const ADAPTIVE_FIELDS: Record<string, string[]> = {
  CLOTHING: ['color', 'sizes'],
  SHOES: ['brand', 'color', 'sizes'],
  PERFUMES: ['brand', 'volume'],
  COSMETICS: ['brand', 'type'],
  HIJABS_ABAYAS: ['color', 'sizes'],
  FABRICS: ['material', 'color', 'length'],
  JEWELRY: ['material', 'type'],
  BAGS: ['brand', 'color', 'material'],
  ELECTRONICS: ['brand', 'model', 'warranty'],
  HOUSE_PRODUCTS: ['type', 'material'],
  KITCHEN_PRODUCTS: ['type', 'material'],
  DECORATION: ['type', 'color'],
  MINI_MARKET: ['brand', 'weight'],
  WHOLESALE: ['brand', 'minQuantity'],
  MIXED_SHOP: ['type'],
  CAKES: ['flavors', 'sizes', 'deliveryDate'],
  FOOD_BUSINESS: ['menuItems', 'portions', 'deliveryZone'],
  OTHER: [],
};

const defaultForm = {
  name: '', businessType: 'OTHER', costPrice: 0, sellingPrice: 0,
  totalStock: 0, lowStockAlert: 5, categoryId: null as string | null,
  adaptiveFields: {} as Record<string, unknown>,
  variants: [] as ProductVariant[],
};

export function ProductsPage() {
  const { t } = useTranslation();
  const tenant = useAuthStore((s) => s.tenant);
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const newForm = () => ({ ...defaultForm, businessType: (tenant?.businessCategories || ['OTHER'])[0] || 'OTHER' });

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.data || [])).catch(() => {});
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get('/products', { params: { search, limit: PAGE_SIZE, page } });
      setProducts(data.data);
      const totalCount = data.pagination?.total || data.data.length;
      setTotal(totalCount);
      setTotalPages(Math.max(1, Math.ceil(totalCount / PAGE_SIZE)));
    } catch (err) { toast.error(getErrorMessage(err, t('common.loadError'))); }
    finally { setLoading(false); }
  }, [search, page, t]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { setPage(1); }, [search]);

  const variantStock = form.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  const setVariant = (i: number, patch: Partial<ProductVariant>) =>
    setForm({ ...form, variants: form.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.sellingPrice <= 0) { toast.error(t('products.priceError')); return; }
    const variants = form.variants.filter((v) => v.name.trim());
    const payload = { ...form, variants, totalStock: variants.length ? variantStock : form.totalStock };
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm);
      toast.success(t('common.saved'));
      fetchProducts();
    } catch (err) { toast.error(getErrorMessage(err, t('common.error'))); }
    finally { setSaving(false); }
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
      variants: product.variants || [],
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: t('products.deleteTitle'), description: t('common.deleteDesc') }))) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success(t('common.deleted'));
      fetchProducts();
    } catch (err) { toast.error(getErrorMessage(err, t('common.error'))); }
  };

  const handleBarcodeScan = async (code: string) => {
    try {
      const { data } = await api.get(`/products/barcode/${code}`);
      if (data.data) {
        handleEdit(data.data);
        setShowScanner(false);
      }
    } catch {
      toast.error(t('products.notFoundBarcode'));
    }
  };

  const handleExport = async () => {
    try {
      await downloadFile('/exports/products', `products-${Date.now()}.csv`);
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.exportError')));
    }
  };

  const businessTypes = tenant?.businessCategories || ['OTHER'];
  const canScan = tenant?.plan === 'SHOP' || tenant?.plan === 'BUSINESS';

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={t('products.title')} actions={<>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5" /> {t('common.exportCsv')}
          </Button>
          {canScan && (
            <Button variant="outline" size="sm" onClick={() => setShowScanner(true)}>
              <ScanLine className="w-4 h-4 mr-1.5" /> {t('common.scanner')}
            </Button>
          )}
          <Button size="sm" onClick={() => { setForm(newForm()); setEditingId(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> {t('products.addProduct')}
          </Button>
      </>} />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9 max-w-full sm:max-w-md"
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? t('products.editProduct') : t('products.addProduct')}</DialogTitle></DialogHeader>
            <div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="p-name">{t('products.name')} *</Label>
                  <Input id="p-name" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>

                <div>
                  <Label>{t('products.type')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {businessTypes.map((bt) => (
                      <button key={bt} type="button"
                        onClick={() => setForm({ ...form, businessType: bt })}
                        className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer',
                          form.businessType === bt ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 hover:bg-accent'
                        )}>
                        {t(businessTypeKey(bt))}
                      </button>
                    ))}
                  </div>
                </div>

                {categories.length > 0 && (
                  <div>
                    <Label htmlFor="p-category">{t('products.categoryLabel')}</Label>
                    <NativeSelect id="p-category" value={form.categoryId || ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value || null })}>
                      <option value="">{t('products.noCategory')}</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </NativeSelect>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('products.costPrice')} (FCFA)</Label>
                    <Input type="number" min={0} inputMode="numeric" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: +e.target.value })} />
                  </div>
                  <div>
                    <Label>{t('products.sellingPrice')} (FCFA)</Label>
                    <Input type="number" min={0} inputMode="numeric" required value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: +e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('products.stock')}</Label>
                    <Input type="number" min={0} inputMode="numeric" disabled={form.variants.length > 0} value={form.variants.length > 0 ? variantStock : form.totalStock} onChange={(e) => setForm({ ...form, totalStock: +e.target.value })} />
                  </div>
                  <div>
                    <Label>{t('products.lowStock')}</Label>
                    <Input type="number" min={0} inputMode="numeric" value={form.lowStockAlert} onChange={(e) => setForm({ ...form, lowStockAlert: +e.target.value })} />
                  </div>
                </div>

                {/* Adaptive Fields */}
                <div className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="mb-0">{t('products.variants')}</Label>
                    <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setForm({ ...form, variants: [...form.variants, { name: '', stock: 0 }] })}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> {t('products.addVariant')}
                    </Button>
                  </div>
                  {form.variants.length > 0 && <p className="text-xs text-muted-foreground">{t('products.variantsHint')}</p>}
                  {form.variants.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input aria-label={t('products.variantName')} placeholder={t('products.variantName')} value={v.name} onChange={(e) => setVariant(i, { name: e.target.value })} />
                      <Input aria-label={t('products.stock')} type="number" min={0} inputMode="numeric" className="w-24" value={v.stock} onChange={(e) => setVariant(i, { stock: Math.max(0, +e.target.value) })} />
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label={t('products.removeVariant')} onClick={() => setForm({ ...form, variants: form.variants.filter((_, j) => j !== i) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {form.businessType && ADAPTIVE_FIELDS[form.businessType]?.map((field) => (
                  <div key={field}>
                    <Label>{t(`productFields.${field}`)}</Label>
                    {field === 'sizes' ? (
                      <Input
                        placeholder={t('products.sizesHint')}
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

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
                  <Button type="submit" disabled={saving}>{saving && <Spinner className="mr-2" />}{t('common.save')}</Button>
                </DialogFooter>
              </form>
            </div>
        </DialogContent>
      </Dialog>

      {/* Products Grid */}
      {loading ? (
        <LoadingState />
      ) : products.length === 0 ? (
        search ? <EmptyState icon={Search} title={t('common.noResults')} /> : (
          <EmptyState icon={Package} title={t('products.empty')} description={t('products.emptyDesc')}
            action={<Button onClick={() => { setForm(newForm()); setEditingId(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" /> {t('products.addProduct')}</Button>} />
        )
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="min-w-0 flex-1 mr-2">
                      <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                      <p className="text-xs text-muted-foreground">{t(businessTypeKey(product.businessType))}</p>
                      {product.variants && product.variants.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {product.variants.map((v) => (
                            <span key={v.name} className={cn('rounded bg-muted px-1.5 py-0.5 text-[10px]', v.stock <= 0 && 'text-destructive')}>{v.name} : {v.stock}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Badge variant={product.totalStock <= product.lowStockAlert ? 'warning' : 'secondary'} className="shrink-0 text-xs" title={t('products.stock')}>
                      {product.totalStock} {t('products.inStock')}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{t('products.costPrice')}</p>
                      <p className="text-xs sm:text-sm">{formatCurrency(product.costPrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{t('products.sellingPrice')}</p>
                      <p className="text-xs sm:text-sm font-bold text-primary">{formatCurrency(product.sellingPrice)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => handleEdit(product)}>
                      <Pencil className="w-3 h-3 mr-1" /> {t('common.edit')}
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-destructive hover:text-destructive" onClick={() => handleDelete(product.id)} aria-label={t('common.delete')} title={t('common.delete')}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages} ({total})
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
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
