import { Router } from 'express';
import * as ctrl from './expenses.controller';
import { authorize } from '../../middleware/auth';

const router = Router();

router.get('/', ctrl.getAll);
router.get('/summary', ctrl.getSummary);
router.post('/', authorize('OWNER', 'MANAGER'), ctrl.create);
router.put('/:id', authorize('OWNER', 'MANAGER'), ctrl.update);
router.delete('/:id', authorize('OWNER'), ctrl.remove);

export default router;
