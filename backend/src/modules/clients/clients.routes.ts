import { Router } from 'express';
import { getAll, getOne, create, update, remove } from './clients.controller';
import { authorize } from '../../middleware/auth';

const router = Router();

router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', authorize('OWNER', 'MANAGER'), create);
router.put('/:id', authorize('OWNER', 'MANAGER'), update);
router.delete('/:id', authorize('OWNER', 'MANAGER'), remove);

export default router;
