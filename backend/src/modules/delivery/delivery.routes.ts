import { Router } from 'express';
import { getAll, create, updateStatus } from './delivery.controller';
import { requireMode, requirePlan } from '../../middleware/auth';

const router = Router();

router.use(requireMode('PRODUCT'));
router.use(requirePlan('SHOP', 'BUSINESS'));
router.get('/', getAll);
router.post('/', create);
router.patch('/:id/status', updateStatus);

export default router;
