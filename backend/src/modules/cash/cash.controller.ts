import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { computeSummary } from '../reports/reports.controller';
import { canSeeCosts, hideSummaryProfit } from '../../utils/costs';

const userSelect = { select: { id: true, firstName: true, lastName: true } };

// Cashiers count the drawer but never see purchase costs or profits
function forRole<T>(role: string, session: T): T {
  if (canSeeCosts(role) || !session || typeof session !== 'object') return session;
  const s = session as Record<string, unknown>;
  return { ...s, summary: hideSummaryProfit(s.summary as Record<string, unknown> | null) } as T;
}

const toAmount = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(/\s/g, '')) : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

async function liveTotals(tenantId: string, openedAt: Date, openingFloat: number) {
  const summary = await computeSummary(tenantId, openedAt, new Date(Date.now() + 1000), 'createdAt');
  const cashIn = summary.byMethod.CASH || 0;
  const expectedCash = openingFloat + cashIn - summary.cashExpenses;
  return { summary, cashIn, expectedCash };
}

export const getCurrent = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const session = await prisma.cashSession.findFirst({
      where: { tenantId, status: 'OPEN' },
      include: { openedBy: userSelect },
    });
    if (!session) {
      res.json({ success: true, data: null });
      return;
    }
    const live = await liveTotals(tenantId, session.openedAt, session.openingFloat);
    res.json({ success: true, data: forRole(req.user!.role, { ...session, ...live }) });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};

export const open = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const openingFloat = toAmount(req.body.openingFloat ?? 0);
    if (openingFloat === null) {
      res.status(400).json({ success: false, message: 'Fond de caisse invalide', code: 'INVALID_AMOUNT' });
      return;
    }
    const existing = await prisma.cashSession.findFirst({ where: { tenantId, status: 'OPEN' } });
    if (existing) {
      res.status(409).json({ success: false, message: 'La caisse est déjà ouverte', code: 'CASH_ALREADY_OPEN' });
      return;
    }
    const last = await prisma.cashSession.aggregate({ where: { tenantId }, _max: { number: true } });
    const session = await prisma.cashSession.create({
      data: {
        tenantId,
        number: (last._max.number || 0) + 1,
        openingFloat,
        openingNote: req.body.note ? String(req.body.note).slice(0, 500) : null,
        openedById: req.user!.id,
      },
      include: { openedBy: userSelect },
    });
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ success: false, message: 'La caisse est déjà ouverte', code: 'CASH_ALREADY_OPEN' });
      return;
    }
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};

export const close = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const countedCash = toAmount(req.body.countedCash);
    if (countedCash === null) {
      res.status(400).json({ success: false, message: 'Montant compté invalide', code: 'INVALID_AMOUNT' });
      return;
    }
    const session = await prisma.cashSession.findFirst({ where: { id: req.params.id as string, tenantId } });
    if (!session) {
      res.status(404).json({ success: false, message: 'Session introuvable' });
      return;
    }
    if (session.status !== 'OPEN') {
      res.status(409).json({ success: false, message: 'Cette caisse est déjà fermée', code: 'CASH_ALREADY_CLOSED' });
      return;
    }
    const closedAt = new Date();
    const summary = await computeSummary(tenantId, session.openedAt, closedAt, 'createdAt');
    const cashIn = summary.byMethod.CASH || 0;
    const expectedCash = session.openingFloat + cashIn - summary.cashExpenses;

    const updated = await prisma.cashSession.updateMany({
      where: { id: session.id, status: 'OPEN' },
      data: {
        status: 'CLOSED',
        closedAt,
        closedById: req.user!.id,
        countedCash,
        expectedCash,
        difference: countedCash - expectedCash,
        closingNote: req.body.note ? String(req.body.note).slice(0, 500) : null,
        summary: { ...summary, cashIn } as unknown as Prisma.InputJsonValue,
      },
    });
    if (updated.count === 0) {
      res.status(409).json({ success: false, message: 'Cette caisse est déjà fermée', code: 'CASH_ALREADY_CLOSED' });
      return;
    }
    const result = await prisma.cashSession.findUnique({
      where: { id: session.id },
      include: { openedBy: userSelect, closedBy: userSelect },
    });
    res.json({ success: true, data: forRole(req.user!.role, result) });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};

export const list = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessions = await prisma.cashSession.findMany({
      where: { tenantId: req.user!.tenantId, status: 'CLOSED' },
      orderBy: { number: 'desc' },
      take: Math.min(Number(req.query.limit) || 30, 100),
      include: { openedBy: userSelect, closedBy: userSelect },
    });
    res.json({ success: true, data: sessions.map((x) => forRole(req.user!.role, x)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};

export const getOne = async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await prisma.cashSession.findFirst({
      where: { id: req.params.id as string, tenantId: req.user!.tenantId },
      include: { openedBy: userSelect, closedBy: userSelect },
    });
    if (!session) {
      res.status(404).json({ success: false, message: 'Session introuvable' });
      return;
    }
    res.json({ success: true, data: forRole(req.user!.role, session) });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};
