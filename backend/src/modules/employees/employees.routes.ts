import { Router } from 'express';
import { getAll, create, update, remove } from './employees.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requirePlan } from '../../middleware/featureGate';

const router = Router();

router.use(authenticate);
router.get('/', getAll);
router.post('/', authorize('OWNER', 'MANAGER'), requirePlan('SHOP'), create);
router.put('/:id', authorize('OWNER', 'MANAGER'), update);
router.delete('/:id', authorize('OWNER'), remove);

export default router;
