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
      summary,
      totalProducts,
      totalClients,
      lowStockProducts,
      recentOrders,
      topProducts,
      upcomingDeliveries,
      unpaidInvoices,
    ] = await Promise.all([
      // Same numbers as the cash closing (Z): sales, money received, gross profit
      computeSummary(tenantId, startDate, endDate),
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
          seller: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { tenantId, createdAt: { gte: startDate, lt: endDate }, status: { not: 'CANCELLED' } } },
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
      where: { productId: { in: topProductIds }, order: { tenantId, createdAt: { gte: startDate, lt: endDate }, status: { not: 'CANCELLED' } } },
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


    res.json({
      success: true,
      data: {
        todayOrders: summary.orders,
        todaySales: summary.sales,
        todayRevenue: summary.received,
        grossProfit: summary.grossProfit,
        expenses: summary.expenses,
        netProfit: summary.netProfit,
        totalProducts,
        totalClients,
        lowStockProducts,
        recentOrders,
        topProducts: topProductsWithDetails,
        totalGrossMargin: summary.grossProfit,
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

const pad2 = (n: number) => String(n).padStart(2, '0');
const localDay = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseDay = (s: string) => new Date(`${s}T00:00:00`);

/**
 * Detailed sales report for [from, to] (local days, `to` included).
 * Totals come from computeSummary, the same function as the dashboard and the Z report.
 */
export const getSalesReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const { from, to } = req.query as { from?: string; to?: string };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = from ? parseDay(from) : new Date(today.getTime() - 29 * 86400000);
    const endDay = to ? parseDay(to) : today;
    const end = new Date(endDay);
    end.setDate(end.getDate() + 1);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      res.status(400).json({ success: false, message: 'Période invalide' });
      return;
    }
    const days = Math.round((end.getTime() - start.getTime()) / 86400000);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - days);
    const groupBy: 'day' | 'week' | 'month' =
      req.query.groupBy === 'week' || req.query.groupBy === 'month' || req.query.groupBy === 'day'
        ? (req.query.groupBy as 'day' | 'week' | 'month')
        : days <= 31 ? 'day' : days <= 120 ? 'week' : 'month';

    const [summary, previous, orders, cancelledOrders, refunds, newDebts, stockedProducts] = await Promise.all([
      computeSummary(tenantId, start, end),
      computeSummary(tenantId, prevStart, start),
      prisma.order.findMany({
        where: { tenantId, createdAt: { gte: start, lt: end }, status: { not: 'CANCELLED' } },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, costPrice: true, category: { select: { id: true, name: true } } } },
            },
          },
          seller: { select: { id: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.order.findMany({
        where: { tenantId, createdAt: { gte: start, lt: end }, status: 'CANCELLED' },
        select: {
          finalAmount: true,
          seller: { select: { id: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.payment.aggregate({
        where: { createdAt: { gte: start, lt: end }, amount: { lt: 0 }, invoice: { tenantId } },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({
        where: { tenantId, order: { createdAt: { gte: start, lt: end }, status: { not: 'CANCELLED' } }, amountDue: { gt: 0 } },
        _sum: { amountDue: true },
        _count: true,
      }),
      prisma.product.findMany({
        where: { tenantId, isActive: true, isService: false, totalStock: { gt: 0 } },
        select: { id: true, name: true, totalStock: true, sellingPrice: true, costPrice: true },
      }),
    ]);

    const periodKey = (d: Date) => {
      if (groupBy === 'month') return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
      if (groupBy === 'week') {
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        return localDay(monday);
      }
      return localDay(d);
    };

    type SellerRow = {
      name: string; orders: number; sales: number; discounts: number; returns: number;
      cancelled: number; cancelledAmount: number; zeroSales: number; bigDiscounts: number;
    };
    const salesByPeriod = new Map<string, { revenue: number; orders: number; profit: number }>();
    const sellers = new Map<string, SellerRow>();
    const products = new Map<string, { name: string; quantity: number; amount: number; cost: number }>();
    const categories = new Map<string, { name: string; quantity: number; amount: number; profit: number }>();
    const belowCost = new Map<string, { name: string; quantity: number; unitPrice: number; unitCost: number; loss: number }>();
    const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0, sales: 0 }));
    const byWeekday = Array.from({ length: 7 }, (_, day) => ({ day, orders: 0, sales: 0 }));
    const soldIds = new Set<string>();
    let returns = 0;
    let returnedItems = 0;

    const sellerOf = (who: { id: string; firstName: string; lastName: string }) => {
      const row = sellers.get(who.id) ?? {
        name: `${who.firstName} ${who.lastName}`.trim(), orders: 0, sales: 0, discounts: 0, returns: 0,
        cancelled: 0, cancelledAmount: 0, zeroSales: 0, bigDiscounts: 0,
      };
      sellers.set(who.id, row);
      return row;
    };

    for (const o of orders) {
      const d = new Date(o.createdAt);
      const gross = o.items.reduce((s, it) => s + it.unitPrice * (it.quantity + it.returnedQty), 0);
      // Share of the order discount kept on each line, so product/category amounts add up to the sales
      const ratio = o.totalAmount > 0 ? o.finalAmount / o.totalAmount : 1;
      let orderCost = 0;
      let orderReturns = 0;
      for (const it of o.items) {
        soldIds.add(it.productId);
        const unitCost = it.unitCost ?? it.product.costPrice ?? 0;
        const amount = it.unitPrice * it.quantity * ratio;
        const cost = unitCost * it.quantity;
        orderCost += cost;
        orderReturns += it.unitPrice * it.returnedQty * ratio;
        returnedItems += it.returnedQty;

        const key = `${it.productId}|${it.variant || ''}`;
        const name = it.variant ? `${it.product.name} (${it.variant})` : it.product.name;
        if (it.quantity > 0) {
          const p = products.get(key) ?? { name, quantity: 0, amount: 0, cost: 0 };
          p.quantity += it.quantity;
          p.amount += amount;
          p.cost += cost;
          products.set(key, p);

          const cat = it.product.category;
          const ckey = cat?.id ?? 'none';
          const c = categories.get(ckey) ?? { name: cat?.name ?? '', quantity: 0, amount: 0, profit: 0 };
          c.quantity += it.quantity;
          c.amount += amount;
          c.profit += amount - cost;
          categories.set(ckey, c);
        }

        if (it.quantity > 0 && unitCost > 0 && it.unitPrice < unitCost) {
          const b = belowCost.get(key) ?? { name, quantity: 0, unitPrice: it.unitPrice, unitCost, loss: 0 };
          b.quantity += it.quantity;
          b.loss += (unitCost - it.unitPrice) * it.quantity;
          belowCost.set(key, b);
        }
      }
      returns += orderReturns;

      const k = periodKey(d);
      const bucket = salesByPeriod.get(k) ?? { revenue: 0, orders: 0, profit: 0 };
      bucket.revenue += o.finalAmount;
      bucket.orders += 1;
      bucket.profit += o.finalAmount - orderCost;
      salesByPeriod.set(k, bucket);

      byHour[d.getHours()].orders += 1;
      byHour[d.getHours()].sales += o.finalAmount;
      byWeekday[d.getDay()].orders += 1;
      byWeekday[d.getDay()].sales += o.finalAmount;

      const s = sellerOf(o.seller ?? o.createdBy);
      s.orders += 1;
      s.sales += o.finalAmount;
      s.discounts += o.discount || 0;
      s.returns += orderReturns;
      if (o.finalAmount <= 0 && gross > 0) s.zeroSales += 1;
      else if ((o.discount || 0) > 0 && o.discount >= 0.5 * (o.discount + o.finalAmount)) s.bigDiscounts += 1;
    }
    for (const o of cancelledOrders) {
      const s = sellerOf(o.seller ?? o.createdBy);
      s.cancelled += 1;
      s.cancelledAmount += o.finalAmount;
    }

    const productRows = [...products.values()].map((p) => ({ ...p, profit: p.amount - p.cost }));
    const unsold = stockedProducts
      .filter((p) => !soldIds.has(p.id))
      .map((p) => ({ name: p.name, stock: p.totalStock, value: p.totalStock * (p.costPrice || 0) }))
      .sort((a, b) => b.value - a.value || b.stock - a.stock);

    res.json({
      success: true,
      data: {
        from: localDay(start),
        to: localDay(endDay),
        groupBy,
        summary: {
          orders: summary.orders,
          itemsSold: summary.itemsSold,
          sales: summary.sales,
          received: summary.received,
          discounts: summary.discounts,
          returns,
          returnedItems,
          refunds: -(refunds._sum.amount || 0),
          grossProfit: summary.grossProfit,
          expenses: summary.expenses,
          netProfit: summary.netProfit,
          newDebts: newDebts._sum.amountDue || 0,
          newDebtsCount: newDebts._count,
          cancelled: summary.cancelled,
          averageBasket: summary.orders > 0 ? summary.sales / summary.orders : 0,
        },
        previous: {
          orders: previous.orders,
          sales: previous.sales,
          received: previous.received,
          grossProfit: previous.grossProfit,
          expenses: previous.expenses,
          netProfit: previous.netProfit,
        },
        byMethod: summary.byMethod,
        salesByPeriod: [...salesByPeriod.entries()].map(([period, v]) => ({ period, ...v })),
        sellers: [...sellers.values()].sort((a, b) => b.sales - a.sales),
        topProducts: [...productRows].sort((a, b) => b.amount - a.amount).slice(0, 15),
        bestMargins: [...productRows].filter((p) => p.profit > 0).sort((a, b) => b.profit - a.profit).slice(0, 5),
        unsold: unsold.slice(0, 15),
        unsoldCount: unsold.length,
        belowCost: [...belowCost.values()].sort((a, b) => b.loss - a.loss),
        categories: [...categories.values()].sort((a, b) => b.amount - a.amount),
        byHour,
        byWeekday,
        // Kept for older app versions
        totalRevenue: summary.sales,
        totalProfit: summary.grossProfit,
        totalOrders: summary.orders,
        topSellers: [...sellers.values()].map((s) => ({ name: s.name, revenue: s.sales, orders: s.orders, discounts: s.discounts })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sales report';
    res.status(500).json({ success: false, message });
  }
};

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
  sellers: Array<{ name: string; orders: number; sales: number; discounts: number; items: Array<{ name: string; quantity: number; amount: number }> }>;
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

  const sellers = new Map<string, { name: string; orders: number; sales: number; discounts: number; items: Map<string, { name: string; quantity: number; amount: number }> }>();
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
    const entry = sellers.get(who.id) ?? { name: `${who.firstName} ${who.lastName}`.trim(), orders: 0, sales: 0, discounts: 0, items: new Map() };
    entry.orders += 1;
    entry.sales += o.finalAmount;
    entry.discounts += o.discount || 0;
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
