import { Router } from 'express';
import {
  getSubscription,
  getPricing,
  changePlan,
  initiatePayment,
  getPaymentStatus,
  confirmManual,
  webhook,
  getHistory,
} from './billing.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// Public webhook endpoint (no auth)
router.post('/webhook', webhook);

router.use(authenticate);
router.get('/subscription', getSubscription);
router.get('/pricing', getPricing);
router.get('/history', getHistory);
router.get('/status/:paymentId', getPaymentStatus);
router.post('/change-plan', authorize('OWNER'), changePlan);
router.post('/initiate', authorize('OWNER'), initiatePayment);
router.post('/confirm/:paymentId', authorize('OWNER'), confirmManual);

export default router;
