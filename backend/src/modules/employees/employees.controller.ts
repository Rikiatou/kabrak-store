import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma';

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const employees = await prisma.user.findMany({
      where: { tenantId: req.user!.tenantId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: employees });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch employees';
    res.status(500).json({ success: false, message });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ success: false, message: 'Cet email est déjà utilisé' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const employee = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: role || 'EMPLOYEE',
        tenantId: req.user!.tenantId,
      },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isActive: true },
    });

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create employee';
    res.status(500).json({ success: false, message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { firstName, lastName, phone, role, isActive } = req.body;

    const existing = await prisma.user.findFirst({
      where: { id, tenantId: req.user!.tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Employé non trouvé' });
      return;
    }

    if (existing.role === 'OWNER') {
      res.status(403).json({ success: false, message: 'Impossible de modifier le propriétaire' });
      return;
    }

    const employee = await prisma.user.update({
      where: { id },
      data: { firstName, lastName, phone, role, isActive },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isActive: true },
    });

    res.json({ success: true, data: employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update employee';
    res.status(500).json({ success: false, message });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.user.findFirst({
      where: { id, tenantId: req.user!.tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Employé non trouvé' });
      return;
    }

    if (existing.role === 'OWNER') {
      res.status(403).json({ success: false, message: 'Impossible de supprimer le propriétaire' });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: 'Employé supprimé' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete employee';
    res.status(500).json({ success: false, message });
  }
};
