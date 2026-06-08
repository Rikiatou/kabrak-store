import { Router } from 'express';
import { getAll, create, update, remove } from './categories.controller';
import { authorize, requireMode, requirePlan } from '../../middleware/auth';

const router = Router();

router.use(requireMode('PRODUCT'));
router.use(requirePlan('SHOP', 'BUSINESS'));
router.get('/', getAll);
router.post('/', authorize('OWNER', 'MANAGER'), create);
router.put('/:id', authorize('OWNER', 'MANAGER'), update);
router.delete('/:id', authorize('OWNER', 'MANAGER'), remove);

export default router;
