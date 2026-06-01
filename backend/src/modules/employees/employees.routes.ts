import { Router } from 'express';
import { getAll, create, update, remove } from './employees.controller';
import { authorize, requirePlan } from '../../middleware/auth';

const router = Router();

router.use(requirePlan('SHOP', 'BUSINESS'));
router.get('/', getAll);
router.post('/', authorize('OWNER', 'MANAGER'), create);
router.put('/:id', authorize('OWNER', 'MANAGER'), update);
router.delete('/:id', authorize('OWNER'), remove);

export default router;
