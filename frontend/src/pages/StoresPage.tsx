import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n/useTranslation';
import { Store, Plus, X, MapPin, Phone, Pencil, Trash2, Users, Package } from 'lucide-react';
import api from '@/lib/api';

interface StoreData {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  isMain: boolean;
  isActive: boolean;
  _count: { users: number; products: number };
}

export function StoresPage() {
  const { t } = useTranslation();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '' });

  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await api.get('/stores');
        if (mounted) setStores(data.data);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    refreshRef.current = load;
    load();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/stores/${editingId}`, form);
      } else {
        await api.post('/stores', form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', address: '', phone: '' });
      refreshRef.current();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (store: StoreData) => {
    setForm({ name: store.name, address: store.address || '', phone: store.phone || '' });
    setEditingId(store.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.confirm') + '?')) return;
    try {
      await api.delete(`/stores/${id}`);
      refreshRef.current();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kabrak-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="w-6 h-6" /> {t('nav.stores')}
        </h1>
        <Button onClick={() => { setForm({ name: '', address: '', phone: '' }); setEditingId(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> {t('stores.addStore')}
        </Button>
      </div>

      {stores.length === 0 ? (
        <div className="text-center py-12">
          <Store className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">{t('common.noResults')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <Card key={store.id} className={`relative ${store.isMain ? 'border-2 border-kabrak-500' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{store.name}</h3>
                    {store.isMain && (
                      <Badge variant="default" className="mt-1">Principal</Badge>
                    )}
                  </div>
                  <Badge variant={store.isActive ? 'success' : 'destructive'}>
                    {store.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>

                {store.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <MapPin className="w-3 h-3" /> {store.address}
                  </div>
                )}
                {store.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Phone className="w-3 h-3" /> {store.phone}
                  </div>
                )}

                <div className="flex gap-4 text-sm mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span>{store._count.users} employés</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="w-3 h-3 text-muted-foreground" />
                    <span>{store._count.products} produits</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(store)} className="flex-1">
                    <Pencil className="w-3 h-3 mr-1" /> {t('common.edit')}
                  </Button>
                  {!store.isMain && (
                    <Button variant="outline" size="sm" onClick={() => handleDelete(store.id)} className="text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingId ? t('common.edit') : t('stores.addStore')}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nom du magasin</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Adresse</label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Téléphone</label>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="flex gap-3">
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
    </div>
  );
}
