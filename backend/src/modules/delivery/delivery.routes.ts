import { Router } from 'express';
import { getAll, create, updateStatus } from './delivery.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', getAll);
router.post('/', create);
router.patch('/:id/status', updateStatus);

export default router;
