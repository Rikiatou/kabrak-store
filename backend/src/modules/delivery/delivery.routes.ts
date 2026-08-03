import { Router } from 'express';
import { getAll, create, updateStatus } from './delivery.controller';
import { authorize, requireMode, requirePlan } from '../../middleware/auth';

const router = Router();

router.use(requireMode('PRODUCT'));
router.use(requirePlan('SHOP', 'BUSINESS'));
router.get('/', getAll);
router.post('/', authorize('OWNER', 'MANAGER'), create);
router.patch('/:id/status', authorize('OWNER', 'MANAGER', 'CASHIER'), updateStatus);

export default router;
