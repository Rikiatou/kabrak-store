import { Router } from 'express';
import { getAll, getOne, create, update, remove } from './products.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { createProductSchema, updateProductSchema } from './products.schema';

const router = Router();

router.use(authenticate);
router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', validate(createProductSchema), create);
router.put('/:id', validate(updateProductSchema), update);
router.delete('/:id', remove);

export default router;
