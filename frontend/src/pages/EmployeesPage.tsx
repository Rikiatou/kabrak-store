import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState, Spinner } from '@/components/ui/spinner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { getErrorMessage } from '@/lib/errors';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n/useTranslation';
import { Plus, UserCog, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';

interface Employee {
  id: string; email: string; firstName: string; lastName: string;
  phone?: string; role: string; isActive: boolean;
}

export function EmployeesPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'EMPLOYEE' });

  const fetchEmployees = useCallback(async () => {
    try { const { data } = await api.get('/employees'); setEmployees(data.data); }
    catch (err) { toast.error(getErrorMessage(err, t('common.loadError'))); } finally { setLoading(false); }
  }, [t]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) await api.put(`/employees/${editingId}`, form);
      else await api.post('/employees', form);
      setShowForm(false); setEditingId(null);
      setForm({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'EMPLOYEE' });
      toast.success(t('common.saved'));
      fetchEmployees();
    } catch (err) { toast.error(getErrorMessage(err, t('common.error'))); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: t('employees.deleteTitle'), description: t('employees.deleteDesc') }))) return;
    try { await api.delete(`/employees/${id}`); toast.success(t('common.deleted')); fetchEmployees(); }
    catch (err) { toast.error(getErrorMessage(err, t('common.error'))); }
  };

  const roleLabel = (role: string) => t(`employees.${role.toLowerCase()}`);

  return (
    <div className="space-y-6">
      <PageHeader title={t('employees.title')} actions={
        <Button onClick={() => { setForm({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'EMPLOYEE' }); setEditingId(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> {t('employees.addEmployee')}
        </Button>
      } />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? t('employees.editEmployee') : t('employees.addEmployee')}</DialogTitle></DialogHeader>
            <div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>{t('auth.firstName')}</Label>
                    <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
                  <div><Label>{t('auth.lastName')}</Label>
                    <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
                </div>
                {!editingId && <>
                  <div><Label>{t('auth.email')}</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                  <div><Label>{t('auth.password')}</Label>
                    <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
                </>}
                <div><Label>{t('auth.phone')}</Label>
                  <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div>
                  <Label>{t('employees.role')}</Label>
                  <NativeSelect value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="EMPLOYEE">{t('employees.employee')}</option>
                    <option value="CASHIER">{t('employees.cashier')}</option>
                    <option value="MANAGER">{t('employees.manager')}</option>
                  </NativeSelect>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
                  <Button type="submit" disabled={saving}>{saving && <Spinner className="mr-2" />}{t('common.save')}</Button>
                </DialogFooter>
              </form>
            </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <LoadingState />
      ) : employees.length === 0 ? (
        <EmptyState icon={UserCog} title={t('employees.empty')} description={t('employees.emptyDesc')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <Card key={emp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{emp.firstName} {emp.lastName}</h3>
                    <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                  </div>
                  <Badge variant={emp.isActive ? 'success' : 'secondary'}>{emp.isActive ? t('common.active') : t('common.inactive')}</Badge>
                </div>
                <Badge variant="outline" className="mb-3">{roleLabel(emp.role)}</Badge>
                {emp.role !== 'OWNER' && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setForm({ ...form, firstName: emp.firstName, lastName: emp.lastName, phone: emp.phone || '', role: emp.role }); setEditingId(emp.id); setShowForm(true); }}>
                      <Pencil className="w-3 h-3 mr-1" /> {t('common.edit')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(emp.id)} className="text-destructive hover:text-destructive" aria-label={t('common.delete')} title={t('common.delete')}>
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
