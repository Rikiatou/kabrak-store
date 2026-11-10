import { Router } from 'express';
import { getAll, getOne, create, updateStatus, getAgenda, returnItems, fixDiscount } from './orders.controller';
import { validate } from '../../middleware/validate';
import { authorize, requireMode } from '../../middleware/auth';
import { createOrderSchema, returnItemsSchema, updateOrderStatusSchema, fixDiscountSchema } from './orders.schema';

const router = Router();

router.use(requireMode('PRODUCT'));
router.get('/', getAll);
router.get('/agenda', getAgenda);
router.get('/:id', getOne);
router.post('/', validate(createOrderSchema), create);
router.patch('/:id/status', validate(updateOrderStatusSchema), updateStatus);
router.post('/:id/return', authorize('OWNER', 'MANAGER'), validate(returnItemsSchema), returnItems);

router.post('/:id/fix-discount', authorize('OWNER', 'MANAGER'), validate(fixDiscountSchema), fixDiscount);

export default router;
