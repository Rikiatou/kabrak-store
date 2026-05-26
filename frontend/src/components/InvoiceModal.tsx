import { useRef, useState } from 'react';
import { X, Printer, Share2, MessageCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils';
import html2canvas from 'html2canvas';

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
  totalPrice: number;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: string;
  createdAt: string;
  notes?: string | null;
  client?: { name: string; phone?: string } | null;
  order?: {
    reference: string;
    paymentMethod: string;
    items: InvoiceItem[];
  };
  lineItems?: LineItem[];
}

interface Props {
  invoice: InvoiceData;
  onClose: () => void;
}

const paymentLabels: Record<string, string> = {
  CASH: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  ORANGE_MONEY: 'Orange Money',
  MTN_MOMO: 'MTN MoMo',
  BANK_TRANSFER: 'Virement',
  OTHER: 'Autre',
};

export function InvoiceModal({ invoice, onClose }: Props) {
  const tenant = useAuthStore((s) => s.tenant);
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [printFormat, setPrintFormat] = useState<'standard' | 'thermal'>('standard');

  const orderItems = invoice.order?.items || [];
  const lineItems = invoice.lineItems || [];
  const isStandalone = orderItems.length === 0 && lineItems.length > 0;
  const displayItems = isStandalone
    ? lineItems.map((li) => ({ name: li.description, quantity: li.quantity, unitPrice: li.unitPrice, totalPrice: li.totalPrice }))
    : orderItems.map((oi) => ({ name: oi.product.name, quantity: oi.quantity, unitPrice: oi.unitPrice, totalPrice: oi.totalPrice }));
  const total = invoice.totalAmount;
  const paid = invoice.amountPaid;
  const due = invoice.amountDue;
  const phone = invoice.client?.phone?.replace(/\D/g, '');
  const fullPhone = phone ? (phone.startsWith('237') ? phone : `237${phone}`) : null;
  const dateStr = new Date(invoice.createdAt).toLocaleDateString('fr-FR');
  const paymentMethod = invoice.order?.paymentMethod || 'CASH';
  const paymentLabel = paymentLabels[paymentMethod] || paymentMethod;
  const invoiceColor = '#2563eb';

  const shareAsImage = async () => {
    setSharing(true);
    try {
      const el = printRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `facture-${invoice.invoiceNumber}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Facture ${invoice.invoiceNumber} — ${tenant?.name}`,
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `facture-${invoice.invoiceNumber}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (e) {
      console.error(e);
    } finally {
      setSharing(false);
    }
  };

  const sendWhatsAppText = () => {
    if (!fullPhone) return;
    const lines = displayItems
      .map((i) => `  • ${i.name} x${i.quantity}: ${formatCurrency(i.totalPrice)} F`)
      .join('\n');
    const msg = encodeURIComponent(
      `Bonjour ${invoice.client?.name || 'cher(e) client(e)'} 👋\n\n` +
        `🧾 *REÇU DE PAIEMENT*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🏪 *${tenant?.name || 'KABRAK Store'}*\n` +
        `📅 ${dateStr}\n` +
        `📋 N° ${invoice.invoiceNumber}\n\n` +
        `*Articles :*\n${lines}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💰 *TOTAL : ${formatCurrency(total)} FCFA*\n` +
        `💳 Paiement : ${paymentLabel}\n` +
        `✅ *${invoice.paymentStatus === 'PAID' ? 'Facture payée' : due > 0 ? `Reste: ${formatCurrency(due)} FCFA` : 'En attente'}*\n\n` +
        `Merci pour votre confiance 🙏`
    );
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 overflow-y-auto">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area-wrapper, .print-area-wrapper * { visibility: visible !important; }
          .print-area-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${printFormat === 'thermal' ? '80mm' : '100%'} !important;
            padding: ${printFormat === 'thermal' ? '0 !important' : '15px !important'};
            margin: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
          }
          @page {
            size: ${printFormat === 'thermal' ? '80mm auto' : 'auto'};
            margin: ${printFormat === 'thermal' ? '0mm' : '10mm'};
          }
        }
      `}</style>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm my-auto flex flex-col">
        {/* Action bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
            {t('invoices.title')}
          </span>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="icon" onClick={() => window.print()} title={t('common.print')}>
              <Printer className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={shareAsImage} disabled={sharing} title="Télécharger">
              <Download className="w-4 h-4" />
            </Button>
            {fullPhone && (
              <Button variant="ghost" size="icon" onClick={sendWhatsAppText} className="text-green-500" title="WhatsApp">
                <MessageCircle className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={shareAsImage} disabled={sharing} title="Partager">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Format Tabs */}
        <div className="grid grid-cols-2 gap-1 p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setPrintFormat('standard')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              printFormat === 'standard'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            📋 Standard
          </button>
          <button
            onClick={() => setPrintFormat('thermal')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              printFormat === 'thermal'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            🎫 Ticket 80mm
          </button>
        </div>

        {/* Invoice Content */}
        <div className="print-area-wrapper overflow-y-auto max-h-[60vh] bg-gray-50/50">
          <div
            ref={printRef}
            style={
              printFormat === 'thermal'
                ? {
                    fontFamily: "'Courier New', Courier, monospace",
                    fontSize: '12px',
                    lineHeight: '1.4',
                    color: '#000',
                    backgroundColor: '#fff',
                    padding: '16px 12px',
                    width: '100%',
                    maxWidth: '320px',
                    margin: '0 auto',
                  }
                : {
                    fontFamily: "'Segoe UI', Arial, sans-serif",
                    fontSize: '12px',
                    lineHeight: '1.5',
                    color: '#1a1a2e',
                    backgroundColor: '#fff',
                    padding: '24px',
                  }
            }
          >
            {printFormat === 'thermal' ? (
              /* ===== THERMAL RECEIPT ===== */
              <div>
                <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>
                    {tenant?.name}
                  </div>
                  <div style={{ margin: '8px 0', borderTop: '1px dashed #000' }} />
                  <div style={{ fontSize: '13px', fontWeight: 'bold' }}>TICKET DE CAISSE</div>
                  <div style={{ fontSize: '11px' }}>N° {invoice.invoiceNumber}</div>
                  <div style={{ fontSize: '11px' }}>Date: {dateStr}</div>
                </div>

                <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

                <div style={{ marginBottom: '10px', fontSize: '11px' }}>
                  <div>
                    Client: <strong>{invoice.client?.name || 'Client Anonyme'}</strong>
                  </div>
                  <div>Paiement: {paymentLabel}</div>
                  <div>
                    Statut: <strong>{invoice.paymentStatus === 'PAID' ? 'PAYÉ' : 'EN ATTENTE'}</strong>
                  </div>
                </div>

                <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000', fontWeight: 'bold' }}>
                      <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Article</th>
                      <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ paddingTop: '5px', paddingBottom: '5px' }}>
                          {item.name} x{item.quantity}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          {formatCurrency(item.totalPrice)} F
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
                  <span>TOTAL</span>
                  <span>{formatCurrency(total)} FCFA</span>
                </div>
                {due > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span>Payé</span>
                      <span>{formatCurrency(paid)} F</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: '#c00' }}>
                      <span>Reste</span>
                      <span>{formatCurrency(due)} F</span>
                    </div>
                  </>
                )}

                <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#666' }}>
                  Merci pour votre achat !
                  <br />
                  {tenant?.name}
                </div>
              </div>
            ) : (
              /* ===== STANDARD INVOICE ===== */
              <div>
                {/* Header with Logo */}
                <div
                  style={{
                    background: `linear-gradient(135deg, ${invoiceColor}, ${invoiceColor}dd)`,
                    color: '#fff',
                    padding: '24px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  {tenant?.logo && (
                    <img
                      src={tenant.logo}
                      alt={tenant.name}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '8px',
                        objectFit: 'contain',
                        backgroundColor: '#fff',
                        padding: '4px',
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '4px' }}>{tenant?.name}</div>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>FACTURE</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11px', opacity: 0.9 }}>
                    <div>KABRAK Store</div>
                    <div>Logiciel de gestion</div>
                  </div>
                </div>

                {/* Invoice details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '11px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Facture N°</div>
                    <div>{invoice.invoiceNumber}</div>
                    <div style={{ marginTop: '8px', fontWeight: 'bold' }}>Date</div>
                    <div>{dateStr}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Client</div>
                    <div>{invoice.client?.name || 'Client Anonyme'}</div>
                    {invoice.client?.phone && <div>{invoice.client.phone}</div>}
                  </div>
                </div>

                {/* Items table */}
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', marginBottom: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: `${invoiceColor}15`, borderBottom: `2px solid ${invoiceColor}` }}>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: invoiceColor }}>Article</th>
                      <th style={{ textAlign: 'center', padding: '12px 8px', fontWeight: 'bold', color: invoiceColor }}>Qté</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 'bold', color: invoiceColor }}>P.U.</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 'bold', color: invoiceColor }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 8px', color: '#374151' }}>{item.name}</td>
                        <td style={{ textAlign: 'center', padding: '10px 8px', color: '#6b7280' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', padding: '10px 8px', color: '#6b7280' }}>{formatCurrency(item.unitPrice)}</td>
                        <td style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 'bold', color: '#111827' }}>
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div
                  style={{
                    background: `${invoiceColor}10`,
                    padding: '16px',
                    borderRadius: '8px',
                    border: `1px solid ${invoiceColor}30`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Sous-total</span>
                    <span>{formatCurrency(total)} FCFA</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Payé</span>
                    <span style={{ color: '#16a34a' }}>{formatCurrency(paid)} FCFA</span>
                  </div>
                  {due > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#dc2626' }}>
                      <span>Reste à payer</span>
                      <span>{formatCurrency(due)} FCFA</span>
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: `2px solid ${invoiceColor}`,
                      color: invoiceColor,
                    }}
                  >
                    <span>TOTAL</span>
                    <span>{formatCurrency(total)} FCFA</span>
                  </div>
                </div>

                {/* Payment info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '10px', color: '#666' }}>
                  <span>Paiement: {paymentLabel}</span>
                  <span>
                    {invoice.paymentStatus === 'PAID'
                      ? '✅ Payée'
                      : invoice.paymentStatus === 'PARTIAL'
                        ? '⏳ Partiel'
                        : '⏳ En attente'}
                  </span>
                </div>

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>
                    Merci pour votre confiance !
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>
                    {tenant?.name}
                  </div>
                  <div style={{ fontSize: '9px', color: '#9ca3af' }}>
                    Géré avec KABRAK Store — Logiciel de gestion professionnel
                  </div>
                  {tenant?.phone && (
                    <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '8px' }}>
                      📞 {tenant.phone}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
