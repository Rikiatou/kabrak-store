import { Router } from 'express';
import * as ctrl from './purchases.controller';
import { authorize } from '../../middleware/auth';

// Purchase prices are involved everywhere here: owner and managers only
const router = Router();
router.use(authorize('OWNER', 'MANAGER'));

router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.post('/:id/pay', ctrl.pay);
router.post('/:id/cancel', ctrl.cancel);

export default router;
