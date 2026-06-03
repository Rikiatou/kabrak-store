import { useRef, useState } from 'react';
import { X, Printer, Share2, MessageCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  useTranslation();
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
  const invoiceColor = tenant?.invoiceColor || '#2563eb';

  // Adaptive labels per business category
  const categories = (tenant?.businessCategories || []) as string[];
  const primaryCat = categories[0] || '';
  const isFood = ['CAKES', 'FOOD_BUSINESS', 'FOOD_DELIVERY', 'HOME_COOKING'].includes(primaryCat);
  const isEvent = ['EVENT_DECORATION', 'CATERING', 'MADE_TO_ORDER'].includes(primaryCat);
  const isMarket = ['MINI_MARKET', 'WHOLESALE'].includes(primaryCat);
  const isService = tenant?.businessMode === 'SERVICE';
  const isWhatsapp = primaryCat === 'WHATSAPP_SELLER';

  const invoiceTypeLabel = isEvent ? 'Facture de prestation'
    : isFood ? 'Bon de commande'
    : isService ? 'Facture de service'
    : isWhatsapp ? 'Bon de commande'
    : 'Facture de vente';

  const itemColumnLabel = isEvent || isService ? 'Prestation / Service'
    : isFood ? 'Commande'
    : isMarket ? 'Produit'
    : 'Article';

  const footerThanks = isFood ? 'Merci pour votre commande 😋'
    : isEvent ? 'Merci pour votre confiance 🙏'
    : isService ? 'Merci pour votre confiance 🤝'
    : isWhatsapp ? 'Merci pour votre commande 🙏'
    : 'Merci pour votre achat 🛍️';

  const whatsappItemsLabel = isEvent || isService ? 'Prestations' : isFood ? 'Commande' : 'Articles';

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

  const downloadAsPDF = async () => {
    setSharing(true);
    try {
      const el = printRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`facture-${invoice.invoiceNumber}.pdf`);
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
        `*${whatsappItemsLabel} :*\n${lines}\n\n` +
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
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Aperçu facture</span>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="icon" onClick={() => window.print()} title="Imprimer">
              <Printer className="w-4 h-4" />
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
              /* ===== STANDARD INVOICE — KABRAK PRO DESIGN ===== */
              <div>
                {/* Top accent bar */}
                <div style={{ height: '4px', background: `linear-gradient(135deg, ${invoiceColor}, ${invoiceColor}dd)`, borderRadius: '4px', marginBottom: '22px' }} />

                {/* Header: logo + boutique LEFT | Facture stamp RIGHT */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {tenant?.logo ? (
                      <img src={tenant.logo} alt="Logo" crossOrigin="anonymous" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '12px', border: `1.5px solid ${invoiceColor}30` }} />
                    ) : (
                      <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: `linear-gradient(135deg, ${invoiceColor}, ${invoiceColor}dd)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '22px', flexShrink: 0 }}>
                        {tenant?.name?.[0] || 'K'}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', letterSpacing: '-0.4px' }}>{tenant?.name}</div>
                      {tenant?.phone && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>☎ {tenant.phone}</div>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800, color: invoiceColor, marginBottom: '2px' }}>{invoiceTypeLabel}</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>N° {invoice.invoiceNumber}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>{dateStr}</div>
                    {invoice.paymentStatus === 'PAID' && (
                      <div style={{ marginTop: '6px', display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: '#d1fae5', color: '#065f46', fontSize: '9px', fontWeight: 800, border: '1px solid #a7f3d0' }}>✓ PAYÉE</div>
                    )}
                  </div>
                </div>

                {/* Client & Règlement Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>Facturé à</div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>{invoice.client?.name || 'Client anonyme'}</div>
                    {invoice.client?.phone && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>☎ {invoice.client.phone}</div>}
                  </div>
                  <div style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>Règlement</div>
                    <div style={{ fontWeight: 700, fontSize: '12px', color: '#111827' }}>{paymentLabel}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                      {invoice.paymentStatus === 'PAID' ? '✅ Soldé' : invoice.paymentStatus === 'PARTIAL' ? '⏳ Acompte reçu' : '⏳ En attente'}
                    </div>
                  </div>
                </div>

                {/* Items table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                      <th style={{ color: '#4b5563', fontWeight: 700, padding: '10px 4px', textAlign: 'left', fontSize: '10px', letterSpacing: '0.5px', textTransform: 'uppercase', width: '50%' }}>{itemColumnLabel}</th>
                      <th style={{ color: '#4b5563', fontWeight: 700, padding: '10px 4px', textAlign: 'center', fontSize: '10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Qté</th>
                      <th style={{ color: '#4b5563', fontWeight: 700, padding: '10px 4px', textAlign: 'right', fontSize: '10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>P.U.</th>
                      <th style={{ color: '#4b5563', fontWeight: 700, padding: '10px 4px', textAlign: 'right', fontSize: '10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: '16px 4px', textAlign: 'center', color: '#9ca3af', fontSize: '11px', fontStyle: 'italic' }}>Aucun article</td></tr>
                    ) : displayItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '11px 4px', fontSize: '11.5px', color: '#374151', fontWeight: 500 }}>{item.name}</td>
                        <td style={{ padding: '11px 4px', fontSize: '11.5px', textAlign: 'center', color: '#6b7280' }}>{item.quantity}</td>
                        <td style={{ padding: '11px 4px', fontSize: '11.5px', textAlign: 'right', color: '#6b7280' }}>{formatCurrency(item.unitPrice)}</td>
                        <td style={{ padding: '11px 4px', fontSize: '11.5px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>{formatCurrency(item.totalPrice)} <span style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 500 }}>F</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div style={{ width: '220px', marginLeft: 'auto', marginBottom: '22px' }}>
                  {due > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', fontSize: '11px', color: '#dc2626' }}>
                      <span>Reste à payer</span><span style={{ fontWeight: 700 }}>{formatCurrency(due)} F</span>
                    </div>
                  )}
                  {paid > 0 && paid < total && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', fontSize: '11px', color: '#16a34a' }}>
                      <span>Payé</span><span style={{ fontWeight: 600 }}>{formatCurrency(paid)} F</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: `linear-gradient(135deg, ${invoiceColor}, ${invoiceColor}dd)`, color: '#fff', fontWeight: 800, fontSize: '13px', borderRadius: '10px', marginTop: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
                    <span>NET À PAYER</span><span style={{ fontSize: '14px', fontWeight: 900 }}>{formatCurrency(total)} FCFA</span>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '9px', color: '#9ca3af', fontStyle: 'italic', maxWidth: '60%', lineHeight: '1.4' }}>
                    Arrêté la présente facture à la somme de<br />
                    <strong style={{ color: '#4b5563', fontStyle: 'normal' }}>{formatCurrency(total)} Francs CFA</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: invoiceColor }}>{tenant?.name}</div>
                    <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '1.5px' }}>{footerThanks}</div>
                  </div>
                </div>

                {/* Bottom accent bar */}
                <div style={{ height: '3px', background: `linear-gradient(135deg, ${invoiceColor}, ${invoiceColor}dd)`, borderRadius: '4px', marginTop: '16px', opacity: 0.7 }} />
              </div>
            )}
          </div>
        </div>

        {/* Bottom action buttons */}
        <div className="px-4 pb-4 pt-3 space-y-2 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={downloadAsPDF}
            disabled={sharing}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
          >
            {sharing ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Génération PDF...</>
            ) : (
              <><Download className="w-4 h-4" /> 📄 Télécharger PDF</>
            )}
          </button>
          <button
            onClick={shareAsImage}
            disabled={sharing}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
          >
            {sharing ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Génération image...</>
            ) : (
              <><Share2 className="w-4 h-4" /> 📸 Partager la facture (image PNG)</>
            )}
          </button>
          {fullPhone && (
            <button
              onClick={sendWhatsAppText}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> Envoyer le reçu WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
