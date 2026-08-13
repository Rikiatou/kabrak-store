import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Clock, XCircle, Share2, MessageCircle } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api';
import axios from 'axios';
import toast from 'react-hot-toast';

const fr = typeof navigator !== 'undefined' && (navigator.language || '').startsWith('fr');

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variant?: string;
  product: { id: string; name: string; image?: string };
}

interface Client {
  id: string;
  name: string;
  phone?: string;
}

interface Tenant {
  id: string;
  name: string;
  logo?: string;
  invoiceColor?: string;
  phone?: string;
}

interface Order {
  id: string;
  reference: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  amountPaid: number;
  amountRemaining: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  client?: Client;
  items: OrderItem[];
  tenant: Tenant;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  PENDING: { label: fr ? 'En attente' : 'Pending', icon: Clock, color: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { label: fr ? 'Confirmée' : 'Confirmed', icon: CheckCircle, color: 'bg-blue-100 text-blue-700' },
  PREPARING: { label: fr ? 'En préparation' : 'Preparing', icon: Clock, color: 'bg-blue-100 text-blue-700' },
  READY: { label: fr ? 'Prête' : 'Ready', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
  DELIVERING: { label: fr ? 'En livraison' : 'Out for delivery', icon: Clock, color: 'bg-blue-100 text-blue-700' },
  DELIVERED: { label: fr ? 'Livrée' : 'Delivered', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: fr ? 'Annulée' : 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-700' },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: fr ? 'En attente' : 'Pending', color: 'text-amber-600' },
  PARTIAL: { label: fr ? 'Partiel' : 'Partial', color: 'text-amber-600' },
  PAID: { label: fr ? 'Payée' : 'Paid', color: 'text-green-600' },
  REFUNDED: { label: fr ? 'Remboursée' : 'Refunded', color: 'text-red-600' },
};

export function PublicOrderPage() {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '');
    const client = axios.create({ baseURL: base });
    client.get(`/api/public/order/${token}`)
      .then(res => { if (res.data.success) setOrder(res.data.data); })
      .catch((err) => { console.error(err); toast.error(getApiErrorMessage(err)); })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{fr ? 'Commande introuvable' : 'Order not found'}</h1>
          <p className="text-gray-500">{fr ? 'Cette commande n\'existe pas ou a été supprimée.' : 'This order does not exist or has been deleted.'}</p>
        </div>
      </div>
    );
  }

  const accentColor = order.tenant.invoiceColor || '#2563eb';
  const statusInfo = statusConfig[order.status] || statusConfig.PENDING;
  const paymentInfo = paymentStatusConfig[order.paymentStatus] || paymentStatusConfig.PENDING;
  const StatusIcon = statusInfo.icon;

  const whatsappMessage = fr
    ? `Bonjour ${order.tenant.name}, je confirme ma commande ${order.reference} d'un montant de ${formatCurrency(order.totalAmount)}. Merci !`
    : `Hello ${order.tenant.name}, I confirm my order ${order.reference} for the amount of ${formatCurrency(order.totalAmount)}. Thank you!`;
  const whatsappLink = `https://wa.me/${order.tenant.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {order.tenant.logo && (
                  <img src={order.tenant.logo} alt={order.tenant.name} className="w-12 h-12 rounded-full object-cover border-2" style={{ borderColor: accentColor }} />
                )}
                <div>
                  <h1 className="font-bold text-xl text-gray-900">{order.tenant.name}</h1>
                  <p className="text-sm text-gray-500">{fr ? 'Commande' : 'Order'} #{order.reference}</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusInfo.color}`}>
                <StatusIcon className="w-4 h-4" />
                {statusInfo.label}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>📅 {formatDateTime(order.createdAt)}</span>
              <span>💳 {paymentInfo.label}</span>
            </div>
          </div>

          {/* Items */}
          <div className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4">{fr ? 'Articles' : 'Items'}</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {item.product.image ? (
                      <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <span className="text-2xl">📦</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.product.name}</h3>
                    {item.variant && <p className="text-sm text-gray-500">{item.variant}</p>}
                    <p className="text-sm text-gray-500">{fr ? 'Qté' : 'Qty'}: {item.quantity} × {formatCurrency(item.unitPrice)}</p>
                  </div>
                  <p className="font-semibold text-gray-900">{formatCurrency(item.totalPrice)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{fr ? 'Sous-total' : 'Subtotal'}</span>
                <span className="font-medium">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{fr ? 'Payé' : 'Paid'}</span>
                <span className={`font-medium ${paymentInfo.color}`}>{formatCurrency(order.amountPaid)}</span>
              </div>
              {order.amountRemaining > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{fr ? 'Reste à payer' : 'Amount due'}</span>
                  <span className="font-semibold text-amber-600">{formatCurrency(order.amountRemaining)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                <span className="text-gray-900">{fr ? 'Total' : 'Total'}</span>
                <span style={{ color: accentColor }}>{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Client info */}
        {order.client && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">{fr ? 'Client' : 'Client'}</h2>
            <p className="text-gray-900 font-medium">{order.client.name}</p>
            {order.client.phone && (
              <p className="text-sm text-gray-600">{order.client.phone}</p>
            )}
          </div>
        )}

        {/* Notes */}
        {order.notes && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-2">{fr ? 'Notes' : 'Notes'}</h2>
            <p className="text-gray-600 text-sm">{order.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            {fr ? 'Confirmer sur WhatsApp' : 'Confirm on WhatsApp'}
          </a>
          <button
            onClick={() => navigator.share({ title: `Commande ${order.reference}`, url: window.location.href })}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-5 h-5" />
            {fr ? 'Partager' : 'Share'}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Powered by KABRAK Store</p>
        </div>
      </div>
    </div>
  );
}
