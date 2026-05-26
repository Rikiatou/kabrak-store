import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './expenses.controller';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/summary', ctrl.getSummary);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
