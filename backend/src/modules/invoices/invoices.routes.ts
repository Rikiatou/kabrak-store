import { Router } from 'express';
import { getAll, getOne, createFromOrder, createStandalone } from './invoices.controller';
const router = Router();

router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', createFromOrder);
router.post('/standalone', createStandalone);

export default router;
