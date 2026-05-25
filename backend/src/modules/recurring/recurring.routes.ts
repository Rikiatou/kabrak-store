import { Router } from 'express';
import { getAll, create, update, remove } from './recurring.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { requireMode } from '../../middleware/businessMode';
import { createRecurringSchema, updateRecurringSchema } from './recurring.schema';

const router = Router();

router.use(authenticate);
router.use(requireMode('SERVICE'));

router.get('/', getAll);
router.post('/', validate(createRecurringSchema), create);
router.put('/:id', validate(updateRecurringSchema), update);
router.delete('/:id', remove);

export default router;
