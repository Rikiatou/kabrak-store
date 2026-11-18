import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

// Groq free tier has per-model rate limits; fall back to a smaller model before giving up.
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

async function callGroq(apiKey: string, prompt: string): Promise<string | null> {
  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'Tu es un expert business analyst pour les PME en Afrique. Donne des rapports concis, actionnables et adaptés au contexte local.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 1200,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) {
        console.warn(`[AI] Groq ${model} → ${response.status}: ${(await response.text()).slice(0, 300)}`);
        continue;
      }
      const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
      console.warn(`[AI] Groq ${model} returned no content`);
    } catch (err) {
      console.warn(`[AI] Groq ${model} failed: ${(err as Error).message}`);
    }
  }
  return null;
}

export const generateReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const { period = 'month' } = req.body;

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

    // Build enriched prompt
    const lowStockItems = products.filter(p => p.totalStock <= p.lowStockAlert);
    const paidOrders = orders.filter(o => o.invoice?.paymentStatus === 'PAID').length;
    const unpaidOrders = orders.filter(o => o.invoice?.paymentStatus === 'PENDING').length;
    const partialOrders = orders.filter(o => o.invoice?.paymentStatus === 'PARTIAL').length;
    const avgOrderValue = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

    const prompt = `Tu es un conseiller business expert pour les PME en Afrique centrale (Cameroun, Côte d'Ivoire, Sénégal...).
Analyse les données suivantes et génère un rapport professionnel en français.

═══ DONNÉES PÉRIODE: ${period === 'week' ? '7 derniers jours' : 'Ce mois'} ═══

FINANCES:
- Revenus encaissés: ${totalRevenue.toLocaleString()} XAF
- Dépenses totales: ${totalExpenses.toLocaleString()} XAF
- Bénéfice net: ${profit.toLocaleString()} XAF
- Marge bénéficiaire: ${margin}%
- Valeur moyenne commande: ${avgOrderValue.toLocaleString()} XAF

COMMANDES (${orders.length} total):
- Payées: ${paidOrders} | Partielles: ${partialOrders} | Impayées: ${unpaidOrders}

TOP 5 PRODUITS (par revenus):
${topProductsList.length > 0 ? topProductsList.map((p, i) => `${i + 1}. ${p.name}: ${p.revenue.toLocaleString()} XAF`).join('\n') : '- Aucune donnée'}

DÉPENSES PAR CATÉGORIE:
${Object.entries(expenseByCategory).length > 0 ? Object.entries(expenseByCategory).map(([cat, amt]) => `- ${cat}: ${(amt as number).toLocaleString()} XAF`).join('\n') : '- Aucune dépense enregistrée'}

STOCK EN ALERTE (${lowStockItems.length} produits):
${lowStockItems.length > 0 ? lowStockItems.slice(0, 5).map(p => `- ${p.name}: ${p.totalStock} restants (seuil: ${p.lowStockAlert})`).join('\n') : '- Aucun produit en rupture'}

MEILLEURS CLIENTS:
${clients.slice(0, 5).map(c => `- ${c.name}: ${c.totalSpent.toLocaleString()} XAF dépensés`).join('\n')}

═══ FORMAT DU RAPPORT (respecte exactement) ═══

1. Résumé exécutif
[3-4 lignes sur l'état général du business, avec un ton direct et professionnel]

2. Points forts
[2-3 points positifs concrets avec chiffres à l'appui]

3. Points d'amélioration
[2-3 problèmes identifiés avec impact chiffré si possible]

4. Recommandations concrètes
[3-5 actions précises et réalisables cette semaine, adaptées au contexte africain]

5. Prévision mois prochain
[Estimation réaliste basée sur la tendance actuelle]`;

    // Call Groq (free, fast Llama 3)
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn('[AI] GROQ_API_KEY is not set');
      res.status(503).json({ success: false, message: 'Les rapports IA ne sont pas encore activés. Contactez KABRAK.', code: 'AI_UNAVAILABLE' });
      return;
    }

    const report = await callGroq(apiKey, prompt);
    if (!report) {
      res.status(503).json({
        success: false,
        message: 'Le service IA est très demandé en ce moment. Réessayez dans quelques minutes.',
        code: 'AI_UNAVAILABLE',
      });
      return;
    }

    // Persist report for usage tracking and history
    try {
      await (prisma as any).aIReport.create({
        data: {
          tenantId,
          period,
          reportContent: report,
          metrics: { totalRevenue, totalExpenses, profit, margin },
        },
      });
    } catch (persistErr) {
      console.warn('AI report persist skipped:', (persistErr as Error).message);
    }

    res.json({ success: true, data: { report, period, metrics: { totalRevenue, totalExpenses, profit, margin } } });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error', code: 'AI_UNAVAILABLE' });
  }
};
