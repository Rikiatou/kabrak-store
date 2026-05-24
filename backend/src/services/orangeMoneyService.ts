/**
 * Orange Money Cameroun - Payment Gateway
 * API: https://developer.orange.com/apis/orange-money-webpay-cm
 * Env vars: OM_MERCHANT_KEY, OM_API_TOKEN, OM_CLIENT_ID, OM_CLIENT_SECRET,
 *           OM_RETURN_URL, OM_CANCEL_URL, OM_NOTIF_URL, OM_WEBHOOK_SECRET
 */
import axios from 'axios';
import crypto from 'crypto';

const OM_BASE = 'https://api.orange.com/orange-money-webpay/cm/v1';

interface PlanConfig {
  name: string;
  priceXAF: number;
}

const PLANS: Record<string, PlanConfig> = {
  STORE: { name: 'KABRAK STORE', priceXAF: 4900 },
  SHOP: { name: 'KABRAK SHOP', priceXAF: 7900 },
  BUSINESS: { name: 'KABRAK BUSINESS', priceXAF: 12900 },
};

interface TotalResult {
  total: number;
  baseMonthly: number;
  months: number;
  planCode: string;
  planName: string;
}

interface PaymentInitResult {
  pay_token: string;
  payment_url: string;
  notif_token?: string;
}

interface PaymentStatusResult {
  status: string;
  order_id?: string;
  amount?: string;
}

class OrangeMoneyService {
  isConfigured(): boolean {
    return !!(process.env.OM_MERCHANT_KEY && process.env.OM_API_TOKEN);
  }

  async getAccessToken(): Promise<string> {
    const clientId = process.env.OM_CLIENT_ID || '';
    const clientSecret = process.env.OM_CLIENT_SECRET || '';
    const res = await axios.post(
      'https://api.orange.com/oauth/v3/token',
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return res.data.access_token;
  }

  calculateTotal(planCode: string, months: number): TotalResult {
    const plan = PLANS[planCode];
    if (!plan) throw new Error('Plan inconnu');
    const baseMonthly = plan.priceXAF;
    const total = baseMonthly * months;
    return { total, baseMonthly, months, planCode, planName: plan.name };
  }

  getPricing() {
    return Object.entries(PLANS).map(([code, plan]) => ({
      code,
      name: plan.name,
      priceXAF: plan.priceXAF,
      durations: [1, 3, 6, 12].map((months) => {
        const { total } = this.calculateTotal(code, months);
        return { months, total };
      }),
    }));
  }

  async initiatePayment(params: {
    orderId: string;
    amountXAF: number;
    description: string;
  }): Promise<PaymentInitResult> {
    const token = process.env.OM_API_TOKEN || (await this.getAccessToken());
    const payload = {
      merchant_key: process.env.OM_MERCHANT_KEY,
      currency: 'OAU',
      order_id: String(params.orderId),
      amount: String(params.amountXAF),
      return_url: process.env.OM_RETURN_URL,
      cancel_url: process.env.OM_CANCEL_URL,
      notif_url: process.env.OM_NOTIF_URL,
      lang: 'fr',
      reference: params.description,
    };
    const res = await axios.post(`${OM_BASE}/webpayment`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return res.data;
  }

  async checkStatus(payToken: string): Promise<PaymentStatusResult> {
    const token = process.env.OM_API_TOKEN || (await this.getAccessToken());
    const res = await axios.get(`${OM_BASE}/paymentstatus/${payToken}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  }

  verifyWebhook(body: unknown, signature: string | undefined): boolean {
    if (!process.env.OM_WEBHOOK_SECRET) return true;
    const expected = crypto
      .createHmac('sha256', process.env.OM_WEBHOOK_SECRET)
      .update(typeof body === 'string' ? body : JSON.stringify(body))
      .digest('hex');
    return expected === signature;
  }
}

export const omService = new OrangeMoneyService();
