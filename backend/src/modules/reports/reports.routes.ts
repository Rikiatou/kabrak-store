import { Router } from 'express';
import { getDashboard, getSalesReport, getDebts, getDailyClosing } from './reports.controller';
import { requireModule, requirePlan } from '../../middleware/auth';

const router = Router();

router.get('/dashboard', requireModule('dashboard'), getDashboard);
router.get('/debts', requireModule('debts'), getDebts);
router.get('/daily-closing', requireModule('closing'), getDailyClosing);
router.get('/sales', requireModule('reports'), requirePlan('SHOP', 'BUSINESS'), getSalesReport);

export default router;
