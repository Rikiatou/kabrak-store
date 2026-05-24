import { Router } from 'express';
import { getAll, markRead, markAllRead, checkStockAlerts } from './notifications.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', getAll);
router.post('/check-stock', checkStockAlerts);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);

export default router;
