import { Router } from 'express';
import {
  getLoyaltyConfig,
  getClientLoyalty,
  addPoints,
  getRewards,
  createReward,
  redeemReward,
} from './loyalty.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/config', getLoyaltyConfig);
router.get('/client/:clientId', getClientLoyalty);
router.post('/add-points', addPoints);
router.get('/rewards', getRewards);
router.post('/rewards', authorize('OWNER', 'MANAGER'), createReward);
router.post('/redeem', redeemReward);

export default router;
