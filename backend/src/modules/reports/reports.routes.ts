import { Router } from 'express';
import { getDashboard, getSalesReport } from './reports.controller';
const router = Router();

router.get('/dashboard', getDashboard);
router.get('/sales', getSalesReport);

export default router;
