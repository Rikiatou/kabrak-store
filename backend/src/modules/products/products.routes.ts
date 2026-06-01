import { Router } from 'express';
import { getAll, getOne, create, update, remove, findByBarcode, getLowStock } from './products.controller';
import { validate } from '../../middleware/validate';
import { authorize } from '../../middleware/auth';
import { createProductSchema, updateProductSchema } from './products.schema';

const router = Router();

router.get('/', getAll);
router.get('/low-stock', getLowStock);
router.get('/barcode/:code', findByBarcode);
router.get('/:id', getOne);
router.post('/', authorize('OWNER', 'MANAGER'), validate(createProductSchema), create);
router.put('/:id', authorize('OWNER', 'MANAGER'), validate(updateProductSchema), update);
router.delete('/:id', authorize('OWNER', 'MANAGER'), remove);

export default router;
