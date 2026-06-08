import { Router } from 'express';
import { getDashboard, getSalesReport } from './reports.controller';
import { requirePlan } from '../../middleware/auth';

const router = Router();

router.get('/dashboard', getDashboard);
router.get('/sales', requirePlan('SHOP', 'BUSINESS'), getSalesReport);

export default router;
