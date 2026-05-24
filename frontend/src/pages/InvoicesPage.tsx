import { useEffect, useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileText, MessageCircle, Eye, Download } from 'lucide-react';
import { InvoiceModal } from '@/components/InvoiceModal';
import api from '@/lib/api';

interface InvoiceItem {
  product: { name: string };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
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
}

const statusColors: Record<string, 'success' | 'warning' | 'default'> = {
  PAID: 'success',
  PARTIAL: 'warning',
  PENDING: 'default',
};

export function InvoicesPage() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const load = async () => {
      try {
        const { data } = await api.get('/invoices', { params: { limit: 50 } });
        if (mountedRef.current) setInvoices(data.data);
      } catch (err) {
        console.error(err);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };
    load();
    return () => { mountedRef.current = false; };
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('invoices.title')}</h1>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" /> {t('common.export')} CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kabrak-500" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">{t('common.noResults')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card key={inv.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.client?.name || 'Client anonyme'} · {formatDate(inv.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <p className="font-bold">{formatCurrency(inv.totalAmount)}</p>
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

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
}
