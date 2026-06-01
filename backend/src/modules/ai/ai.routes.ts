import { Router } from 'express';
import * as ctrl from './ai.controller';

const router = Router();

router.post('/report', ctrl.generateReport);

export default router;
