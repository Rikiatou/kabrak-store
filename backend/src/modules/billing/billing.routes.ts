import { Router } from 'express';
import { getSubscription, changePlan, initiatePayment, confirmPayment } from './billing.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/subscription', getSubscription);
router.post('/change-plan', authorize('OWNER'), changePlan);
router.post('/pay', authorize('OWNER'), initiatePayment);
router.post('/confirm', authorize('OWNER'), confirmPayment);

export default router;
