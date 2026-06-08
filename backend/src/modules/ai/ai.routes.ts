import { Router } from 'express';
import * as ctrl from './ai.controller';
import { requirePlan } from '../../middleware/auth';

const router = Router();

router.post('/report', requirePlan('BUSINESS'), ctrl.generateReport);

export default router;
