import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileText, MessageCircle } from 'lucide-react';
import api from '@/lib/api';

interface Invoice {
  id: string; invoiceNumber: string; totalAmount: number;
  amountPaid: number; amountDue: number; paymentStatus: string;
  createdAt: string;
  client?: { name: string; phone?: string } | null;
  order?: { reference: string; items: Array<{ product: { name: string }; quantity: number; totalPrice: number }> };
}

const statusColors: Record<string, 'success' | 'warning' | 'default'> = {
  PAID: 'success', PARTIAL: 'warning', PENDING: 'default',
};

export function InvoicesPage() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    try {
      const { data } = await api.get('/invoices', { params: { limit: 50 } });
      setInvoices(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleWhatsApp = (invoice: Invoice) => {
    const phone = invoice.client?.phone?.replace(/\s+/g, '').replace('+', '');
    if (!phone) return;
    const items = invoice.order?.items.map((i) => `${i.product.name} x${i.quantity} = ${formatCurrency(i.totalPrice)}`).join('\n') || '';
    const message = encodeURIComponent(
      `*KABRAK - Facture ${invoice.invoiceNumber}*\n\n${items}\n\n` +
      `Total: ${formatCurrency(invoice.totalAmount)}\nPayé: ${formatCurrency(invoice.amountPaid)}\n` +
      `Reste: ${formatCurrency(invoice.amountDue)}\n\nMerci!`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('invoices.title')}</h1>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kabrak-500" /></div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12"><FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">{t('common.noResults')}</p></div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card key={inv.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">{inv.client?.name || 'Client anonyme'} · {formatDate(inv.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(inv.totalAmount)}</p>
                    <Badge variant={statusColors[inv.paymentStatus]}>{t(`status.${inv.paymentStatus.toLowerCase()}`)}</Badge>
                  </div>
                  {inv.client?.phone && (
                    <Button variant="outline" size="sm" onClick={() => handleWhatsApp(inv)}>
                      <MessageCircle className="w-4 h-4 text-green-500" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
