import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/i18n/useTranslation';
import { Plus, Tags, Pencil, Trash2, X } from 'lucide-react';
import api, { getApiErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface Category {
  id: string; name: string; icon?: string;
  _count?: { products: number };
}

const EMOJI_OPTIONS = [
  '👕', '👟', '👠', '👜', '💄', '⌚', '🎒', '🧢',
  '🍔', '🍕', '🥤', '☕', '🍰', '🍪', '🥗', '🍎',
  '📱', '💻', '🎧', '📷', '🔌', '🔋', '💡', '📺',
  '🏠', '🛋️', '🛏️', '🚿', '🧹', '🧴', '🧼', '🧽',
  '🎁', '🎈', '🎂', '🎄', '🎃', '🎨', '🎭', '🎮',
  '📚', '✏️', '📓', '🔖', '📎', '✂️', '📏', '🖊️',
  '🚗', '🚲', '🛴', '🏍️', '✈️', '🚢', '🚂', '🚀',
  '💊', '🩺', '🦷', '👶', '🧸', '🎾', '⚽', '🏀',
];

export function CategoriesPage() {
  const { t, language } = useTranslation();
  const fr = language === 'fr';
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', icon: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    try { const { data } = await api.get('/categories'); setCategories(data.data); }
    catch (err) { console.error(err); toast.error(getApiErrorMessage(err)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingId) await api.put(`/categories/${editingId}`, form);
      else await api.post('/categories', form);
      toast.success(t('common.saved') || 'Saved');
      setShowForm(false); setEditingId(null); setForm({ name: '', icon: '' });
      fetchCategories();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, t('common.error') || 'Error'));
    } finally { setSubmitting(false); }
  };

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const handleDelete = (id: string) => setDeleteTarget(id);
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/categories/${deleteTarget}`); toast.success(t('common.deleted') || 'Deleted'); fetchCategories(); }
    catch (err) { console.error(err); toast.error(getApiErrorMessage(err, t('common.error') || 'Error')); }
    finally { setDeleteTarget(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.categories')}</h1>
        <Button onClick={() => { setForm({ name: '', icon: '' }); setEditingId(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> {t('common.add')}
        </Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingId ? t('common.edit') : t('common.add')}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="text-sm font-medium mb-1 block">{t('products.name')}</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Icon</label>
                  <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setForm({ ...form, icon: emoji })}
                        className={`text-2xl p-2 rounded-lg transition-all ${form.icon === emoji ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">{t('common.cancel')}</Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? '...' : t('common.save')}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kabrak-500" /></div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12"><Tags className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">{t('common.noResults')}</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{cat.name}</h3>
                  <p className="text-xs text-muted-foreground">{cat._count?.products || 0} {t('products.title').toLowerCase()}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => { setForm({ name: cat.name, icon: cat.icon || '' }); setEditingId(cat.id); setShowForm(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        message={fr ? 'Supprimer cette catégorie ?' : 'Delete this category?'}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
