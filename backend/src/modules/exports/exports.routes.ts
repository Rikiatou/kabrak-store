import { Router } from 'express';
import {
  exportProducts,
  exportClients,
  exportOrders,
  exportInvoices,
  backupAll,
  getExportHistory,
} from './exports.controller';
import { authorize } from '../../middleware/auth';

const router = Router();

router.get('/history', getExportHistory);
router.get('/products', exportProducts);
router.get('/clients', exportClients);
router.get('/orders', exportOrders);
router.get('/invoices', exportInvoices);
router.get('/backup', authorize('OWNER'), backupAll);

export default router;
