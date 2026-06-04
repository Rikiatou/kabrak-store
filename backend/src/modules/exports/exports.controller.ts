import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      const str = v == null ? '' : String(v);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    })
    .join(',');
}

export const exportProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      where: { tenantId: req.user!.tenantId },
      include: { category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });

    const headers = ['Nom', 'Catégorie', 'Type', 'Prix achat', 'Prix vente', 'Stock', 'Code-barres', 'SKU', 'Actif'];
    const rows = products.map((p) =>
      toCsvRow([p.name, p.category?.name, p.businessType, p.costPrice, p.sellingPrice, p.totalStock, p.barcode, p.sku, p.isActive ? 'Oui' : 'Non'])
    );

    const csv = [toCsvRow(headers), ...rows].join('\n');

    await prisma.dataExport.create({
      data: {
        type: 'products',
        format: 'csv',
        status: 'completed',
        tenantId: req.user!.tenantId,
        metadata: { count: products.length },
      },
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=produits-${Date.now()}.csv`);
    res.send('\ufeff' + csv); // BOM for Excel compatibility
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur export';
    res.status(500).json({ success: false, message });
  }
};

export const exportClients = async (req: Request, res: Response): Promise<void> => {
  try {
    const clients = await prisma.client.findMany({
      where: { tenantId: req.user!.tenantId },
      orderBy: { name: 'asc' },
    });

    const headers = ['Nom', 'Téléphone', 'Email', 'Adresse', 'Points fidélité', 'Tier', 'Total dépensé', 'Commandes'];
    const rows = clients.map((c) =>
      toCsvRow([c.name, c.phone, c.email, c.address, c.loyaltyPoints, c.loyaltyTier, c.totalSpent, c.totalOrders])
    );

    const csv = [toCsvRow(headers), ...rows].join('\n');

    await prisma.dataExport.create({
      data: {
        type: 'clients',
        format: 'csv',
        status: 'completed',
        tenantId: req.user!.tenantId,
        metadata: { count: clients.length },
      },
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=clients-${Date.now()}.csv`);
    res.send('\ufeff' + csv);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur export';
    res.status(500).json({ success: false, message });
  }
};

export const exportOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      where: { tenantId: req.user!.tenantId },
      include: {
        client: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Référence', 'Client', 'Montant', 'Payé', 'Reste', 'Statut', 'Paiement', 'Date'];
    const rows = orders.map((o) =>
      toCsvRow([
        o.reference,
        o.client?.name || 'Anonyme',
        o.finalAmount,
        o.invoice?.amountPaid || 0,
        o.invoice?.amountDue || o.finalAmount,
        o.status,
        o.invoice?.paymentStatus || 'PENDING',
        o.createdAt.toISOString().split('T')[0],
      ])
    );

    const csv = [toCsvRow(headers), ...rows].join('\n');

    await prisma.dataExport.create({
      data: {
        type: 'orders',
        format: 'csv',
        status: 'completed',
        tenantId: req.user!.tenantId,
        metadata: { count: orders.length },
      },
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=commandes-${Date.now()}.csv`);
    res.send('\ufeff' + csv);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur export';
    res.status(500).json({ success: false, message });
  }
};

export const exportInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { tenantId: req.user!.tenantId },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['N° Facture', 'Client', 'Montant', 'Payé', 'Dû', 'Statut', 'Date'];
    const rows = invoices.map((inv) =>
      toCsvRow([
        inv.invoiceNumber,
        inv.client?.name || 'Anonyme',
        inv.totalAmount,
        inv.amountPaid,
        inv.amountDue,
        inv.paymentStatus,
        inv.createdAt.toISOString().split('T')[0],
      ])
    );

    const csv = [toCsvRow(headers), ...rows].join('\n');

    await prisma.dataExport.create({
      data: {
        type: 'invoices',
        format: 'csv',
        status: 'completed',
        tenantId: req.user!.tenantId,
        metadata: { count: invoices.length },
      },
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=factures-${Date.now()}.csv`);
    res.send('\ufeff' + csv);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur export';
    res.status(500).json({ success: false, message });
  }
};

export const backupAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;

    const [products, clients, orders, invoices] = await Promise.all([
      prisma.product.findMany({ where: { tenantId } }),
      prisma.client.findMany({ where: { tenantId } }),
      prisma.order.findMany({
        where: { tenantId },
        include: { items: true },
      }),
      prisma.invoice.findMany({ where: { tenantId } }),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      tenantId,
      data: {
        products: { count: products.length, items: products },
        clients: { count: clients.length, items: clients },
        orders: { count: orders.length, items: orders },
        invoices: { count: invoices.length, items: invoices },
      },
    };

    await prisma.dataExport.create({
      data: {
        type: 'backup',
        format: 'json',
        status: 'completed',
        tenantId,
        metadata: {
          products: products.length,
          clients: clients.length,
          orders: orders.length,
          invoices: invoices.length,
        },
      },
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup-kabrak-${Date.now()}.json`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur backup';
    res.status(500).json({ success: false, message });
  }
};

export const getExportHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const exports = await prisma.dataExport.findMany({
      where: { tenantId: req.user!.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, data: exports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
};
