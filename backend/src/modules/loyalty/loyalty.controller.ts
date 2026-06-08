import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

const LOYALTY_TIERS = [
  { name: 'BRONZE', minPoints: 0, discountPercent: 0 },
  { name: 'SILVER', minPoints: 100, discountPercent: 5 },
  { name: 'GOLD', minPoints: 500, discountPercent: 10 },
  { name: 'PLATINUM', minPoints: 1000, discountPercent: 15 },
];

const POINTS_PER_FCFA = parseInt(process.env.LOYALTY_POINTS_PER_FCFA || '1000', 10); // 1 point per 1000 FCFA spent

function calculateTier(points: number): string {
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (points >= LOYALTY_TIERS[i].minPoints) return LOYALTY_TIERS[i].name;
  }
  return 'BRONZE';
}

function getTierDiscount(tier: string): number {
  return LOYALTY_TIERS.find((t) => t.name === tier)?.discountPercent || 0;
}

export const getLoyaltyConfig = (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      tiers: LOYALTY_TIERS,
      pointsPerFCFA: POINTS_PER_FCFA,
    },
  });
};

export const getClientLoyalty = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const client = await prisma.client.findFirst({
      where: { id: clientId, tenantId: req.user!.tenantId },
      select: {
        id: true,
        name: true,
        loyaltyPoints: true,
        loyaltyTier: true,
        totalSpent: true,
        totalOrders: true,
      },
    });

    if (!client) {
      res.status(404).json({ success: false, message: 'Client non trouvé' });
      return;
    }

    const tier = calculateTier(client.loyaltyPoints);
    const discount = getTierDiscount(tier);
    const nextTier = LOYALTY_TIERS.find((t) => t.minPoints > client.loyaltyPoints);

    res.json({
      success: true,
      data: {
        ...client,
        tier,
        discountPercent: discount,
        nextTier: nextTier
          ? { name: nextTier.name, pointsNeeded: nextTier.minPoints - client.loyaltyPoints }
          : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur';
    res.status(500).json({ success: false, message });
  }
};

export const addPoints = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId, amount } = req.body;
    const pointsEarned = Math.floor((amount as number) / POINTS_PER_FCFA);

    const client = await prisma.client.update({
      where: { id: clientId as string },
      data: {
        loyaltyPoints: { increment: pointsEarned },
        totalSpent: { increment: amount as number },
        totalOrders: { increment: 1 },
        lastVisit: new Date(),
      },
    });

    const newTier = calculateTier(client.loyaltyPoints);
    if (newTier !== client.loyaltyTier) {
      await prisma.client.update({
        where: { id: clientId as string },
        data: { loyaltyTier: newTier },
      });
    }

    res.json({
      success: true,
      data: {
        pointsEarned,
        totalPoints: client.loyaltyPoints,
        tier: newTier,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur';
    res.status(500).json({ success: false, message });
  }
};

export const getRewards = async (req: Request, res: Response): Promise<void> => {
  try {
    const rewards = await prisma.loyaltyReward.findMany({
      where: { tenantId: req.user!.tenantId, isActive: true },
      orderBy: { pointsRequired: 'asc' },
    });
    res.json({ success: true, data: rewards });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
};

export const createReward = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, pointsRequired, discountPercent, discountAmount } = req.body;
    const reward = await prisma.loyaltyReward.create({
      data: {
        name: name as string,
        pointsRequired: pointsRequired as number,
        discountPercent: (discountPercent as number) || 0,
        discountAmount: (discountAmount as number) || 0,
        tenantId: req.user!.tenantId,
      },
    });
    res.status(201).json({ success: true, data: reward });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur';
    res.status(500).json({ success: false, message });
  }
};

export const redeemReward = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId, rewardId } = req.body;

    const [client, reward] = await Promise.all([
      prisma.client.findFirst({
        where: { id: clientId as string, tenantId: req.user!.tenantId },
      }),
      prisma.loyaltyReward.findFirst({
        where: { id: rewardId as string, tenantId: req.user!.tenantId, isActive: true },
      }),
    ]);

    if (!client || !reward) {
      res.status(404).json({ success: false, message: 'Client ou récompense non trouvé' });
      return;
    }

    if (client.loyaltyPoints < reward.pointsRequired) {
      res.status(400).json({ success: false, message: 'Points insuffisants' });
      return;
    }

    await prisma.$transaction([
      prisma.client.update({
        where: { id: clientId as string },
        data: { loyaltyPoints: { decrement: reward.pointsRequired } },
      }),
      prisma.loyaltyReward.create({
        data: {
          name: reward.name,
          pointsRequired: reward.pointsRequired,
          discountPercent: reward.discountPercent,
          discountAmount: reward.discountAmount,
          tenantId: req.user!.tenantId,
          clientId: clientId as string,
          redeemedAt: new Date(),
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Récompense utilisée !',
      data: {
        discount: reward.discountPercent > 0 ? `${reward.discountPercent}%` : `${reward.discountAmount} FCFA`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur';
    res.status(500).json({ success: false, message });
  }
};
