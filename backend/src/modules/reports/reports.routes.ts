import { Router } from 'express';
import { getDashboard, getSalesReport, getDebts, getDailyClosing } from './reports.controller';
import { requirePlan } from '../../middleware/auth';

const router = Router();

router.get('/dashboard', getDashboard);
router.get('/debts', getDebts);
router.get('/daily-closing', getDailyClosing);
router.get('/sales', requirePlan('SHOP', 'BUSINESS'), getSalesReport);

export default router;
