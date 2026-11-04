import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const { from, to } = req.query;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startDate = from ? new Date(from as string) : today;
    const endDate = to ? new Date(to as string) : tomorrow;

    const [
      todayOrders,
      todayRevenue,
      totalProducts,
      totalClients,
      lowStockProducts,
      recentOrders,
      topProducts,
      upcomingDeliveries,
      unpaidInvoices,
    ] = await Promise.all([
      prisma.order.count({
        where: { tenantId, createdAt: { gte: startDate, lt: endDate } },
      }),
      prisma.invoice.aggregate({
        where: { tenantId, createdAt: { gte: startDate, lt: endDate } },
        _sum: { amountPaid: true },
      }),
      prisma.product.count({ where: { tenantId, isActive: true } }),
      prisma.client.count({ where: { tenantId } }),
      prisma.$queryRaw<Array<{ id: string; name: string; totalStock: number; lowStockAlert: number; sellingPrice: number; image: string | null }>>`
        SELECT id, name, "totalStock", "lowStockAlert", "sellingPrice", image
        FROM products
        WHERE "tenantId" = ${tenantId} AND "isActive" = true AND "totalStock" <= "lowStockAlert"
        ORDER BY "totalStock" ASC
        LIMIT 10
      `,
      prisma.order.findMany({
        where: { tenantId },
        include: {
          client: true,
          items: { include: { product: true } },
          invoice: true,
          createdBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { tenantId, createdAt: { gte: startDate, lt: endDate } } },
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 5,
      }),
      prisma.delivery.count({
        where: { tenantId, status: { in: ['PENDING', 'PICKED_UP', 'IN_TRANSIT'] } },
      }),
      prisma.invoice.aggregate({
        where: { tenantId, paymentStatus: { in: ['PENDING', 'PARTIAL'] } },
        _sum: { amountDue: true },
        _count: true,
      }),
    ]);

    // Fetch product details for top products (tenant-scoped)
    const topProductIds = topProducts.map((p) => p.productId);
    const topProductDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds }, tenantId },
    });

    const topProductItems = await prisma.orderItem.findMany({
      where: { productId: { in: topProductIds }, order: { tenantId, createdAt: { gte: startDate, lt: endDate } } },
      select: { productId: true, quantity: true, unitCost: true },
    });

    const topProductsWithDetails = topProducts.map((tp) => {
      const product = topProductDetails.find((p) => p.id === tp.productId);
      const totalCost = topProductItems
        .filter((i) => i.productId === tp.productId)
        .reduce((sum, i) => sum + (i.unitCost ?? product?.costPrice ?? 0) * i.quantity, 0);
      const totalPrice = tp._sum.totalPrice || 0;
      const grossMargin = totalPrice - totalCost;
      return {
        product,
        totalQuantity: tp._sum.quantity,
        totalRevenue: totalPrice,
        totalCost,
        grossMargin,
      };
    });

    // Calculate total gross margin for the period
    const totalGrossMargin = topProductsWithDetails.reduce((sum, tp) => sum + (tp.grossMargin || 0), 0);

    res.json({
      success: true,
      data: {
        todayOrders,
        todayRevenue: todayRevenue._sum.amountPaid || 0,
        totalProducts,
        totalClients,
        lowStockProducts,
        recentOrders,
        topProducts: topProductsWithDetails,
        totalGrossMargin,
        upcomingDeliveries,
        unpaidInvoices: unpaidInvoices._count,
        unpaidAmount: unpaidInvoices._sum.amountDue || 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard';
    res.status(500).json({ success: false, message });
  }
};

export const getSalesReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const { from, to, groupBy = 'day' } = req.query;

    const startDate = from ? new Date(from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = to ? new Date(to as string) : new Date();

    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        items: { include: { product: true } },
        seller: { select: { id: true, firstName: true, lastName: true } },
        invoice: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group sales data
    const salesByPeriod: Record<string, { revenue: number; orders: number; profit: number }> = {};

    for (const order of orders) {
      let key: string;
      const d = new Date(order.createdAt);
      if (groupBy === 'month') {
        key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().slice(0, 10);
      } else {
        key = d.toISOString().slice(0, 10);
      }

      if (!salesByPeriod[key]) salesByPeriod[key] = { revenue: 0, orders: 0, profit: 0 };
      salesByPeriod[key].revenue += order.invoice?.amountPaid || 0;
      salesByPeriod[key].orders += 1;

      for (const item of order.items) {
        salesByPeriod[key].profit += (item.unitPrice - (item.unitCost ?? item.product.costPrice ?? 0)) * item.quantity;
      }
    }

    // Top sellers
    const sellerStats: Record<string, { name: string; revenue: number; orders: number }> = {};
    for (const order of orders) {
      if (order.seller) {
        const key = order.seller.id;
        if (!sellerStats[key]) {
          sellerStats[key] = { name: `${order.seller.firstName} ${order.seller.lastName}`, revenue: 0, orders: 0 };
        }
        sellerStats[key].revenue += order.invoice?.amountPaid || 0;
        sellerStats[key].orders += 1;
      }
    }

    const totalRevenue = orders.reduce((sum, o) => sum + (o.invoice?.amountPaid || 0), 0);
    const totalProfit = Object.values(salesByPeriod).reduce((sum, p) => sum + p.profit, 0);

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalProfit,
        totalOrders: orders.length,
        salesByPeriod: Object.entries(salesByPeriod).map(([period, data]) => ({ period, ...data })),
        topSellers: Object.values(sellerStats).sort((a, b) => b.revenue - a.revenue),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sales report';
    res.status(500).json({ success: false, message });
  }
};

/** Clients who still owe money, with their unpaid invoices. */
export const getDebts = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId: req.user!.tenantId,
        clientId: { not: null },
        amountDue: { gt: 0 },
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
        OR: [{ orderId: null }, { order: { status: { not: 'CANCELLED' } } }],
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, invoiceNumber: true, totalAmount: true, amountPaid: true, amountDue: true, createdAt: true, dueDate: true,
        client: { select: { id: true, name: true, phone: true } },
      },
    });
    const byClient = new Map<string, { client: { id: string; name: string; phone: string | null }; totalDue: number; oldest: Date; invoices: typeof invoices }>();
    for (const inv of invoices) {
      if (!inv.client) continue;
      const entry = byClient.get(inv.client.id) ?? { client: inv.client, totalDue: 0, oldest: inv.createdAt, invoices: [] };
      entry.totalDue += inv.amountDue;
      entry.invoices.push(inv);
      byClient.set(inv.client.id, entry);
    }
    const data = [...byClient.values()].sort((a, b) => b.totalDue - a.totalDue);
    res.json({ success: true, data, totalDue: data.reduce((s, d) => s + d.totalDue, 0) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch debts';
    res.status(500).json({ success: false, message });
  }
};

/** Cash closing for one day: sales, money received per method and per seller, expenses, profit. */
export interface PeriodSummary {
  orders: number;
  itemsSold: number;
  sales: number;
  discounts: number;
  received: number;
  byMethod: Record<string, number>;
  sellers: Array<{ name: string; orders: number; sales: number; items: Array<{ name: string; quantity: number; amount: number }> }>;
  topProducts: Array<{ name: string; quantity: number; amount: number }>;
  cancelled: { count: number; amount: number };
  cost: number;
  grossProfit: number;
  expenses: number;
  cashExpenses: number;
  netProfit: number;
  lowStock: number;
}

/**
 * Sales / payments / expenses between `from` and `to`.
 * `expensesBy`: 'date' for the business day (expense date), 'createdAt' for a cash drawer session.
 */
export async function computeSummary(
  tenantId: string,
  from: Date,
  to: Date,
  expensesBy: 'date' | 'createdAt' = 'date',
): Promise<PeriodSummary> {
  const expenseRange = { [expensesBy]: { gte: from, lt: to } };
  const [orders, cancelledOrders, payments, expenses, cashExpenses, lowStock] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId, createdAt: { gte: from, lt: to }, status: { not: 'CANCELLED' } },
      include: {
        items: { include: { product: { select: { name: true, costPrice: true } } } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        seller: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.order.aggregate({
      where: { tenantId, createdAt: { gte: from, lt: to }, status: 'CANCELLED' },
      _count: true,
      _sum: { finalAmount: true },
    }),
    prisma.payment.findMany({
      where: { createdAt: { gte: from, lt: to }, invoice: { tenantId, OR: [{ orderId: null }, { order: { status: { not: 'CANCELLED' } } }] } },
      select: { amount: true, method: true },
    }),
    prisma.expense.aggregate({ where: { tenantId, ...expenseRange, category: { not: 'STOCK' } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { tenantId, ...expenseRange, paymentMethod: 'CASH' }, _sum: { amount: true } }),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM products
      WHERE "tenantId" = ${tenantId} AND "isActive" = true AND "isService" = false AND "totalStock" <= "lowStockAlert"
    `,
  ]);

  const byMethod: Record<string, number> = {};
  for (const p of payments) byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
  const received = payments.reduce((s, p) => s + p.amount, 0);

  const sellers = new Map<string, { name: string; orders: number; sales: number; items: Map<string, { name: string; quantity: number; amount: number }> }>();
  const products = new Map<string, { name: string; quantity: number; amount: number }>();
  let sales = 0;
  let discounts = 0;
  let cost = 0;
  let itemsSold = 0;
  for (const o of orders) {
    sales += o.finalAmount;
    discounts += o.discount || 0;
    for (const it of o.items) {
      cost += (it.unitCost ?? it.product.costPrice ?? 0) * it.quantity;
      itemsSold += it.quantity;
      const key = `${it.productId}|${it.variant || ''}`;
      const name = it.variant ? `${it.product.name} (${it.variant})` : it.product.name;
      const row = products.get(key) ?? { name, quantity: 0, amount: 0 };
      row.quantity += it.quantity;
      row.amount += it.unitPrice * it.quantity;
      products.set(key, row);
    }
    const who = o.seller ?? o.createdBy;
    const entry = sellers.get(who.id) ?? { name: `${who.firstName} ${who.lastName}`.trim(), orders: 0, sales: 0, items: new Map() };
    entry.orders += 1;
    entry.sales += o.finalAmount;
    for (const it of o.items) {
      const key = `${it.productId}|${it.variant || ''}`;
      const row = entry.items.get(key) ?? { name: it.variant ? `${it.product.name} (${it.variant})` : it.product.name, quantity: 0, amount: 0 };
      row.quantity += it.quantity;
      row.amount += it.unitPrice * it.quantity;
      entry.items.set(key, row);
    }
    sellers.set(who.id, entry);
  }
  const expenseTotal = expenses._sum.amount || 0;
  const grossProfit = sales - cost;

  return {
    orders: orders.length,
    itemsSold,
    sales,
    discounts,
    received,
    byMethod,
    sellers: [...sellers.values()]
      .map((x) => ({ ...x, items: [...x.items.values()].sort((a, b) => b.quantity - a.quantity) }))
      .sort((a, b) => b.sales - a.sales),
    topProducts: [...products.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
    cancelled: { count: cancelledOrders._count, amount: cancelledOrders._sum.finalAmount || 0 },
    cost,
    grossProfit,
    expenses: expenseTotal,
    cashExpenses: cashExpenses._sum.amount || 0,
    netProfit: grossProfit - expenseTotal,
    lowStock: Number(lowStock[0]?.count ?? 0),
  };
}

export const getDailyClosing = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const day = req.query.date ? new Date(`${req.query.date as string}T00:00:00`) : new Date(new Date().setHours(0, 0, 0, 0));
    const next = new Date(day.getTime() + 24 * 3600 * 1000);
    const summary = await computeSummary(tenantId, day, next);
    res.json({ success: true, data: { date: day.toISOString().slice(0, 10), ...summary } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compute closing';
    res.status(500).json({ success: false, message });
  }
};
