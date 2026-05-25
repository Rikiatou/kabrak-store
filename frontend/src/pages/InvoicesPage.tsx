import { useEffect, useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileText, MessageCircle, Eye, Download, Plus, Trash2, X } from 'lucide-react';
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
  const { t, language } = useTranslation();
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
      console.error(err);
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
  }, [isService]);

  const handleExport = async () => {
    try {
      const res = await api.get('/exports/invoices', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factures-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
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
    if (validItems.length === 0) return;

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
      setShowForm(false);
      setFormClientId('');
      setFormNotes('');
      setFormDueDate('');
      setLineItems([{ description: '', quantity: 1, unitPrice: 0 }]);
      setLoading(true);
      loadInvoices();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white">{t('invoices.title')}</h1>
        <div className="flex gap-2">
          {isService && (
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="w-4 h-4 mr-1" />
              {language === 'fr' ? 'Nouvelle Facture' : 'New Invoice'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> {t('common.export')} CSV
          </Button>
        </div>
      </div>

      {/* Standalone Invoice Creation Form (SERVICE mode only) */}
      {showForm && isService && (
        <Card className="border-2 border-violet-200 dark:border-violet-800">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold dark:text-white">
                {language === 'fr' ? 'Créer une facture' : 'Create Invoice'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                  {language === 'fr' ? 'Client' : 'Client'}
                </label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                >
                  <option value="">{language === 'fr' ? '-- Sélectionner --' : '-- Select --'}</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                  {language === 'fr' ? 'Date limite' : 'Due Date'}
                </label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                  {language === 'fr' ? 'Notes' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={language === 'fr' ? 'Ex: Gestion réseaux sociaux mars' : 'E.g. Social media management March'}
                  className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                {language === 'fr' ? 'Lignes de facture' : 'Line Items'}
              </label>
              <div className="space-y-2">
                {lineItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder={language === 'fr' ? 'Description du service' : 'Service description'}
                      className="flex-1 rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    />
                    <input
                      type="number"
                      value={item.quantity}
                      min={1}
                      onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-20 rounded-lg border px-3 py-2 text-sm text-center dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      placeholder="Qté"
                    />
                    <input
                      type="number"
                      value={item.unitPrice || ''}
                      min={0}
                      onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-32 rounded-lg border px-3 py-2 text-sm text-right dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      placeholder="Prix (FCFA)"
                    />
                    <span className="w-28 text-sm font-medium text-right dark:text-gray-300">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length <= 1}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addLineItem} className="mt-2">
                <Plus className="w-4 h-4 mr-1" /> {language === 'fr' ? 'Ajouter ligne' : 'Add line'}
              </Button>
            </div>

            {/* Total + Submit */}
            <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
              <div className="text-lg font-bold dark:text-white">
                Total: {formatCurrency(formTotal)}
              </div>
              <Button
                onClick={handleCreateStandalone}
                disabled={submitting || formTotal === 0}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {submitting
                  ? (language === 'fr' ? 'Création...' : 'Creating...')
                  : (language === 'fr' ? 'Créer la facture' : 'Create Invoice')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kabrak-500" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground dark:text-gray-400">{t('common.noResults')}</p>
          {isService && (
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {language === 'fr' ? 'Créer votre première facture' : 'Create your first invoice'}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card key={inv.id} className="hover:shadow-md transition-shadow dark:bg-gray-800">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold dark:text-white">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                    {inv.client?.name || (language === 'fr' ? 'Client anonyme' : 'Anonymous client')} · {formatDate(inv.createdAt)}
                  </p>
                  {inv.lineItems && inv.lineItems.length > 0 && !inv.order && (
                    <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                      {inv.lineItems.map((li) => li.description).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <p className="font-bold dark:text-white">{formatCurrency(inv.totalAmount)}</p>
                    <Badge variant={statusColors[inv.paymentStatus]}>
                      {t(`status.${inv.paymentStatus.toLowerCase()}`)}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(inv)} title="Voir">
                    <Eye className="w-4 h-4" />
                  </Button>
                  {inv.client?.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedInvoice(inv)}
                      className="text-green-500"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  )}
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
