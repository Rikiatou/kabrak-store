import { useRef, useState } from 'react';
import { itemLabel } from '@/lib/variants';
import { X, Printer, Share2, MessageCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

// Lazy-load heavy libraries only when sharing/downloading
type Html2Canvas = (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
let _html2canvas: Html2Canvas | null = null;
async function loadHtml2Canvas(): Promise<Html2Canvas> {
  if (!_html2canvas) {
    const mod = await import('html2canvas');
    _html2canvas = mod.default as Html2Canvas;
  }
  return _html2canvas;
}

type JsPDF = new (orientation: 'p' | 'l', unit: string, format: string | [number, number]) => {
  addImage: (data: string, format: string, x: number, y: number, w: number, h: number) => void;
  save: (filename: string) => void;
};
let _jsPDF: JsPDF | null = null;
async function loadJsPDF(): Promise<JsPDF> {
  if (!_jsPDF) {
    const mod = await import('jspdf');
    _jsPDF = mod.default as JsPDF;
  }
  return _jsPDF;
}

interface InvoiceItem {
  product: { name: string };
  variant?: string | null;
  packSize?: number | null;
  returnedQty?: number;
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

const paymentLabels: Record<string, { fr: string; en: string }> = {
  CASH: { fr: 'Espèces', en: 'Cash' },
  MOBILE_MONEY: { fr: 'Mobile Money', en: 'Mobile Money' },
  ORANGE_MONEY: { fr: 'Orange Money', en: 'Orange Money' },
  MTN_MOMO: { fr: 'MTN MoMo', en: 'MTN MoMo' },
  BANK_TRANSFER: { fr: 'Virement', en: 'Bank transfer' },
  OTHER: { fr: 'Autre', en: 'Other' },
};

export function InvoiceModal({ invoice, onClose }: Props) {
  const tenant = useAuthStore((s) => s.tenant);
  const { language } = useTranslation();
  const fr = language === 'fr';
  const printRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [printFormat, setPrintFormat] = useState<'standard' | 'thermal' | 'thermal58'>('standard');
  const isThermal = printFormat !== 'standard';
  const paperWidth = printFormat === 'thermal58' ? '58mm' : '80mm';

  const orderItems = invoice.order?.items || [];
  const lineItems = invoice.lineItems || [];
  const isStandalone = orderItems.length === 0 && lineItems.length > 0;
  const displayItems = isStandalone
    ? lineItems.map((li) => ({ name: li.description, quantity: li.quantity, unitPrice: li.unitPrice, totalPrice: li.totalPrice }))
    : orderItems.map((oi) => ({ name: [oi.product.name, itemLabel(oi.variant, oi.packSize, fr), oi.returnedQty ? `${fr ? 'rendu' : 'returned'} ×${oi.returnedQty}` : ''].filter(Boolean).join(' · '), quantity: oi.quantity, unitPrice: oi.unitPrice, totalPrice: oi.totalPrice }));
  const total = invoice.totalAmount;
  const paid = invoice.amountPaid;
  const due = invoice.amountDue;
  const phone = invoice.client?.phone?.replace(/\D/g, '');
  const fullPhone = phone ? (phone.startsWith('237') ? phone : `237${phone}`) : null;
  const dateStr = new Date(invoice.createdAt).toLocaleDateString(fr ? 'fr-FR' : 'en-US');
  const paymentMethod = invoice.order?.paymentMethod || 'CASH';
  const paymentLabel = (paymentLabels[paymentMethod] || paymentLabels.OTHER)[language as 'fr' | 'en'];
  const invoiceColor = tenant?.invoiceColor || '#2563eb';

  // Adaptive labels per business category
  const categories = (tenant?.businessCategories || []) as string[];
  const primaryCat = categories[0] || '';
  const isFood = ['CAKES', 'FOOD_BUSINESS'].includes(primaryCat);
  const isEvent = ['EVENT_DECORATION', 'CATERING'].includes(primaryCat);
  const isMarket = ['MINI_MARKET', 'WHOLESALE'].includes(primaryCat);
  const isService = tenant?.businessMode === 'SERVICE';

  const invoiceTypeLabel = isEvent ? (fr ? 'Facture de prestation' : 'Service invoice')
    : isFood ? (fr ? 'Bon de commande' : 'Order receipt')
    : isService ? (fr ? 'Facture de service' : 'Service invoice')
    : (fr ? 'Facture de vente' : 'Sales invoice');

  const itemColumnLabel = isEvent || isService ? (fr ? 'Prestation / Service' : 'Service')
    : isFood ? (fr ? 'Commande' : 'Order')
    : isMarket ? (fr ? 'Produit' : 'Product')
    : (fr ? 'Article' : 'Item');

  const footerThanks = isFood ? (fr ? 'Merci pour votre commande 😋' : 'Thank you for your order 😋')
    : isEvent ? (fr ? 'Merci pour votre confiance 🙏' : 'Thank you for your trust 🙏')
    : isService ? (fr ? 'Merci pour votre confiance 🤝' : 'Thank you for your trust 🤝')
    : (fr ? 'Merci pour votre achat 🛍️' : 'Thank you for your purchase 🛍️');

  const whatsappItemsLabel = isEvent || isService ? (fr ? 'Prestations' : 'Services') : isFood ? (fr ? 'Commande' : 'Order') : (fr ? 'Articles' : 'Items');

  // Prints only the receipt, from a hidden iframe: window.print() on the whole app page prints a blank or cut page.
  const printReceipt = () => {
    const el = printRef.current;
    if (!el) return;
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((n) => n.outerHTML)
      .join('');
    const page = isThermal ? `@page { size: ${paperWidth} auto; margin: 0; } body { width: ${paperWidth}; }` : '@page { margin: 10mm; }';
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) { iframe.remove(); return; }
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${invoice.invoiceNumber}</title>${styles}<style>${page} html, body { margin: 0; padding: 0; background: #fff; }</style></head><body>${el.outerHTML}</body></html>`);
    doc.close();
    const cleanup = () => setTimeout(() => iframe.remove(), 1000);
    const run = () => {
      const imgs = Array.from(doc.images).filter((img) => !img.complete);
      Promise.all(imgs.map((img) => new Promise((res) => { img.onload = img.onerror = res; })))
        .then(() => {
          win.addEventListener('afterprint', cleanup);
          win.focus();
          win.print();
          setTimeout(cleanup, 60_000);
        });
    };
    if (doc.readyState === 'complete') setTimeout(run, 250);
    else iframe.onload = () => setTimeout(run, 250);
  };

  const shareAsImage = async () => {
    setSharing(true);
    const el = printRef.current;
    if (!el) { setSharing(false); return; }
    // Temporarily remove max-height to capture full content
    const parent = el.parentElement;
    const originalMaxHeight = parent?.style.maxHeight;
    if (parent) parent.style.maxHeight = 'none';
    try {
      const html2canvas = await loadHtml2Canvas();
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
      toast.error(fr ? 'Erreur lors du partage' : 'Error sharing');
    } finally {
      // Always restore original max-height to avoid DOM leak
      if (parent) parent.style.maxHeight = originalMaxHeight || '';
      setSharing(false);
    }
  };

  const downloadAsPDF = async () => {
    setSharing(true);
    const el = printRef.current;
    if (!el) { setSharing(false); return; }
    // Temporarily remove max-height to capture full content
    const parent = el.parentElement;
    const originalMaxHeight = parent?.style.maxHeight;
    if (parent) parent.style.maxHeight = 'none';
    try {
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const jsPDF = await loadJsPDF();
      const pdf = new jsPDF('p', 'mm', [imgWidth, imgHeight]);
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`facture-${invoice.invoiceNumber}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error(fr ? 'Erreur lors du téléchargement' : 'Error downloading');
    } finally {
      // Always restore original max-height to avoid DOM leak
      if (parent) parent.style.maxHeight = originalMaxHeight || '';
      setSharing(false);
    }
  };

  const sendWhatsAppText = () => {
    if (!fullPhone) return;
    const lines = displayItems
      .map((i) => `  • ${i.name} x${i.quantity}: ${formatCurrency(i.totalPrice)} F`)
      .join('\n');
    const msg = encodeURIComponent(
      `${fr ? 'Bonjour' : 'Hello'} ${invoice.client?.name || (fr ? 'cher(e) client(e)' : 'dear customer')} 👋\n\n` +
        `🧾 *${fr ? 'REÇU DE PAIEMENT' : 'PAYMENT RECEIPT'}*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🏪 *${tenant?.name || 'KABRAK Store'}*\n` +
        `📅 ${dateStr}\n` +
        `📋 N° ${invoice.invoiceNumber}\n\n` +
        `*${whatsappItemsLabel} :*\n${lines}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💰 *TOTAL : ${formatCurrency(total)} FCFA*\n` +
        `💳 ${fr ? 'Paiement' : 'Payment'} : ${paymentLabel}\n` +
        `✅ *${invoice.paymentStatus === 'PAID' ? (fr ? 'Facture payée' : 'Invoice paid') : due > 0 ? (fr ? `Reste: ${formatCurrency(due)} FCFA` : `Due: ${formatCurrency(due)} FCFA`) : (fr ? 'En attente' : 'Pending')}*\n\n` +
        `${fr ? 'Merci pour votre confiance 🙏' : 'Thank you for your trust 🙏'}`
    );
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 overflow-y-auto">

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm my-auto flex flex-col">
        {/* Action bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{fr ? 'Aperçu facture' : 'Invoice preview'}</span>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="icon" onClick={printReceipt} title={fr ? 'Imprimer' : 'Print'}>
              <Printer className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Format Tabs */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setPrintFormat('standard')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              printFormat === 'standard'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Standard
          </button>
          {(['thermal', 'thermal58'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setPrintFormat(fmt)}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                printFormat === fmt
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {fr ? 'Ticket' : 'Receipt'} {fmt === 'thermal58' ? '58mm' : '80mm'}
            </button>
          ))}
        </div>

        {/* Invoice Content */}
        <div className="print-area-wrapper overflow-y-auto max-h-[60vh] bg-gray-50/50">
          <div
            ref={printRef}
            style={
              isThermal
                ? {
                    fontFamily: "'Courier New', Courier, monospace",
                    fontSize: printFormat === 'thermal58' ? '10px' : '12px',
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
            {isThermal ? (
              /* ===== THERMAL RECEIPT ===== */
              <div>
                <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>
                    {tenant?.name}
                  </div>
                  <div style={{ margin: '8px 0', borderTop: '1px dashed #000' }} />
                  <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{fr ? 'TICKET DE CAISSE' : 'CASH RECEIPT'}</div>
                  <div style={{ fontSize: '11px' }}>N° {invoice.invoiceNumber}</div>
                  <div style={{ fontSize: '11px' }}>{fr ? 'Date' : 'Date'}: {dateStr}</div>
                </div>

                <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

                <div style={{ marginBottom: '10px', fontSize: '11px' }}>
                  <div>
                    {fr ? 'Client' : 'Client'}: <strong>{invoice.client?.name || (fr ? 'Client Anonyme' : 'Anonymous Client')}</strong>
                  </div>
                  <div>{fr ? 'Paiement' : 'Payment'}: {paymentLabel}</div>
                  <div>
                    {fr ? 'Statut' : 'Status'}: <strong>{invoice.paymentStatus === 'PAID' ? (fr ? 'PAYÉ' : 'PAID') : (fr ? 'EN ATTENTE' : 'PENDING')}</strong>
                  </div>
                </div>

                <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000', fontWeight: 'bold' }}>
                      <th style={{ textAlign: 'left', paddingBottom: '4px' }}>{fr ? 'Article' : 'Item'}</th>
                      <th style={{ textAlign: 'right', paddingBottom: '4px' }}>{fr ? 'Total' : 'Total'}</th>
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
                  <span>{fr ? 'TOTAL' : 'TOTAL'}</span>
                  <span>{formatCurrency(total)} FCFA</span>
                </div>
                {due > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span>{fr ? 'Payé' : 'Paid'}</span>
                      <span>{formatCurrency(paid)} F</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: '#c00' }}>
                      <span>{fr ? 'Reste' : 'Due'}</span>
                      <span>{formatCurrency(due)} F</span>
                    </div>
                  </>
                )}

                <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#666' }}>
                  {fr ? 'Merci pour votre achat !' : 'Thank you for your purchase!'}
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
                      <div style={{ marginTop: '6px', display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: '#d1fae5', color: '#065f46', fontSize: '9px', fontWeight: 800, border: '1px solid #a7f3d0' }}>✓ {fr ? 'PAYÉE' : 'PAID'}</div>
                    )}
                  </div>
                </div>

                {/* Client & Règlement Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>{fr ? 'Facturé à' : 'Billed to'}</div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>{invoice.client?.name || (fr ? 'Client anonyme' : 'Anonymous client')}</div>
                    {invoice.client?.phone && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>☎ {invoice.client.phone}</div>}
                  </div>
                  <div style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>{fr ? 'Règlement' : 'Payment'}</div>
                    <div style={{ fontWeight: 700, fontSize: '12px', color: '#111827' }}>{paymentLabel}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                      {invoice.paymentStatus === 'PAID' ? (fr ? '✅ Soldé' : '✅ Settled') : invoice.paymentStatus === 'PARTIAL' ? (fr ? '⏳ Acompte reçu' : '⏳ Deposit received') : (fr ? '⏳ En attente' : '⏳ Pending')}
                    </div>
                  </div>
                </div>

                {/* Items table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                      <th style={{ color: '#4b5563', fontWeight: 700, padding: '10px 4px', textAlign: 'left', fontSize: '10px', letterSpacing: '0.5px', textTransform: 'uppercase', width: '50%' }}>{itemColumnLabel}</th>
                      <th style={{ color: '#4b5563', fontWeight: 700, padding: '10px 4px', textAlign: 'center', fontSize: '10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{fr ? 'Qté' : 'Qty'}</th>
                      <th style={{ color: '#4b5563', fontWeight: 700, padding: '10px 4px', textAlign: 'right', fontSize: '10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{fr ? 'P.U.' : 'Unit'}</th>
                      <th style={{ color: '#4b5563', fontWeight: 700, padding: '10px 4px', textAlign: 'right', fontSize: '10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{fr ? 'Total' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: '16px 4px', textAlign: 'center', color: '#9ca3af', fontSize: '11px', fontStyle: 'italic' }}>{fr ? 'Aucun article' : 'No items'}</td></tr>
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
                      <span>{fr ? 'Reste à payer' : 'Amount due'}</span><span style={{ fontWeight: 700 }}>{formatCurrency(due)} F</span>
                    </div>
                  )}
                  {paid > 0 && paid < total && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', fontSize: '11px', color: '#16a34a' }}>
                      <span>{fr ? 'Payé' : 'Paid'}</span><span style={{ fontWeight: 600 }}>{formatCurrency(paid)} F</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: `linear-gradient(135deg, ${invoiceColor}, ${invoiceColor}dd)`, color: '#fff', fontWeight: 800, fontSize: '13px', borderRadius: '10px', marginTop: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
                    <span>{fr ? 'NET À PAYER' : 'NET PAYABLE'}</span><span style={{ fontSize: '14px', fontWeight: 900 }}>{formatCurrency(total)} FCFA</span>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '9px', color: '#9ca3af', fontStyle: 'italic', maxWidth: '60%', lineHeight: '1.4' }}>
                    {fr ? 'Arrêté la présente facture à la somme de' : 'Invoice total in the amount of'}<br />
                    <strong style={{ color: '#4b5563', fontStyle: 'normal' }}>{formatCurrency(total)} {fr ? 'Francs CFA' : 'CFA Francs'}</strong>
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
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {fr ? 'Génération PDF...' : 'Generating PDF...'}</>
            ) : (
              <><Download className="w-4 h-4" /> 📄 {fr ? 'Télécharger PDF' : 'Download PDF'}</>
            )}
          </button>
          <button
            onClick={shareAsImage}
            disabled={sharing}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
          >
            {sharing ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {fr ? 'Génération image...' : 'Generating image...'}</>
            ) : (
              <><Share2 className="w-4 h-4" /> 📸 {fr ? 'Partager la facture (image PNG)' : 'Share invoice (PNG image)'}</>
            )}
          </button>
          {fullPhone && (
            <button
              onClick={sendWhatsAppText}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> {fr ? 'Envoyer le reçu WhatsApp' : 'Send WhatsApp receipt'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
