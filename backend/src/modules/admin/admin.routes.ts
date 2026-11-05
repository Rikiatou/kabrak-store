import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/auth';
import { requireSuperAdmin, requireAdminToken, safeEqual } from '../../middleware/adminAuth';
import {
  getDashboard,
  getAllTenants,
  getTenantDetail,
  suspendTenant,
  reactivateTenant,
  extendSubscription,
  setSubscriptionEnd,
  changeTenantPlan,
  getPendingPayments,
  getAllPayments,
  approvePayment,
  rejectPayment,
  getAnalytics,
  deleteTenant,
  resetUserPassword,
  getErrorLogs,
  resolveErrorLog,
  resolveAllErrorLogs,
  getAuditLogs,
} from './admin.controller';
import { auditAdminAction } from './adminAudit';

const router = Router();

// Admin auth: login via shared ADMIN_SECRET (same mechanism as Beauty Pro)
// Brute-force protection: 10 password attempts / 15 min per IP
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Trop de tentatives, réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/auth', adminLoginLimiter, (req: Request, res: Response) => {
  const { password } = req.body;
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    res.status(503).json({ success: false, message: 'ADMIN_SECRET non configuré' });
    return;
  }
  if (typeof password !== 'string' || !safeEqual(password, secret)) {
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
router.use(auditAdminAction);

// Dashboard
router.get('/dashboard', getDashboard);
router.get('/analytics', getAnalytics);

// Tenants
router.get('/tenants', getAllTenants);
router.get('/tenants/:id', getTenantDetail);
router.post('/tenants/:id/suspend', suspendTenant);
router.post('/tenants/:id/reactivate', reactivateTenant);
router.post('/tenants/:id/extend', extendSubscription);
router.post('/tenants/:id/set-end-date', setSubscriptionEnd);
router.post('/tenants/:id/change-plan', changeTenantPlan);
router.delete('/tenants/:id', deleteTenant);
router.post('/users/:userId/reset-password', resetUserPassword);

// Orange Money Payments
router.get('/payments/pending', getPendingPayments);
router.get('/payments', getAllPayments);
router.post('/payments/:paymentId/approve', approvePayment);
router.post('/payments/:paymentId/reject', rejectPayment);

// Bugs (error_logs) and admin action history
router.get('/errors', getErrorLogs);
router.post('/errors/resolve-all', resolveAllErrorLogs);
router.post('/errors/:id/resolve', resolveErrorLog);
router.get('/audit', getAuditLogs);

export default router;
