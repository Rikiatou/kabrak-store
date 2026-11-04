import { Router } from 'express';
import * as ctrl from './cash.controller';

const router = Router();

router.get('/current', ctrl.getCurrent);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/open', ctrl.open);
router.post('/:id/close', ctrl.close);

export default router;
