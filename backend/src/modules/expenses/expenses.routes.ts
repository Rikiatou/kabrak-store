import { Router } from 'express';
import * as ctrl from './expenses.controller';

const router = Router();

router.get('/', ctrl.getAll);
router.get('/summary', ctrl.getSummary);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
