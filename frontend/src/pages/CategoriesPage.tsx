import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState, Spinner } from '@/components/ui/spinner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useTranslation } from '@/i18n/useTranslation';
import { getErrorMessage } from '@/lib/errors';
import { Plus, Tags, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';

interface Category {
  id: string; name: string; icon?: string;
  _count?: { products: number };
}

export function CategoriesPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', icon: '' });

  const fetchCategories = useCallback(async () => {
    try { const { data } = await api.get('/categories'); setCategories(data.data); }
    catch (err) { toast.error(getErrorMessage(err, t('common.loadError'))); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openForm = (cat?: Category) => {
    setForm({ name: cat?.name || '', icon: cat?.icon || '' });
    setEditingId(cat?.id || null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) await api.put(`/categories/${editingId}`, form);
      else await api.post('/categories', form);
      toast.success(t('common.saved'));
      setShowForm(false); setEditingId(null);
      fetchCategories();
    } catch (err) { toast.error(getErrorMessage(err, t('common.error'))); }
    finally { setSaving(false); }
  };

  const handleDelete = async (cat: Category) => {
    const ok = await confirm({ title: `${t('common.delete')} « ${cat.name} » ?`, description: t('catPage.deleteDesc') });
    if (!ok) return;
    try { await api.delete(`/categories/${cat.id}`); toast.success(t('common.deleted')); fetchCategories(); }
    catch (err) { toast.error(getErrorMessage(err, t('common.error'))); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.categories')}
        actions={<Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> {t('common.add')}</Button>}
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? t('catPage.editTitle') : t('catPage.addTitle')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cat-name">{t('products.name')} *</Label>
              <Input id="cat-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
            </div>
            <div>
              <Label htmlFor="cat-icon">{t('catPage.icon')} <span className="font-normal text-muted-foreground">({t('common.optional')})</span></Label>
              <Input id="cat-icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder={t('catPage.iconHint')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving && <Spinner className="mr-2" />}{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <LoadingState />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={t('catPage.empty')}
          description={t('catPage.emptyDesc')}
          action={<Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> {t('common.add')}</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Tags className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground">{cat._count?.products || 0} {t('catPage.products')}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openForm(cat)} aria-label={t('common.edit')} title={t('common.edit')}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(cat)} className="text-destructive hover:text-destructive" aria-label={t('common.delete')} title={t('common.delete')}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
