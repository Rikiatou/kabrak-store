import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './ai.controller';

const router = Router();
router.use(authenticate);

router.post('/report', ctrl.generateReport);

export default router;
