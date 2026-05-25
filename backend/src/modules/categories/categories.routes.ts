import { Router } from 'express';
import { getAll, create, update, remove } from './categories.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', getAll);
router.post('/', authorize('OWNER', 'MANAGER'), create);
router.put('/:id', authorize('OWNER', 'MANAGER'), update);
router.delete('/:id', authorize('OWNER', 'MANAGER'), remove);

export default router;
