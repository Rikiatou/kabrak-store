import { Router } from 'express';
import { getAll, create, update, remove, resetPassword } from './employees.controller';
import { authorize, requirePlan } from '../../middleware/auth';

const router = Router();

router.use(requirePlan('SHOP', 'BUSINESS'));
router.get('/', getAll);
router.post('/', authorize('OWNER', 'MANAGER'), create);
router.put('/:id', authorize('OWNER', 'MANAGER'), update);
router.put('/:id/password', authorize('OWNER', 'MANAGER'), resetPassword);
router.delete('/:id', authorize('OWNER'), remove);

export default router;
