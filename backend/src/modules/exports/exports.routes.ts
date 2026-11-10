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
// Exports contain purchase prices and the whole customer list
router.use(authorize('OWNER', 'MANAGER'));

router.get('/history', getExportHistory);
router.get('/products', exportProducts);
router.get('/clients', exportClients);
router.get('/orders', exportOrders);
router.get('/invoices', exportInvoices);
router.get('/backup', authorize('OWNER'), backupAll);

export default router;
