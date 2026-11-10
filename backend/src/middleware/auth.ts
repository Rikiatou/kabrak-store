import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/prisma';
import { UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  /** The user's own tenant; differs from tenantId when an owner works in another of their boutiques. */
  homeTenantId: string;
  modules: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; tenantId?: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, tenantId: true, isActive: true, modules: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Invalid or inactive user' });
      return;
    }

    let tenantId = user.tenantId;
    if (decoded.tenantId && decoded.tenantId !== user.tenantId) {
      const branch = await prisma.tenant.findUnique({ where: { id: decoded.tenantId }, select: { parentTenantId: true } });
      if (user.role !== 'OWNER' || branch?.parentTenantId !== user.tenantId) {
        res.status(401).json({ success: false, message: 'Invalid token' });
        return;
      }
      tenantId = decoded.tenantId;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId,
      homeTenantId: user.tenantId,
      modules: user.modules,
    };

    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

// Staff accounts with a module list only reach the APIs of those modules. Owners and empty lists = full access.
export const requireModule = (...keys: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { role, modules } = req.user;
    if (role === 'OWNER' || !modules?.length || keys.some((k) => modules.includes(k))) {
      next();
      return;
    }
    res.status(403).json({ success: false, code: 'MODULE_FORBIDDEN', message: "Vous n'avez pas accès à ce module" });
  };
};

export const requireMode = (...modes: ('PRODUCT' | 'SERVICE')[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { businessMode: true },
    });

    if (!tenant) {
      res.status(404).json({ success: false, message: 'Tenant not found' });
      return;
    }

    if (!modes.includes(tenant.businessMode as 'PRODUCT' | 'SERVICE')) {
      res.status(403).json({ success: false, message: 'This feature is not available for your business mode' });
      return;
    }

    next();
  };
};

export const requirePlan = (...plans: ('STORE' | 'SHOP' | 'BUSINESS')[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { plan: true },
    });

    if (!tenant) {
      res.status(404).json({ success: false, message: 'Tenant not found' });
      return;
    }

    if (!plans.includes(tenant.plan as 'STORE' | 'SHOP' | 'BUSINESS')) {
      res.status(403).json({
        success: false,
        message: 'Cette fonction nécessite une offre supérieure.',
        code: 'PLAN_REQUIRED',
        requiredPlans: plans,
      });
      return;
    }

    next();
  };
};
