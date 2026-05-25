import { Router } from 'express';
import { getAll, getOne, createFromOrder, createStandalone } from './invoices.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', createFromOrder);
router.post('/standalone', createStandalone);

export default router;
