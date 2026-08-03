import { Router } from 'express';
import {
  exportProducts,
  exportClients,
  exportOrders,
  exportInvoices,
  backupAll,
  getExportHistory,
} from './exports.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// Explicit authentication on all export routes (defense in depth)
router.use(authenticate);

router.get('/history', getExportHistory);
router.get('/products', exportProducts);
router.get('/clients', exportClients);
router.get('/orders', exportOrders);
router.get('/invoices', exportInvoices);
router.get('/backup', authorize('OWNER'), backupAll);

export default router;
