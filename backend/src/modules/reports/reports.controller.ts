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
    ] = await Promise.all([
      prisma.order.count({
        where: { tenantId, createdAt: { gte: startDate, lt: endDate } },
      }),
      prisma.order.aggregate({
        where: { tenantId, createdAt: { gte: startDate, lt: endDate } },
        _sum: { amountPaid: true },
      }),
      prisma.product.count({ where: { tenantId, isActive: true } }),
      prisma.client.count({ where: { tenantId } }),
      prisma.product.findMany({
        where: { tenantId, totalStock: { lte: 5 } },
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
        where: { order: { tenantId, createdAt: { gte: startDate, lt: endDate } } },
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
      const costPrice = product?.costPrice || 0;
      const totalCost = costPrice * (tp._sum.quantity || 0);
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
        salesByPeriod[key].profit += (item.unitPrice - (item.product.costPrice || 0)) * item.quantity;
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
