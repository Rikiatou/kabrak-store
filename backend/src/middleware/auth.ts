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
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, tenantId: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Invalid or inactive user' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
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
      res.status(403).json({ success: false, message: 'This feature requires a higher subscription plan' });
      return;
    }

    next();
  };
};
