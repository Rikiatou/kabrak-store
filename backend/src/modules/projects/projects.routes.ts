import { Router } from 'express';
import { getAll, getOne, create, update, remove, addMilestone, completeMilestone } from './projects.controller';
import { validate } from '../../middleware/validate';
import { requireMode } from '../../middleware/auth';
import { createProjectSchema, updateProjectSchema, createMilestoneSchema } from './projects.schema';

const router = Router();

router.use(requireMode('SERVICE'));

router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', validate(createProjectSchema), create);
router.put('/:id', validate(updateProjectSchema), update);
router.delete('/:id', remove);
router.post('/:id/milestones', validate(createMilestoneSchema), addMilestone);
router.patch('/:id/milestones/:milestoneId/complete', completeMilestone);

export default router;
