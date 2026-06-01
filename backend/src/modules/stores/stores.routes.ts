import { Router } from 'express';
import { getAll, create, update, remove } from './stores.controller';
import { authorize, requirePlan } from '../../middleware/auth';

const router = Router();

router.use(requirePlan('BUSINESS'));
router.get('/', getAll);
router.post('/', authorize('OWNER'), create);
router.put('/:id', authorize('OWNER'), update);
router.delete('/:id', authorize('OWNER'), remove);

export default router;
