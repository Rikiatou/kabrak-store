import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Package, Pencil, Trash2, X, ScanLine, Download, ChevronLeft, ChevronRight, PackagePlus } from 'lucide-react';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { ImageUpload } from '@/components/ImageUpload';
import api, { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { type Variant, hasMainRange, isLowStock, mainPrice, stockText, variantsOf } from '@/lib/variants';

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
  images?: string[];
  barcode?: string | null;
  adaptiveFields?: Record<string, unknown>;
  category?: { id: string; name: string } | null;
  variants?: Variant[] | null;
  packSize?: number | null;
  packPrice?: number | null;
  packName?: string | null;
  priceTiers?: Array<{ minQty: number; price: number }> | null;
}

// Prices/stock in a row are for what is normally sold (the pack when "also sold by unit" is on); `extra` = loose units.
interface VariantRow { name: string; sellingPrice: string; costPrice: string; stock: string; extra: string; unitPrice: string; barcode: string }

const legacySizes = (p: Product): Array<[string, number]> => {
  const raw = p.adaptiveFields?.sizes;
  if (typeof raw !== 'string' || !raw.includes(':')) return [];
  return raw.split(',').map((part) => part.split(':').map((x) => x.trim())).filter((kv) => kv.length === 2 && kv[0]).map(([k, v]) => [k, parseInt(v) || 0] as [string, number]);
};

const ADAPTIVE_FIELDS: Record<string, { label: string; labelEn: string; fields: string[] }> = {
  CLOTHING: { label: 'Vêtements', labelEn: 'Clothing', fields: ['color', 'sizes'] },
  SHOES: { label: 'Chaussures', labelEn: 'Shoes', fields: ['brand', 'color', 'sizes'] },
  PERFUMES: { label: 'Parfums', labelEn: 'Perfumes', fields: ['brand', 'volume'] },
  COSMETICS: { label: 'Cosmétiques', labelEn: 'Cosmetics', fields: ['brand', 'type'] },
  HIJABS_ABAYAS: { label: 'Hijabs/Abayas', labelEn: 'Hijabs/Abayas', fields: ['color', 'sizes'] },
  FABRICS: { label: 'Pagnes / Tissus', labelEn: 'Fabrics / Wax', fields: ['material', 'color', 'length'] },
  JEWELRY: { label: 'Bijoux', labelEn: 'Jewelry', fields: ['material', 'type'] },
  BAGS: { label: 'Sacs', labelEn: 'Bags', fields: ['brand', 'color', 'material'] },
  ELECTRONICS: { label: 'Électronique', labelEn: 'Electronics', fields: ['brand', 'model', 'warranty'] },
  HOUSE_PRODUCTS: { label: 'Maison', labelEn: 'House', fields: ['type', 'material'] },
  KITCHEN_PRODUCTS: { label: 'Cuisine', labelEn: 'Kitchen', fields: ['type', 'material'] },
  DECORATION: { label: 'Décoration', labelEn: 'Decoration', fields: ['type', 'color'] },
  MINI_MARKET: { label: 'Mini Market', labelEn: 'Mini Market', fields: ['brand', 'weight'] },
  WHOLESALE: { label: 'Grossiste', labelEn: 'Wholesale', fields: ['brand', 'minQuantity'] },
  MIXED_SHOP: { label: 'Boutique Mixte', labelEn: 'Mixed Shop', fields: ['type'] },
  CAKES: { label: 'Gâteaux', labelEn: 'Cakes', fields: ['flavors', 'sizes'] },
  FOOD_BUSINESS: { label: 'Food Business', labelEn: 'Food Business', fields: ['portions', 'deliveryZone'] },
  OTHER: { label: 'Autre', labelEn: 'Other', fields: [] },
};

// Business types made on order — no stock to track
const ORDER_BASED_TYPES = new Set([
  'CAKES', 'FOOD_BUSINESS',
]);

// Translated labels for adaptive fields (FR / EN)
const FIELD_LABELS: Record<string, { fr: string; en: string; placeholder?: string }> = {
  color: { fr: 'Couleur', en: 'Color' },
  sizes: { fr: 'Tailles & quantités', en: 'Sizes & quantities', placeholder: 'Ex: S:5, M:10, L:7' },
  brand: { fr: 'Marque', en: 'Brand' },
  volume: { fr: 'Volume', en: 'Volume', placeholder: 'Ex: 50ml, 100ml' },
  type: { fr: 'Type', en: 'Type' },
  material: { fr: 'Matière', en: 'Material' },
  model: { fr: 'Modèle', en: 'Model' },
  warranty: { fr: 'Garantie', en: 'Warranty', placeholder: 'Ex: 6 mois, 1 an' },
  weight: { fr: 'Poids', en: 'Weight', placeholder: 'Ex: 1kg, 500g' },
  minQuantity: { fr: 'Quantité minimale', en: 'Minimum quantity' },
  flavors: { fr: 'Parfums / Saveurs', en: 'Flavors', placeholder: 'Ex: Vanille, Chocolat, Fraise' },
  portions: { fr: 'Portions', en: 'Portions', placeholder: 'Ex: 1 personne, 4 personnes' },
  deliveryZone: { fr: 'Zone de livraison', en: 'Delivery zone', placeholder: 'Ex: Akwa, Bonapriso' },
  length: { fr: 'Métrage', en: 'Length', placeholder: 'Ex: 6 yards, 3 m' },
  measurements: { fr: 'Mesures', en: 'Measurements', placeholder: 'Ex: tour de taille, longueur' },
};

const defaultForm = {
  name: '', businessType: 'OTHER', costPrice: '' as string | number, sellingPrice: '' as string | number,
  totalStock: '' as string | number, lowStockAlert: '' as string | number, categoryId: null as string | null,
  adaptiveFields: {} as Record<string, unknown>,
  image: '' as string,
  barcode: '' as string,
  variants: [] as VariantRow[],
  unitSale: false,
  packName: '' as string,
  packSize: '' as string | number,
  unitPrice: '' as string | number,
  extraUnits: '' as string | number,
  priceTiers: [] as Array<{ minQty: string; price: string }>,
};

export function ProductsPage() {
  const { t, language } = useTranslation();
  const tenant = useAuthStore((s) => s.tenant);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;
  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') === '1') setShowForm(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [showScanner, setShowScanner] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Quick fill: one line per size (its prices), colours shared by all sizes unless a size lists its own.
  const emptySize = () => ({ name: '', costPrice: '', sellingPrice: '', unitPrice: '', colors: '' });
  const [gen, setGen] = useState({ colors: '', sizes: [emptySize()] });
  const [bulkStock, setBulkStock] = useState('');
  const fr = language === 'fr';

  // New rows start with the last variant's prices (or the product prices), so only what differs needs typing.
  const newRow = (name = ''): VariantRow => {
    const last = form.variants[form.variants.length - 1];
    return { name, sellingPrice: last?.sellingPrice ?? String(form.sellingPrice ?? ''), costPrice: last?.costPrice ?? String(form.costPrice ?? ''), stock: '', extra: '', unitPrice: last?.unitPrice ?? String(form.unitPrice ?? ''), barcode: '' };
  };
  const setRow = (i: number, patch: Partial<VariantRow>) => setForm((prev) => ({ ...prev, variants: prev.variants.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const generateVariants = () => {
    const split = (x: string) => x.split(',').map((c) => c.trim()).filter(Boolean);
    const common = split(gen.colors);
    const sizes = gen.sizes.filter((z) => z.name.trim());
    const base = newRow();
    const rows: VariantRow[] = sizes.length
      ? sizes.flatMap((z) => {
          const colors = split(z.colors).length ? split(z.colors) : common;
          const names = colors.length ? colors.map((c) => `${z.name.trim()} · ${c}`) : [z.name.trim()];
          return names.map((name) => ({ ...base, name, costPrice: z.costPrice || base.costPrice, sellingPrice: z.sellingPrice || base.sellingPrice, unitPrice: z.unitPrice || base.unitPrice }));
        })
      : common.map((name) => ({ ...base, name }));
    const existing = new Set(form.variants.map((r) => r.name.toLowerCase()));
    const added = rows.filter((r) => !existing.has(r.name.toLowerCase()));
    if (!added.length) { toast.error(fr ? 'Écrivez au moins une taille ou des couleurs séparées par des virgules' : 'Type at least one size or colours separated by commas'); return; }
    setForm((prev) => ({ ...prev, variants: [...prev.variants, ...added] }));
    setGen({ colors: '', sizes: [emptySize()] });
  };
  const setSize = (i: number, patch: Partial<ReturnType<typeof emptySize>>) => setGen((g) => ({ ...g, sizes: g.sizes.map((z, j) => (j === i ? { ...z, ...patch } : z)) }));
  const removeRow = (i: number) => setForm((prev) => ({ ...prev, variants: prev.variants.filter((_, j) => j !== i) }));
  const setRows = (idx: number[], patch: Partial<VariantRow>) => setForm((prev) => ({ ...prev, variants: prev.variants.map((r, j) => (idx.includes(j) ? { ...r, ...patch } : r)) }));
  // "Large · Rouge", "Large · Vert"… are shown together under "Large" with one price when they share it.
  const groupKey = (name: string) => (name.includes(' · ') ? name.split(' · ')[0] : '');
  const variantGroups: Array<{ key: string; idx: number[] }> = [];
  form.variants.forEach((r, i) => {
    const key = groupKey(r.name);
    const g = key ? variantGroups.find((x) => x.key === key) : undefined;
    if (g) g.idx.push(i); else variantGroups.push({ key, idx: [i] });
  });
  const variantCard = (r: VariantRow, i: number) => (
                    <div key={i} className="rounded-md bg-muted/40 p-2 space-y-1.5">
                      <div className="flex gap-2">
                        <Input className="h-8" placeholder={fr ? 'Nom de la variante' : 'Variant name'} value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} />
                        <Button type="button" variant="ghost" size="sm" className="h-8 text-destructive" onClick={() => removeRow(i)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <label className="text-[10px] text-muted-foreground">{fr ? `Achat (1 ${mainWord})` : `Cost (1 ${mainWord})`}<Input className="h-8" type="number" min={0} value={r.costPrice} onChange={(e) => setRow(i, { costPrice: e.target.value })} /></label>
                        <label className="text-[10px] text-muted-foreground">{fr ? `Vente (1 ${mainWord})` : `Price (1 ${mainWord})`}<Input className="h-8" type="number" min={0} value={r.sellingPrice} onChange={(e) => setRow(i, { sellingPrice: e.target.value })} /></label>
                        {!ORDER_BASED_TYPES.has(form.businessType) && (
                          <label className="text-[10px] text-muted-foreground">{`Stock (${mainWord}s)`}<Input className="h-8" type="number" value={r.stock} onChange={(e) => setRow(i, { stock: e.target.value })} /></label>
                        )}
                      </div>
                      {form.unitSale && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <label className="text-[10px] text-muted-foreground">{fr ? "Prix d'1 unité" : 'Price of 1 unit'}<Input className="h-8" type="number" min={0} value={r.unitPrice} onChange={(e) => setRow(i, { unitPrice: e.target.value })} /></label>
                          {!ORDER_BASED_TYPES.has(form.businessType) && (
                            <label className="text-[10px] text-muted-foreground">{fr ? '+ unités en stock' : '+ loose units'}<Input className="h-8" type="number" min={0} value={r.extra} onChange={(e) => setRow(i, { extra: e.target.value })} /></label>
                          )}
                        </div>
                      )}
                      <Input className="h-8" placeholder={fr ? 'Code-barres (facultatif)' : 'Barcode (optional)'} value={r.barcode} onChange={(e) => setRow(i, { barcode: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
                    </div>
  );
  const samePrices = (idx: number[]) => idx.every((i) => (['costPrice', 'sellingPrice', 'unitPrice'] as const).every((k) => form.variants[i][k] === form.variants[idx[0]][k]));
  const filledRows = form.variants.filter((r) => r.name.trim() && !r.name.trim().endsWith('·'));
  // Stock is stored in units; the form counts packs (+ loose units) when the product is also sold by unit.
  const packN = form.unitSale ? Math.max(1, parseInt(String(form.packSize)) || 1) : 1;
  const toUnits = (stock: string | number, extra: string | number) => (parseInt(String(stock)) || 0) * packN + (form.unitSale ? parseInt(String(extra)) || 0 : 0);
  const variantStock = filledRows.reduce((sum, r) => sum + toUnits(r.stock, r.extra), 0);
  const mainWord = form.unitSale ? (form.packName.trim() || (fr ? 'paquet' : 'pack')).toLowerCase() : (fr ? 'pièce' : 'item');

  const debouncedSearch = useDebounce(search);

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get('/products', { params: { search: debouncedSearch, limit: PAGE_SIZE, page } });
      setProducts(data.data);
      const totalCount = data.pagination?.total || data.data.length;
      setTotal(totalCount);
      setTotalPages(Math.max(1, Math.ceil(totalCount / PAGE_SIZE)));
    } catch (err) { console.error(err); toast.error(getApiErrorMessage(err)); }
    finally { setLoading(false); }
  }, [debouncedSearch, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const r2 = (x: number) => Math.round(x * 100) / 100;
    const { unitSale } = form;
    const variants = filledRows.map((r) => {
      const main = Number(r.sellingPrice) || 0;
      return {
        name: r.name.trim(),
        sellingPrice: unitSale ? Number(r.unitPrice || form.unitPrice) || 0 : main,
        costPrice: r2((Number(r.costPrice) || 0) / packN),
        stock: toUnits(r.stock, r.extra),
        barcode: r.barcode.trim() || null,
        packPrice: unitSale ? main : null,
      };
    });
    const unpriced = filledRows.find((r) => !(Number(r.sellingPrice) > 0));
    if (unpriced) {
      toast.error(fr ? `Mettez le prix de vente de « ${unpriced.name.trim()} »` : `Enter the selling price of "${unpriced.name.trim()}"`);
      return;
    }
    if (unitSale && packN < 2) {
      toast.error(fr ? 'Indiquez combien d’unités il y a dans un paquet (2 ou plus)' : 'Enter how many units are in a pack (2 or more)');
      return;
    }
    if (unitSale && (variants.length ? variants.some((v) => !(v.sellingPrice > 0)) : !(Number(form.unitPrice) > 0))) {
      toast.error(fr ? "Indiquez le prix d'une unité" : 'Enter the price of one unit');
      return;
    }
    const adaptiveFields = { ...form.adaptiveFields };
    if (variants.length) delete adaptiveFields.sizes;
    const mainPriceIn = Number(form.sellingPrice) || 0;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        businessType: form.businessType,
        categoryId: form.categoryId,
        adaptiveFields,
        variants,
        packSize: unitSale ? packN : null,
        packPrice: unitSale ? (variants.length ? Math.min(...variants.map((v) => v.packPrice ?? 0)) : mainPriceIn) : null,
        packName: unitSale ? form.packName.trim() || null : null,
        priceTiers: form.priceTiers.map((t) => ({ minQty: parseInt(t.minQty) || 0, price: Number(t.price) || 0 })).filter((t) => t.minQty >= 2 && t.price > 0),
        image: formImages[0] || '',
        images: formImages,
        barcode: form.barcode.trim() || null,
        costPrice: r2((Number(form.costPrice) || 0) / packN),
        sellingPrice: variants.length ? Math.min(...variants.map((v) => v.sellingPrice)) : unitSale ? Number(form.unitPrice) || 0 : mainPriceIn,
        totalStock: variants.length ? variantStock : toUnits(form.totalStock, form.extraUnits),
        lowStockAlert: (form.lowStockAlert === '' ? 5 : Number(form.lowStockAlert)) * packN,
      };
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      toast.success(language === 'fr' ? 'Produit enregistré' : 'Product saved');
      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm);
      setFormImages([]);
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, language === 'fr' ? "Échec de l'enregistrement" : 'Failed to save'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product: Product) => {
    const n = product.packSize && product.packSize > 1 ? product.packSize : 1;
    const r2 = (x: number) => Math.round(x * 100) / 100;
    const packs = (units: number) => Math.trunc(units / n);
    const loose = (units: number) => (n > 1 && units - packs(units) * n ? String(units - packs(units) * n) : '');
    setForm({
      name: product.name,
      businessType: product.businessType,
      costPrice: r2(product.costPrice * n),
      sellingPrice: n > 1 ? product.packPrice ?? product.sellingPrice * n : product.sellingPrice,
      totalStock: packs(product.totalStock),
      extraUnits: loose(product.totalStock),
      lowStockAlert: n > 1 ? Math.round(product.lowStockAlert / n) : product.lowStockAlert,
      categoryId: product.category?.id ?? null,
      adaptiveFields: (product.adaptiveFields || {}) as Record<string, unknown>,
      image: product.image || '',
      barcode: product.barcode || '',
      variants: variantsOf(product).length
        ? variantsOf(product).map((v) => ({
            name: v.name,
            costPrice: String(r2((v.costPrice ?? 0) * n)),
            sellingPrice: String(n > 1 ? v.packPrice || product.packPrice || v.sellingPrice * n : v.sellingPrice),
            stock: String(packs(v.stock)),
            extra: loose(v.stock),
            unitPrice: n > 1 ? String(v.sellingPrice) : '',
            barcode: v.barcode || '',
          }))
        : legacySizes(product).map(([k, q]) => ({ name: k, sellingPrice: String(product.sellingPrice), costPrice: String(product.costPrice), stock: String(q), extra: '', unitPrice: '', barcode: '' })),
      unitSale: n > 1,
      packName: product.packName || '',
      packSize: n > 1 ? n : '',
      unitPrice: n > 1 ? product.sellingPrice : '',
      priceTiers: (product.priceTiers ?? []).map((t) => ({ minQty: String(t.minQty), price: String(t.price) })),
    });
    setFormImages(product.images?.length ? product.images : product.image ? [product.image] : []);
    setEditingId(product.id);
    setShowForm(true);
  };

  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [restockForm, setRestockForm] = useState({ quantity: '', unitCost: '', variant: '', supplierId: '', recordExpense: true });
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const restockVariants = !restockTarget ? []
    : variantsOf(restockTarget).length ? variantsOf(restockTarget).map((v) => v.name)
    : legacySizes(restockTarget).map(([k]) => k);
  const openRestock = (product: Product) => {
    setRestockTarget(product);
    setRestockForm({ quantity: '', unitCost: String(product.costPrice || ''), variant: '', supplierId: '', recordExpense: true });
    api.get('/suppliers', { params: { limit: 100 } }).then((r) => setSuppliers(r.data.data || [])).catch(() => setSuppliers([]));
  };
  const submitRestock = async () => {
    if (!restockTarget) return;
    const restockN = restockTarget?.packSize && restockTarget.packSize > 1 ? restockTarget.packSize : 1;
    const quantity = parseInt(restockForm.quantity) * restockN;
    if (!quantity || quantity <= 0) { toast.error(language === 'fr' ? 'Indiquez une quantité' : 'Enter a quantity'); return; }
    if (restockVariants.length > 0 && !restockForm.variant) { toast.error(language === 'fr' ? 'Choisissez la taille / variante' : 'Choose the size / variant'); return; }
    setSubmitting(true);
    try {
      await api.post(`/products/${restockTarget.id}/restock`, {
        quantity,
        unitCost: restockForm.unitCost === '' ? undefined : Number(restockForm.unitCost) / restockN,
        variant: restockForm.variant || undefined,
        supplierId: restockForm.supplierId || undefined,
        recordExpense: restockForm.recordExpense,
      });
      toast.success(language === 'fr' ? 'Stock mis à jour' : 'Stock updated');
      setRestockTarget(null);
      fetchProducts();
    } catch (err) {
      toast.error(getApiErrorMessage(err, language === 'fr' ? 'Erreur de réapprovisionnement' : 'Restock failed'));
    } finally {
      setSubmitting(false);
    }
  };
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const handleDelete = (id: string) => setDeleteTarget(id);
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/products/${deleteTarget}`);
      toast.success(language === 'fr' ? 'Produit supprimé' : 'Product deleted');
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, language === 'fr' ? 'Échec de la suppression' : 'Failed to delete'));
    } finally { setDeleteTarget(null); }
  };

  const [scanForForm, setScanForForm] = useState(false);

  const handleBarcodeScan = async (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    setShowScanner(false);
    if (scanForForm) {
      setForm((prev) => ({ ...prev, barcode: code }));
      return;
    }
    try {
      const { data } = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
      if (data.data) handleEdit(data.data);
    } catch {
      // Unknown code: start a new product with this barcode already filled in
      setForm({ ...defaultForm, barcode: code });
      setFormImages([]);
      setEditingId(null);
      setShowForm(true);
      toast(language === 'fr' ? `Nouveau code ${code} : créez le produit` : `New code ${code}: create the product`);
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
      toast.error(getApiErrorMessage(err, language === 'fr' ? 'Échec de l\'export' : 'Export failed'));
    }
  };

  const businessTypes = tenant?.businessCategories || ['OTHER'];
  const canScan = tenant?.plan === 'SHOP' || tenant?.plan === 'BUSINESS';

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{t('products.title')}</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">CSV</span>
          </Button>
          {canScan && (
            <Button variant="outline" size="sm" onClick={() => { setScanForForm(false); setShowScanner(true); }}>
              <ScanLine className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Scanner</span>
            </Button>
          )}
          <Button size="sm" onClick={() => { setForm(defaultForm); setFormImages([]); setEditingId(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> {t('products.addProduct')}
          </Button>
        </div>
      </div>

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
                  <label className="text-sm font-medium mb-1 block">{language === 'fr' ? 'Code-barres (facultatif)' : 'Barcode (optional)'}</label>
                  <div className="flex gap-2">
                    <Input
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      placeholder={language === 'fr' ? 'Scannez ou tapez le code' : 'Scan or type the code'}
                      inputMode="text"
                    />
                    {canScan && (
                      <Button type="button" variant="outline" onClick={() => { setScanForForm(true); setShowScanner(true); }} title={language === 'fr' ? 'Scanner' : 'Scan'}>
                        <ScanLine className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <ImageUpload
                  values={formImages}
                  onChange={setFormImages}
                  label={language === 'fr' ? 'Photos du produit (la 1re est la principale)' : 'Product photos (the first is the main one)'}
                />

                <div>
                  <label className="text-sm font-medium mb-1 block">{t('products.category')}</label>
                  <div className="flex flex-wrap gap-2">
                    {businessTypes.map((bt) => (
                      <button key={bt} type="button"
                        onClick={() => setForm({ ...form, businessType: bt })}
                        className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer',
                          form.businessType === bt ? 'bg-blue-600 text-white border-blue-600' : 'border-border hover:border-blue-300'
                        )}>
                        {ADAPTIVE_FIELDS[bt]?.label || bt}
                      </button>
                    ))}
                  </div>
                </div>

                {filledRows.length > 0 ? (
                  <p className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                    {fr ? 'Ce produit a des variantes : les prix et le stock se mettent dans chaque variante, plus bas.' : 'This product has variants: prices and stock are set on each variant below.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">{fr ? `Prix d'achat (1 ${mainWord})` : `Purchase price (1 ${mainWord})`}</label>
                      <Input type="number" min={0} placeholder="0" value={form.costPrice ?? ''} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">{fr ? `Prix de vente (1 ${mainWord})` : `Selling price (1 ${mainWord})`}</label>
                      <Input type="number" min={0} placeholder="0" value={form.sellingPrice ?? ''} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
                    </div>
                  </div>
                )}

                {ORDER_BASED_TYPES.has(form.businessType) ? (
                  <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                    {language === 'fr'
                      ? 'Produit fait sur commande — pas de gestion de stock. La date de livraison se définit lors de la commande.'
                      : 'Made-to-order product — no stock tracking. Delivery date is set when the order is placed.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">{filledRows.length > 0 ? (fr ? 'Stock total (calculé)' : 'Total stock (calculated)') : `${t('products.stock')} (${mainWord}s)`}</label>
                      {filledRows.length > 0 ? (
                        <Input value={stockText({ sellingPrice: 0, totalStock: 0, packSize: packN, packName: form.packName }, variantStock, fr)} readOnly className="bg-gray-50" title={t('products.autoCalculated')} />
                      ) : (
                        <div className="flex gap-2">
                          <Input type="number" min={0} placeholder="0" value={form.totalStock ?? ''} onChange={(e) => setForm({ ...form, totalStock: e.target.value })} />
                          {form.unitSale && (
                            <Input type="number" min={0} className="w-24" placeholder={fr ? '+ unités' : '+ units'} value={form.extraUnits ?? ''} onChange={(e) => setForm({ ...form, extraUnits: e.target.value })} />
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">{t('products.lowStock')}{form.unitSale ? ` (${mainWord}s)` : ''}</label>
                      <Input type="number" min={0} placeholder="5" value={form.lowStockAlert ?? ''} onChange={(e) => setForm({ ...form, lowStockAlert: e.target.value })} />
                    </div>
                  </div>
                )}

                {/* Variants: own price & stock per size / colour */}
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{fr ? 'Variantes (taille, couleur, modèle…)' : 'Variants (size, colour, model…)'}</p>
                    <Button type="button" size="sm" variant="outline" onClick={() => setForm((prev) => ({ ...prev, variants: [...prev.variants, newRow()] }))}>
                      <Plus className="w-3 h-3 mr-1" /> {fr ? 'Ajouter' : 'Add'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fr ? 'Facultatif. Chaque variante a son prix et son stock. Ex : « Grand · Doré ».' : 'Optional. Each variant has its own price and stock. E.g. "Large · Gold".'}
                  </p>
                  <div className="rounded-md border border-dashed border-border p-2 space-y-1.5">
                    <p className="text-xs font-medium">{fr ? 'Remplir vite : une ligne par taille, avec son prix' : 'Quick fill: one line per size, with its price'}</p>
                    <Input className="h-8" placeholder={fr ? 'Couleurs pour toutes les tailles : Rouge, Vert, Jaune' : 'Colours for all sizes: Red, Green, Yellow'} value={gen.colors} onChange={(e) => setGen({ ...gen, colors: e.target.value })} />
                    {gen.sizes.map((z, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex gap-1.5">
                          <Input className="h-8 flex-1 min-w-0" placeholder={fr ? 'Taille : Large' : 'Size: Large'} value={z.name} onChange={(e) => setSize(i, { name: e.target.value })} />
                          <Input className="h-8 w-20" type="number" min={0} placeholder={fr ? 'Achat' : 'Cost'} value={z.costPrice} onChange={(e) => setSize(i, { costPrice: e.target.value })} />
                          <Input className="h-8 w-20" type="number" min={0} placeholder={fr ? 'Vente' : 'Price'} value={z.sellingPrice} onChange={(e) => setSize(i, { sellingPrice: e.target.value })} />
                          {form.unitSale && (
                            <Input className="h-8 w-20" type="number" min={0} placeholder={fr ? '1 unité' : '1 unit'} value={z.unitPrice} onChange={(e) => setSize(i, { unitPrice: e.target.value })} />
                          )}
                          {gen.sizes.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => setGen((g) => ({ ...g, sizes: g.sizes.filter((_, j) => j !== i) }))}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        {z.name.trim() && (
                          <Input className="h-7 text-xs" placeholder={fr ? `Autres couleurs pour ${z.name.trim()} (sinon les mêmes)` : `Other colours for ${z.name.trim()} (else the same)`} value={z.colors} onChange={(e) => setSize(i, { colors: e.target.value })} />
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setGen((g) => ({ ...g, sizes: [...g.sizes, emptySize()] }))}>
                        <Plus className="w-3 h-3 mr-1" /> {fr ? 'Taille' : 'Size'}
                      </Button>
                      <Button type="button" size="sm" variant="secondary" className="flex-1" disabled={!gen.colors.trim() && !gen.sizes.some((z) => z.name.trim())} onClick={generateVariants}>
                        {fr ? 'Créer les variantes' : 'Create variants'}
                      </Button>
                    </div>
                  </div>
                  {form.variants.length > 1 && !ORDER_BASED_TYPES.has(form.businessType) && (
                    <div className="flex gap-2">
                      <Input className="h-8 w-24" type="number" min={0} placeholder="20" value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} />
                      <Button type="button" size="sm" variant="outline" className="h-8" disabled={bulkStock === ''} onClick={() => setForm((prev) => ({ ...prev, variants: prev.variants.map((r) => ({ ...r, stock: bulkStock })) }))}>
                        {fr ? 'Même stock partout' : 'Same stock for all'}
                      </Button>
                    </div>
                  )}
                  {variantGroups.map((g) => {
                    if (!g.key || g.idx.length < 2 || !samePrices(g.idx)) return g.idx.map((i) => variantCard(form.variants[i], i));
                    const first = form.variants[g.idx[0]];
                    const last = g.idx[g.idx.length - 1];
                    return (
                      <div key={`g-${g.idx[0]}`} className="rounded-md bg-muted/40 p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">{g.key}</p>
                          <span className="text-[10px] text-muted-foreground">{g.idx.length} {fr ? 'variantes · même prix' : 'variants · same price'}</span>
                        </div>
                        <div className={`grid gap-1.5 ${form.unitSale ? 'grid-cols-3' : 'grid-cols-2'}`}>
                          <label className="text-[10px] text-muted-foreground">{fr ? `Achat (1 ${mainWord})` : `Cost (1 ${mainWord})`}<Input className="h-8" type="number" min={0} value={first.costPrice} onChange={(e) => setRows(g.idx, { costPrice: e.target.value })} /></label>
                          <label className="text-[10px] text-muted-foreground">{fr ? `Vente (1 ${mainWord})` : `Price (1 ${mainWord})`}<Input className="h-8" type="number" min={0} value={first.sellingPrice} onChange={(e) => setRows(g.idx, { sellingPrice: e.target.value })} /></label>
                          {form.unitSale && (
                            <label className="text-[10px] text-muted-foreground">{fr ? "Prix d'1 unité" : 'Price of 1 unit'}<Input className="h-8" type="number" min={0} value={first.unitPrice} onChange={(e) => setRows(g.idx, { unitPrice: e.target.value })} /></label>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {[fr ? 'Couleur / modèle' : 'Colour / model', !ORDER_BASED_TYPES.has(form.businessType) ? `Stock (${mainWord}s)` : '', fr ? 'Code-barres' : 'Barcode'].filter(Boolean).join(' · ')}
                        </p>
                        {g.idx.map((i) => {
                          const r = form.variants[i];
                          return (
                            <div key={i} className="flex gap-1.5">
                              <Input className="h-8 flex-1 min-w-0" placeholder={fr ? 'Couleur' : 'Colour'} value={r.name.slice(g.key.length + 3)} onChange={(e) => setRow(i, { name: `${g.key} · ${e.target.value}` })} />
                              {!ORDER_BASED_TYPES.has(form.businessType) && (
                                <Input className="h-8 w-16" type="number" placeholder="0" value={r.stock} onChange={(e) => setRow(i, { stock: e.target.value })} />
                              )}
                              {form.unitSale && !ORDER_BASED_TYPES.has(form.businessType) && (
                                <Input className="h-8 w-14" type="number" min={0} placeholder={fr ? '+ u.' : '+ u.'} title={fr ? '+ unités en stock' : '+ loose units'} value={r.extra} onChange={(e) => setRow(i, { extra: e.target.value })} />
                              )}
                              <Input className="h-8 w-24" placeholder={fr ? 'Code' : 'Code'} value={r.barcode} onChange={(e) => setRow(i, { barcode: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
                              <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-destructive" onClick={() => removeRow(i)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          );
                        })}
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setForm((prev) => ({ ...prev, variants: [...prev.variants.slice(0, last + 1), { ...prev.variants[g.idx[0]], name: `${g.key} · `, stock: '', extra: '', barcode: '' }, ...prev.variants.slice(last + 1)] }))}>
                          <Plus className="w-3 h-3 mr-1" /> {fr ? `Couleur en ${g.key}` : `Colour in ${g.key}`}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Normally sold by pack; optionally also by single unit */}
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={form.unitSale} onChange={(e) => setForm({ ...form, unitSale: e.target.checked })} />
                    {fr ? "Vendu aussi à l'unité (au détail)" : 'Also sold by single unit (retail)'}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {form.unitSale
                      ? (fr ? "Les prix ci-dessus sont ceux du paquet (gros). La caisse vend le paquet par défaut, avec un bouton « Unité »." : 'Prices above are for the pack (wholesale). The register sells the pack by default, with a "Unit" button.')
                      : (fr ? "Décoché : la caisse vend directement au prix ci-dessus. Cochez si vous vendez aussi la pièce seule d'un paquet." : 'Unchecked: the register sells at the price above. Tick it if you also sell single pieces from a pack.')}
                  </p>
                  {form.unitSale && (
                    <div className="grid grid-cols-3 gap-2">
                      <label className="text-[10px] text-muted-foreground">{fr ? 'Nom (paquet, carton…)' : 'Name (pack, box…)'}<Input className="h-8" placeholder={fr ? 'Paquet' : 'Pack'} value={form.packName} onChange={(e) => setForm({ ...form, packName: e.target.value })} /></label>
                      <label className="text-[10px] text-muted-foreground">{fr ? `Unités dans 1 ${mainWord}` : `Units in 1 ${mainWord}`}<Input className="h-8" type="number" min={2} placeholder="10" value={form.packSize} onChange={(e) => setForm({ ...form, packSize: e.target.value })} /></label>
                      <label className="text-[10px] text-muted-foreground">{fr ? "Prix d'1 unité" : 'Price of 1 unit'}<Input className="h-8" type="number" min={0} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value, variants: form.variants.map((r) => (r.unitPrice ? r : { ...r, unitPrice: e.target.value })) })} /></label>
                    </div>
                  )}
                </div>

                {/* Quantity prices */}
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{fr ? 'Prix selon la quantité (facultatif)' : 'Quantity prices (optional)'}</p>
                    {form.priceTiers.length < 5 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, priceTiers: [...form.priceTiers, { minQty: '', price: '' }] })}>
                        + {fr ? 'Ajouter' : 'Add'}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fr ? `Ex : à partir de 10 → 1 750 par ${mainWord}. La caisse met ce prix toute seule, toutes variantes ensemble.` : `E.g. from 10 → 1,750 per ${mainWord}. Applied automatically, all variants together.`}
                  </p>
                  {form.priceTiers.map((t, i) => {
                    const setTier = (patch: Partial<typeof t>) => setForm({ ...form, priceTiers: form.priceTiers.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">{fr ? 'À partir de' : 'From'}</span>
                        <Input className="h-8 w-20" type="number" min={2} placeholder="10" value={t.minQty} onChange={(e) => setTier({ minQty: e.target.value })} />
                        <span className="text-xs text-muted-foreground shrink-0">→</span>
                        <Input className="h-8" type="number" min={0} placeholder={fr ? `Prix d'1 ${mainWord}` : `Price of 1 ${mainWord}`} value={t.price} onChange={(e) => setTier({ price: e.target.value })} />
                        <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, priceTiers: form.priceTiers.filter((_, j) => j !== i) })}>×</Button>
                      </div>
                    );
                  })}
                </div>

                {/* Adaptive Fields */}
                {form.businessType && ADAPTIVE_FIELDS[form.businessType]?.fields.filter((field) => field !== 'sizes').map((field) => {
                  const meta = FIELD_LABELS[field];
                  const label = meta ? (language === 'fr' ? meta.fr : meta.en) : field;
                  return (
                    <div key={field}>
                      <label className="text-sm font-medium mb-1 block">{label}</label>
                      <Input
                        placeholder={meta?.placeholder || ''}
                        value={typeof form.adaptiveFields[field] === 'string' ? form.adaptiveFields[field] as string : ''}
                        onChange={(e) => setForm({ ...form, adaptiveFields: { ...form.adaptiveFields, [field]: e.target.value } })}
                      />
                    </div>
                  );
                })}

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? (language === 'fr' ? 'Enregistrement...' : 'Saving...') : t('common.save')}
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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow overflow-hidden">
                {product.image ? (
                  <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Package className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="min-w-0 flex-1 mr-2">
                      <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                      <p className="text-xs text-muted-foreground">{ADAPTIVE_FIELDS[product.businessType]?.label || product.businessType}</p>
                    </div>
                    <Badge variant={isLowStock(product) ? 'warning' : 'secondary'} className="shrink-0 text-xs">
                      {stockText(product, product.totalStock, fr)}
                    </Badge>
                  </div>
                  {(variantsOf(product).length > 0 || product.packSize || isLowStock(product)) && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {variantsOf(product).length > 0 && <Badge variant="outline" className="text-[10px]">{variantsOf(product).length} {fr ? 'variantes' : 'variants'}</Badge>}
                      {product.packSize ? <Badge variant="outline" className="text-[10px]">{product.packName || (fr ? 'Paquet' : 'Pack')} ×{product.packSize}</Badge> : null}
                      {isLowStock(product) && !ORDER_BASED_TYPES.has(product.businessType) && (
                        <Badge variant="warning" className="text-[10px]">
                          {fr ? 'Stock bas' : 'Low stock'}{variantsOf(product).length ? ` : ${variantsOf(product).filter((v) => v.stock <= product.lowStockAlert).map((v) => v.name).join(', ')}` : ''}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{t('products.costPrice')}</p>
                      <p className="text-xs sm:text-sm">{formatCurrency(product.costPrice * (product.packSize && product.packSize > 1 ? product.packSize : 1))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{t('products.sellingPrice')}</p>
                      <p className="text-xs sm:text-sm font-bold text-blue-600">{hasMainRange(product) ? (fr ? 'dès ' : 'from ') : ''}{formatCurrency(mainPrice(product))}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => handleEdit(product)}>
                      <Pencil className="w-3 h-3 mr-1" /> {t('common.edit')}
                    </Button>
                    <Button variant="outline" size="sm" className="h-8" title={language === 'fr' ? 'Réapprovisionner' : 'Restock'} onClick={() => openRestock(product)}>
                      <PackagePlus className="w-3 h-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-destructive hover:text-destructive" onClick={() => handleDelete(product.id)}>
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
      {restockTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setRestockTarget(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">{language === 'fr' ? 'Réapprovisionner' : 'Restock'} · {restockTarget.name}</h3>
              <Button variant="ghost" size="icon" onClick={() => setRestockTarget(null)}><X className="w-4 h-4" /></Button>
            </div>
            {restockVariants.length > 0 && (
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={restockForm.variant} onChange={(e) => setRestockForm({ ...restockForm, variant: e.target.value })}>
                <option value="">{language === 'fr' ? 'Taille / variante' : 'Size / variant'}</option>
                {restockVariants.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            )}
            <Input type="number" min={1} placeholder={restockTarget?.packSize ? (fr ? `Nombre de ${(restockTarget.packName || 'paquet').toLowerCase()}s reçus` : 'Packs received') : (language === 'fr' ? 'Quantité reçue' : 'Quantity received')} value={restockForm.quantity} onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })} />
            <Input type="number" min={0} placeholder={restockTarget?.packSize ? (fr ? `Prix d'achat d'1 ${(restockTarget.packName || 'paquet').toLowerCase()}` : 'Purchase price of 1 pack') : (language === 'fr' ? "Prix d'achat unitaire" : 'Unit purchase price')} value={restockForm.unitCost} onChange={(e) => setRestockForm({ ...restockForm, unitCost: e.target.value })} />
            {suppliers.length > 0 && (
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={restockForm.supplierId} onChange={(e) => setRestockForm({ ...restockForm, supplierId: e.target.value })}>
                <option value="">{language === 'fr' ? 'Fournisseur (optionnel)' : 'Supplier (optional)'}</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input type="checkbox" checked={restockForm.recordExpense} onChange={(e) => setRestockForm({ ...restockForm, recordExpense: e.target.checked })} />
              {language === 'fr' ? 'Enregistrer l\'achat dans les dépenses' : 'Record the purchase in expenses'}
            </label>
            {restockForm.quantity && restockForm.unitCost && (
              <p className="text-sm text-gray-500">{language === 'fr' ? 'Total achat' : 'Purchase total'} : {formatCurrency(Number(restockForm.quantity) * Number(restockForm.unitCost))}</p>
            )}
            <Button className="w-full" disabled={submitting} onClick={submitRestock}>{language === 'fr' ? 'Ajouter au stock' : 'Add to stock'}</Button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        message={language === 'fr' ? 'Supprimer ce produit ?' : 'Delete this product?'}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
