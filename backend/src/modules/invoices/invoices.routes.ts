import { Router } from 'express';
import { getAll, getOne, createFromOrder, createStandalone, addPayment } from './invoices.controller';
const router = Router();

router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', createFromOrder);
router.post('/standalone', createStandalone);
router.post('/:id/payments', addPayment);

export default router;
