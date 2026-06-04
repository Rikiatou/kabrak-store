import { Router } from 'express';
import { getAll, getOne, create, updateStatus } from './orders.controller';
import { validate } from '../../middleware/validate';
import { requireMode } from '../../middleware/auth';
import { createOrderSchema, updateOrderStatusSchema } from './orders.schema';

const router = Router();

router.use(requireMode('PRODUCT'));
router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', validate(createOrderSchema), create);
router.patch('/:id/status', validate(updateOrderStatusSchema), updateStatus);

export default router;
