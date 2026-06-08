import { Router } from 'express';
import * as ctrl from './suppliers.controller';
import { requirePlan } from '../../middleware/auth';

const router = Router();
router.use(requirePlan('SHOP', 'BUSINESS'));

router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
