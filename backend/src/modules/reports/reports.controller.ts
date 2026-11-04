import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayOrders,
      todayRevenue,
      totalProducts,
      totalClients,
      lowStockProducts,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      prisma.order.count({
        where: { tenantId, status: { not: 'CANCELLED' }, createdAt: { gte: today, lt: tomorrow } },
      }),
      prisma.order.aggregate({
        where: { tenantId, status: { not: 'CANCELLED' }, createdAt: { gte: today, lt: tomorrow } },
        _sum: { amountPaid: true },
      }),
      prisma.product.count({ where: { tenantId, isActive: true } }),
      prisma.client.count({ where: { tenantId } }),
      prisma.product.findMany({
        where: { tenantId, isActive: true, totalStock: { lte: 5 } },
        orderBy: { totalStock: 'asc' },
        take: 10,
      }),
      prisma.order.findMany({
        where: { tenantId },
        include: {
          client: true,
          items: { include: { product: true } },
          createdBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { tenantId, status: { not: 'CANCELLED' } } },
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 5,
      }),
    ]);

    // Fetch product details for top products
    const topProductIds = topProducts.map((p) => p.productId);
    const topProductDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
    });

    const topProductsWithDetails = topProducts.map((tp) => {
      const product = topProductDetails.find((p) => p.id === tp.productId);
      return {
        product,
        totalQuantity: tp._sum.quantity,
        totalRevenue: tp._sum.totalPrice,
      };
    });

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
        status: { not: 'CANCELLED' },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        items: { include: { product: true } },
        seller: { select: { id: true, firstName: true, lastName: true } },
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
      salesByPeriod[key].revenue += order.amountPaid;
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
        sellerStats[key].revenue += order.amountPaid;
        sellerStats[key].orders += 1;
      }
    }

    const totalRevenue = orders.reduce((sum, o) => sum + o.amountPaid, 0);
    const totalProfit = Object.values(salesByPeriod).reduce((sum, p) => sum + p.profit, 0);
    const expenseGroups = await prisma.expense.groupBy({
      by: ['category'],
      where: { tenantId, date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    });
    const expensesByCategory = expenseGroups.map((g) => ({ category: g.category, amount: g._sum.amount ?? 0 }));
    const totalExpenses = expensesByCategory.reduce((sum, e) => sum + e.amount, 0);

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalProfit,
        totalExpenses,
        netProfit: totalProfit - totalExpenses,
        expensesByCategory,
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

/** Day closing: sales, cash collected per payment method and per seller, expenses and low stock. */
export const getDaily = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const day = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : new Date().toISOString().slice(0, 10);
    // Browser getTimezoneOffset(): minutes to add to local time to get UTC.
    const tzOffset = Number(req.query.tzOffset) || 0;
    const start = new Date(Date.parse(`${day}T00:00:00Z`) + tzOffset * 60000);
    const end = new Date(start.getTime() + 24 * 3600 * 1000 - 1);

    const [orders, expenses, lowStock] = await Promise.all([
      prisma.order.findMany({
        where: { tenantId, status: { not: 'CANCELLED' }, createdAt: { gte: start, lte: end } },
        include: {
          items: { include: { product: { select: { costPrice: true } } } },
          seller: { select: { id: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.expense.findMany({ where: { tenantId, date: { gte: start, lte: end } } }),
      prisma.$queryRaw<Array<{ name: string; totalStock: number }>>`
        SELECT name, "totalStock" FROM products
        WHERE "tenantId" = ${tenantId} AND "isActive" = true AND "isService" = false AND "totalStock" <= "lowStockAlert"
        ORDER BY "totalStock" ASC LIMIT 10
      `,
    ]);

    const byMethod: Record<string, number> = {};
    const bySeller: Record<string, { name: string; orders: number; sales: number; collected: number }> = {};
    let sales = 0, collected = 0, profit = 0;
    for (const o of orders) {
      sales += o.finalAmount;
      collected += o.amountPaid;
      byMethod[o.paymentMethod] = (byMethod[o.paymentMethod] ?? 0) + o.amountPaid;
      const seller = o.seller ?? o.createdBy;
      const s = (bySeller[seller.id] ??= { name: `${seller.firstName} ${seller.lastName}`.trim(), orders: 0, sales: 0, collected: 0 });
      s.orders += 1; s.sales += o.finalAmount; s.collected += o.amountPaid;
      profit += o.items.reduce((sum, i) => sum + (i.unitPrice - (i.unitCost ?? i.product.costPrice ?? 0)) * i.quantity, 0) - o.discount;
    }
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({
      success: true,
      data: {
        date: day,
        orders: orders.length,
        sales,
        collected,
        unpaid: sales - collected,
        profit,
        expenses: totalExpenses,
        netProfit: profit - totalExpenses,
        byMethod: Object.entries(byMethod).map(([method, amount]) => ({ method, amount })),
        bySeller: Object.values(bySeller).sort((a, b) => b.sales - a.sales),
        lowStock,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};

/** Unpaid balances ("ardoise") grouped by client. */
export const getDebts = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      where: { tenantId: req.user!.tenantId, status: { not: 'CANCELLED' }, amountRemaining: { gt: 0 } },
      select: {
        id: true, reference: true, finalAmount: true, amountPaid: true, amountRemaining: true, createdAt: true,
        client: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const groups: Record<string, { client: { id: string; name: string; phone: string | null } | null; total: number; orders: typeof orders }> = {};
    for (const o of orders) {
      const key = o.client?.id ?? 'none';
      const g = (groups[key] ??= { client: o.client, total: 0, orders: [] });
      g.total += o.amountRemaining;
      g.orders.push(o);
    }
    const debts = Object.values(groups).sort((a, b) => b.total - a.total);
    res.json({ success: true, data: { totalDebt: debts.reduce((sum, d) => sum + d.total, 0), debts } });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};
