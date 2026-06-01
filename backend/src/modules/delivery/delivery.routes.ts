import { Router } from 'express';
import { getAll, create, updateStatus } from './delivery.controller';
import { requireMode } from '../../middleware/auth';

const router = Router();

router.use(requireMode('PRODUCT'));
router.get('/', getAll);
router.post('/', create);
router.patch('/:id/status', updateStatus);

export default router;
