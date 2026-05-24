import { Router } from 'express';
import { getDashboard, getSalesReport } from './reports.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/dashboard', getDashboard);
router.get('/sales', getSalesReport);

export default router;
