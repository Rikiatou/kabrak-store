import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState, Spinner } from '@/components/ui/spinner';
import { getErrorMessage } from '@/lib/errors';
import { downloadFile } from '@/lib/download';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileText, MessageCircle, Eye, Download, Plus, Trash2 } from 'lucide-react';
import { InvoiceModal } from '@/components/InvoiceModal';
import api from '@/lib/api';

interface InvoiceItem {
  product: { name: string };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: string;
  createdAt: string;
  client?: { name: string; phone?: string } | null;
  order?: {
    reference: string;
    paymentMethod: string;
    items: InvoiceItem[];
  };
  lineItems?: { description: string; quantity: number; unitPrice: number; totalPrice: number }[];
}

interface Client {
  id: string;
  name: string;
  phone?: string;
}

const statusColors: Record<string, 'success' | 'warning' | 'default'> = {
  PAID: 'success',
  PARTIAL: 'warning',
  PENDING: 'default',
};

export function InvoicesPage() {
  const { t } = useTranslation();
  const tenant = useAuthStore((s) => s.tenant);
  const isService = tenant?.businessMode === 'SERVICE';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showForm, setShowForm] = useState(false);
  const mountedRef = useRef(true);

  // Standalone invoice form state
  const [clients, setClients] = useState<Client[]>([]);
  const [formClientId, setFormClientId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  const loadInvoices = async () => {
    try {
      const { data } = await api.get('/invoices', { params: { limit: 50 } });
      if (mountedRef.current) setInvoices(data.data);
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.loadError')));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    loadInvoices();
    if (isService) {
      api.get('/clients?limit=200').then(({ data }) => {
        if (mountedRef.current) setClients(data.data || []);
      }).catch(() => {});
    }
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isService]);

  const handleExport = async () => {
    try {
      await downloadFile('/exports/invoices', `invoices-${Date.now()}.csv`);
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.exportError')));
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const formTotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleCreateStandalone = async () => {
    const validItems = lineItems.filter((li) => li.description.trim() && li.unitPrice > 0);
    if (validItems.length === 0) {
      toast.error(t('invoices.lineRequired'));
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/invoices/standalone', {
        clientId: formClientId || undefined,
        notes: formNotes || undefined,
        dueDate: formDueDate || undefined,
        items: validItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
        })),
      });
      toast.success(t('invoices.created'));
      setShowForm(false);
      setFormClientId('');
      setFormNotes('');
      setFormDueDate('');
      setLineItems([{ description: '', quantity: 1, unitPrice: 0 }]);
      setLoading(true);
      loadInvoices();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.error')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t('invoices.title')}
        actions={<>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5" /> {t('common.exportCsv')}
          </Button>
          {isService && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> {t('invoices.newInvoice')}
            </Button>
          )}
        </>}
      />

      {isService && (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>{t('invoices.newInvoice')}</DialogTitle></DialogHeader>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="inv-client">{t('clients.title')}</Label>
                  <NativeSelect id="inv-client" value={formClientId} onChange={(e) => setFormClientId(e.target.value)}>
                    <option value="">{t('common.select')}</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </NativeSelect>
                </div>
                <div>
                  <Label htmlFor="inv-due">{t('invoices.dueDate')}</Label>
                  <Input id="inv-due" type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="inv-notes">{t('common.notes')}</Label>
                  <Input id="inv-notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder={t('invoices.notesHint')} />
                </div>
              </div>

              <div>
                <Label>{t('invoices.lineItems')}</Label>
                <div className="space-y-3 sm:space-y-2">
                  {lineItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_5rem_8rem_7rem_auto] sm:items-center sm:border-0 sm:p-0">
                      <Input
                        className="col-span-2 sm:col-span-1"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        placeholder={t('invoices.lineDescription')}
                        aria-label={t('invoices.lineDescription')}
                      />
                      <div className="col-span-2 grid grid-cols-2 gap-2 sm:contents">
                        <Input
                          type="number" min={1} className="text-center"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          placeholder={t('invoices.qty')} aria-label={t('invoices.qty')}
                        />
                        <Input
                          type="number" min={0} className="text-right"
                          value={item.unitPrice || ''}
                          onChange={(e) => updateLineItem(index, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                          placeholder={t('invoices.unitPrice')} aria-label={t('invoices.unitPrice')}
                        />
                      </div>
                      <span className="self-center text-sm font-medium sm:text-right">{formatCurrency(item.quantity * item.unitPrice)}</span>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length <= 1}
                        className="justify-self-end text-destructive hover:text-destructive"
                        aria-label={t('invoices.removeLine')} title={t('invoices.removeLine')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={addLineItem} className="mt-3">
                  <Plus className="w-4 h-4 mr-1.5" /> {t('invoices.addLine')}
                </Button>
              </div>
            </div>
            <DialogFooter className="items-center sm:justify-between">
              <p className="text-lg font-bold">{t('common.total')} : {formatCurrency(formTotal)}</p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleCreateStandalone} disabled={submitting}>
                  {submitting ? <><Spinner className="mr-2" />{t('invoices.creating')}</> : t('invoices.createInvoice')}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {loading ? (
        <LoadingState />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('invoices.empty')}
          description={isService ? t('invoices.emptyServiceDesc') : t('invoices.emptyProductDesc')}
          action={isService && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> {t('invoices.createFirst')}
            </Button>
          )}
        />
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card key={inv.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {inv.client?.name || t('common.anonymousClient')} · {formatDate(inv.createdAt)}
                  </p>
                  {inv.lineItems && inv.lineItems.length > 0 && !inv.order && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {inv.lineItems.map((li) => li.description).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <div className="sm:text-right sm:mr-2">
                    <p className="font-bold">{formatCurrency(inv.totalAmount)}</p>
                    <Badge variant={statusColors[inv.paymentStatus]}>
                      {t(`status.${inv.paymentStatus.toLowerCase()}`)}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(inv)} title={t('common.view')} aria-label={t('common.view')}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {inv.client?.phone && (
                      <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(inv)} className="text-success" title={t('invoices.share')} aria-label={t('invoices.share')}>
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedInvoice && (
        <InvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
}
