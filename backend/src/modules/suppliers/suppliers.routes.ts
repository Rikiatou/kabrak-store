import { Router } from 'express';
import * as ctrl from './suppliers.controller';
import { authorize, requirePlan } from '../../middleware/auth';

const router = Router();
router.use(requirePlan('SHOP', 'BUSINESS'));

router.get('/', ctrl.getAll);
router.post('/', authorize('OWNER', 'MANAGER'), ctrl.create);
router.put('/:id', authorize('OWNER', 'MANAGER'), ctrl.update);
router.delete('/:id', authorize('OWNER', 'MANAGER'), ctrl.remove);

export default router;
