import { useEffect, useState } from 'react';
import { Plus, Trash2, Phone, Mail, MapPin, X, Search, Pencil } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import api from '@/lib/api';

interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

const emptyForm = { name: '', phone: '', email: '', address: '', notes: '' };

export function SuppliersPage() {
  const { language } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchSuppliers = async () => {
    const res = await api.get('/suppliers', { params: { limit: 100, search } });
    setSuppliers(res.data.data || []);
  };

  useEffect(() => { fetchSuppliers(); }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, form);
      } else {
        await api.post('/suppliers', form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchSuppliers();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleEdit = (sup: Supplier) => {
    setForm({ name: sup.name, phone: sup.phone || '', email: sup.email || '', address: sup.address || '', notes: sup.notes || '' });
    setEditingId(sup.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'fr' ? 'Supprimer ce fournisseur?' : 'Delete this supplier?')) return;
    await api.delete(`/suppliers/${id}`);
    fetchSuppliers();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {language === 'fr' ? '📦 Fournisseurs' : '📦 Suppliers'}
        </h1>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          {language === 'fr' ? 'Ajouter fournisseur' : 'Add supplier'}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={language === 'fr' ? 'Chercher un fournisseur...' : 'Search suppliers...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
        />
      </div>

      {/* Suppliers list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {suppliers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {language === 'fr' ? 'Aucun fournisseur enregistré' : 'No suppliers recorded'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {suppliers.map((sup) => (
              <div key={sup.id} className="p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-base">{sup.name}</h3>
                    <div className="mt-2 space-y-1">
                      {sup.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{sup.phone}</span>
                        </div>
                      )}
                      {sup.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="truncate">{sup.email}</span>
                        </div>
                      )}
                      {sup.address && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate">{sup.address}</span>
                        </div>
                      )}
                      {sup.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{sup.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => handleEdit(sup)} className="text-muted-foreground hover:text-blue-500 p-1 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(sup.id)} className="text-muted-foreground hover:text-red-500 p-1 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add supplier modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">{editingId ? (language === 'fr' ? 'Modifier fournisseur' : 'Edit supplier') : (language === 'fr' ? 'Nouveau fournisseur' : 'New supplier')}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Nom *</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Tissus Douala"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Téléphone</label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="Ex: 699 00 00 00"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="Ex: contact@fournisseur.com"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Adresse</label>
                <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Ex: Marché central, Douala"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes (optionnel)</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ex: Livraison tous les mardis"
                  rows={2}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors">Annuler</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
