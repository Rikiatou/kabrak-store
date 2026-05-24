import { Router } from 'express';
import { getAll, getOne, createFromOrder } from './invoices.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', createFromOrder);

export default router;
