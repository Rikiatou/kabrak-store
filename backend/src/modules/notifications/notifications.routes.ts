import { Router } from 'express';
import { getAll, markRead, markAllRead, checkStockAlerts } from './notifications.controller';
import { authorize } from '../../middleware/auth';

const router = Router();

router.get('/', getAll);
router.post('/check-stock', authorize('OWNER', 'MANAGER'), checkStockAlerts);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);

export default router;
