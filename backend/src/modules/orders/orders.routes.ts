import { Router } from 'express';
import { getAll, getOne, create, updateStatus, addPayment } from './orders.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { createOrderSchema, updateOrderStatusSchema } from './orders.schema';

const router = Router();

router.use(authenticate);
router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', validate(createOrderSchema), create);
router.patch('/:id/status', validate(updateOrderStatusSchema), updateStatus);
router.post('/:id/payment', addPayment);

export default router;
