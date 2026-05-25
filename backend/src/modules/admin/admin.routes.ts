import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireSuperAdmin, requireAdminToken } from '../../middleware/adminAuth';
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

// Admin auth: login via shared ADMIN_SECRET (same mechanism as Beauty Pro)
router.post('/auth', (req: Request, res: Response) => {
  const { password } = req.body;
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    res.status(503).json({ success: false, message: 'ADMIN_SECRET non configuré' });
    return;
  }
  if (password !== secret) {
    res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
    return;
  }
  res.json({ success: true });
});

// Accept either JWT+superAdmin OR x-admin-token header
const adminAuth = (req: Request, res: Response, next: NextFunction): void => {
  const adminToken = req.headers['x-admin-token'];
  if (adminToken) {
    requireAdminToken(req, res, next);
    return;
  }
  authenticate(req, res, () => {
    requireSuperAdmin(req, res, next);
  });
};

router.use(adminAuth);

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
