import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n/useTranslation';
import { Plus, UserCog, Pencil, Trash2, X } from 'lucide-react';
import api from '@/lib/api';

interface Employee {
  id: string; email: string; firstName: string; lastName: string;
  phone?: string; role: string; isActive: boolean;
}

export function EmployeesPage() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'EMPLOYEE' });

  const fetchEmployees = useCallback(async () => {
    try { const { data } = await api.get('/employees'); setEmployees(data.data); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) await api.put(`/employees/${editingId}`, form);
      else await api.post('/employees', form);
      setShowForm(false); setEditingId(null);
      setForm({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'EMPLOYEE' });
      fetchEmployees();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.confirm') + '?')) return;
    try { await api.delete(`/employees/${id}`); fetchEmployees(); } catch (err) { console.error(err); }
  };

  const roleLabel = (role: string) => t(`employees.${role.toLowerCase()}`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('employees.title')}</h1>
        <Button onClick={() => { setForm({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'EMPLOYEE' }); setEditingId(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> {t('employees.addEmployee')}
        </Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingId ? t('common.edit') : t('employees.addEmployee')}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium mb-1 block">{t('auth.firstName')}</label>
                    <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
                  <div><label className="text-sm font-medium mb-1 block">{t('auth.lastName')}</label>
                    <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
                </div>
                {!editingId && <>
                  <div><label className="text-sm font-medium mb-1 block">{t('auth.email')}</label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                  <div><label className="text-sm font-medium mb-1 block">{t('auth.password')}</label>
                    <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
                </>}
                <div><label className="text-sm font-medium mb-1 block">{t('auth.phone')}</label>
                  <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t('employees.role')}</label>
                  <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="EMPLOYEE">{t('employees.employee')}</option>
                    <option value="CASHIER">{t('employees.cashier')}</option>
                    <option value="MANAGER">{t('employees.manager')}</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">{t('common.cancel')}</Button>
                  <Button type="submit" className="flex-1">{t('common.save')}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kabrak-500" /></div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12"><UserCog className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">{t('common.noResults')}</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <Card key={emp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{emp.firstName} {emp.lastName}</h3>
                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                  </div>
                  <Badge variant={emp.isActive ? 'success' : 'secondary'}>{emp.isActive ? t('employees.active') : 'Inactif'}</Badge>
                </div>
                <Badge variant="outline" className="mb-3">{roleLabel(emp.role)}</Badge>
                {emp.role !== 'OWNER' && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setForm({ ...form, firstName: emp.firstName, lastName: emp.lastName, phone: emp.phone || '', role: emp.role }); setEditingId(emp.id); setShowForm(true); }}>
                      <Pencil className="w-3 h-3 mr-1" /> {t('common.edit')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(emp.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
