import { Router } from 'express';
import { getAll, markRead, markAllRead, checkStockAlerts } from './notifications.controller';
const router = Router();

router.get('/', getAll);
router.post('/check-stock', checkStockAlerts);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);

export default router;
