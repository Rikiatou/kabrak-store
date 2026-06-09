import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

// ─── Monthly usage counter for SHOP plan (3 AI reports/month) ──────────────
const aiUsage = new Map<string, { count: number; monthKey: string }>();
function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}`;
}
function checkAndIncrementUsage(tenantId: string, plan: string): { allowed: boolean; remaining: number } {
  const LIMIT = 3;
  if (plan !== 'SHOP') return { allowed: true, remaining: 999 };
  const monthKey = getMonthKey();
  const entry = aiUsage.get(tenantId);
  if (!entry || entry.monthKey !== monthKey) {
    aiUsage.set(tenantId, { count: 1, monthKey });
    return { allowed: true, remaining: LIMIT - 1 };
  }
  if (entry.count >= LIMIT) return { allowed: false, remaining: 0 };
  entry.count++;
  return { allowed: true, remaining: LIMIT - entry.count };
}
// ────────────────────────────────────────────────────────────────────────────

export const generateReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const { period = 'month' } = req.body;

    // Fetch tenant plan for SHOP limit check
    const tenantInfo = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
    const userPlan = tenantInfo?.plan || 'STORE';

    // Check monthly limit for SHOP plan
    const usage = checkAndIncrementUsage(tenantId, userPlan);
    if (!usage.allowed) {
      res.status(429).json({
        success: false,
        message: 'Limite mensuelle atteinte. Le plan SHOP inclut 3 rapports IA par mois. Passez au plan BUSINESS pour des rapports illimités.',
      });
      return;
    }

    // Fetch data
    const dateFilter: Record<string, unknown> = {};
    if (period === 'week') {
      const from = new Date(); from.setDate(from.getDate() - 7);
      dateFilter.gte = from;
    } else if (period === 'month') {
      const from = new Date(); from.setDate(1);
      dateFilter.gte = from;
    }

    const [orders, expenses, products, clients] = await Promise.all([
      prisma.order.findMany({
        where: { tenantId, ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}) },
        include: { items: { include: { product: true } }, client: true, invoice: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.expense.findMany({
        where: { tenantId, ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}) },
        orderBy: { date: 'desc' },
        take: 50,
      }),
      prisma.product.findMany({ where: { tenantId }, orderBy: { totalStock: 'asc' }, take: 20 }),
      prisma.client.findMany({ where: { tenantId }, orderBy: { totalSpent: 'desc' }, take: 20 }),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + (o.invoice?.amountPaid || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0;

    const topProducts = orders.flatMap(o => o.items).reduce((acc, item) => {
      const key = item.productId;
      acc[key] = (acc[key] || 0) + item.totalPrice;
      return acc;
    }, {} as Record<string, number>);

    const topProductsList = Object.entries(topProducts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, revenue]) => {
        const product = products.find(p => p.id === id);
        return { name: product?.name || 'Produit inconnu', revenue };
      });

    const expenseByCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    // Build prompt for OpenAI
    const prompt = `Analyse ce business et donne un rapport concis en français avec des recommandations actionnables:

Période: ${period}
Revenus: ${totalRevenue} XAF
Dépenses: ${totalExpenses} XAF
Bénéfice: ${profit} XAF
Marge: ${margin}%

Top produits:
${topProductsList.map(p => `- ${p.name}: ${p.revenue} XAF`).join('\n')}

Dépenses par catégorie:
${Object.entries(expenseByCategory).map(([cat, amt]) => `- ${cat}: ${amt} XAF`).join('\n')}

Clients top: ${clients.slice(0, 5).map(c => c.name).join(', ')}

Format de réponse:
1. Résumé exécutif (3-4 lignes)
2. Points forts (2-3 points)
3. Points d'amélioration (2-3 points)
4. Recommandations concrètes (3-5 actions)
5. Prévision pour le mois prochain (1-2 lignes)`;

    // Call Groq (free, fast Llama 3)
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.status(500).json({ success: false, message: 'Groq API key not configured' });
      return;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          { role: 'system', content: 'Tu es un expert business analyst pour les PME en Afrique. Donne des rapports concis, actionnables et adaptés au contexte local.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', errorText);
      res.status(500).json({ success: false, message: 'Groq API error', details: errorText });
      return;
    }

    const data = await response.json() as any;
    const report = data.choices[0]?.message?.content || 'Erreur génération rapport';

    res.json({ success: true, data: { report, period, metrics: { totalRevenue, totalExpenses, profit, margin } } });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};
