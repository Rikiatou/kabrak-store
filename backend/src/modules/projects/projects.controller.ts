import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { CreateProjectInput, UpdateProjectInput, CreateMilestoneInput } from './projects.schema';

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', status, clientId } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = { tenantId: req.user!.tenantId };
    if (status) where.status = status as string;
    if (clientId) where.clientId = clientId as string;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, phone: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          milestones: true,
          _count: { select: { invoices: true } },
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    res.json({
      success: true,
      data: projects,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch projects';
    res.status(500).json({ success: false, message });
  }
};

export const getOne = async (req: Request, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id as string;
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId: req.user!.tenantId },
      include: {
        client: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        milestones: { orderBy: { createdAt: 'asc' } },
        invoices: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Projet non trouvé' });
      return;
    }

    res.json({ success: true, data: project });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch project';
    res.status(500).json({ success: false, message });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as CreateProjectInput;

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
        totalBudget: data.totalBudget,
        amountRemaining: data.totalBudget,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        clientId: data.clientId,
        assignedToId: data.assignedToId,
        tenantId: req.user!.tenantId,
      },
      include: { client: true, milestones: true },
    });

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create project';
    res.status(500).json({ success: false, message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id as string;
    const data = req.body as UpdateProjectInput;

    const existing = await prisma.project.findFirst({
      where: { id: projectId, tenantId: req.user!.tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Projet non trouvé' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.totalBudget !== undefined) {
      updateData.totalBudget = data.totalBudget;
      updateData.amountRemaining = data.totalBudget - existing.amountPaid;
    }
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.deadline !== undefined) updateData.deadline = new Date(data.deadline);
    if (data.clientId !== undefined) updateData.clientId = data.clientId;
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;

    if (data.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: { client: true, milestones: true },
    });

    res.json({ success: true, data: project });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project';
    res.status(500).json({ success: false, message });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id as string;
    const existing = await prisma.project.findFirst({
      where: { id: projectId, tenantId: req.user!.tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Projet non trouvé' });
      return;
    }

    await prisma.project.delete({ where: { id: projectId } });
    res.json({ success: true, message: 'Projet supprimé' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete project';
    res.status(500).json({ success: false, message });
  }
};

export const addMilestone = async (req: Request, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id as string;
    const data = req.body as CreateMilestoneInput;

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId: req.user!.tenantId },
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Projet non trouvé' });
      return;
    }

    const milestone = await prisma.projectMilestone.create({
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        amount: data.amount,
        projectId: project.id,
      },
    });

    res.status(201).json({ success: true, data: milestone });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add milestone';
    res.status(500).json({ success: false, message });
  }
};

export const completeMilestone = async (req: Request, res: Response): Promise<void> => {
  try {
    const milestoneId = req.params.milestoneId as string;
    const milestone = await prisma.projectMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) {
      res.status(404).json({ success: false, message: 'Milestone non trouvé' });
      return;
    }

    const project = await prisma.project.findFirst({
      where: { id: milestone.projectId, tenantId: req.user!.tenantId },
    });

    if (!project) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const updated = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: { isCompleted: true, completedAt: new Date() },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete milestone';
    res.status(500).json({ success: false, message });
  }
};
