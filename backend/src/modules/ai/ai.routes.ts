import { Router } from 'express';
import * as ctrl from './ai.controller';
import { authorize, requirePlan } from '../../middleware/auth';

const router = Router();

router.post('/report', authorize('OWNER', 'MANAGER'), requirePlan('BUSINESS'), ctrl.generateReport);

export default router;
