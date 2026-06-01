import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { config } from '../../config';
import { RegisterInput, LoginInput } from './auth.schema';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
}

function getPlanPrice(plan: string): number {
  switch (plan) {
    case 'BUSINESS': return 12900;
    case 'SHOP': return 7900;
    default: return 4900;
  }
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as RegisterInput;

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'Cet email est déjà utilisé' });
      return;
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const slug = generateSlug(data.storeName);
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.storeName,
          slug,
          plan: data.plan,
          businessMode: data.businessMode,
          businessCategories: data.businessCategories,
          phone: data.phone,
          email: data.email,
          language: data.language,
        },
      });

      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: 'OWNER',
          tenantId: tenant.id,
        },
      });

      await tx.subscription.create({
        data: {
          plan: data.plan,
          status: 'TRIAL',
          priceMonthly: getPlanPrice(data.plan),
          startDate: new Date(),
          endDate: trialEnd,
          trialEndsAt: trialEnd,
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    const token = jwt.sign({ userId: result.user.id }, config.jwtSecret, {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
        },
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          plan: result.tenant.plan,
          businessMode: result.tenant.businessMode,
          businessCategories: result.tenant.businessCategories,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    res.status(500).json({ success: false, message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as LoginInput;

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { tenant: true },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
      return;
    }

    const validPassword = await bcrypt.compare(data.password, user.password);
    if (!validPassword) {
      res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ success: false, message: 'Compte désactivé' });
      return;
    }

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          plan: user.tenant.plan,
          businessMode: user.tenant.businessMode,
          businessCategories: user.tenant.businessCategories,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    res.status(500).json({ success: false, message });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, phone, email } = req.body;
    const userId = req.user!.id;

    if (email) {
      const existing = await prisma.user.findFirst({ where: { email, NOT: { id: userId } } });
      if (existing) {
        res.status(400).json({ success: false, message: 'Cet email est déjà utilisé' });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(email && { email }),
      },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed';
    res.status(500).json({ success: false, message });
  }
};

export const updateStore = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, logo, invoiceColor } = req.body;
    const tenantId = req.user!.tenantId;

    // Validate logo size (max 500KB base64)
    if (logo && logo.length > 500000) {
      res.status(413).json({ success: false, message: 'Logo trop grand (max 500KB)' });
      return;
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(logo !== undefined && { logo }),
        ...(invoiceColor && { invoiceColor }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed';
    res.status(500).json({ success: false, message });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Mot de passe actuel et nouveau requis' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    res.json({ success: true, message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password change failed';
    res.status(500).json({ success: false, message });
  }
};

export const updateCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { businessCategories } = req.body;
    const tenantId = req.user!.tenantId;

    if (!Array.isArray(businessCategories) || businessCategories.length === 0) {
      res.status(400).json({ success: false, message: 'Au moins une catégorie requise' });
      return;
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { businessCategories },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed';
    res.status(500).json({ success: false, message });
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        tenant: {
          include: { subscription: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
        },
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          plan: user.tenant.plan,
          businessMode: user.tenant.businessMode,
          businessCategories: user.tenant.businessCategories,
          currency: user.tenant.currency,
          language: user.tenant.language,
          logo: user.tenant.logo,
          phone: user.tenant.phone,
          invoiceColor: user.tenant.invoiceColor,
        },
        subscription: user.tenant.subscription,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    res.status(500).json({ success: false, message });
  }
};
