import { Router } from 'express';
import { getDashboard, getSalesReport, getDaily, getDebts } from './reports.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/dashboard', getDashboard);
router.get('/sales', getSalesReport);
router.get('/daily', getDaily);
router.get('/debts', getDebts);

export default router;
