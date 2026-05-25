import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireSuperAdmin } from '../../middleware/adminAuth';
import {
  getDashboard,
  getAllTenants,
  getTenantDetail,
  suspendTenant,
  reactivateTenant,
  extendSubscription,
  changeTenantPlan,
  getPendingPayments,
  getAllPayments,
  approvePayment,
  rejectPayment,
  getAnalytics,
} from './admin.controller';

const router = Router();

router.use(authenticate, requireSuperAdmin);

// Dashboard
router.get('/dashboard', getDashboard);
router.get('/analytics', getAnalytics);

// Tenants
router.get('/tenants', getAllTenants);
router.get('/tenants/:id', getTenantDetail);
router.post('/tenants/:id/suspend', suspendTenant);
router.post('/tenants/:id/reactivate', reactivateTenant);
router.post('/tenants/:id/extend', extendSubscription);
router.post('/tenants/:id/change-plan', changeTenantPlan);

// Orange Money Payments
router.get('/payments/pending', getPendingPayments);
router.get('/payments', getAllPayments);
router.post('/payments/:paymentId/approve', approvePayment);
router.post('/payments/:paymentId/reject', rejectPayment);

export default router;
