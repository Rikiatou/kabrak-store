import { Router } from 'express';
import {
  getLoyaltyConfig,
  getClientLoyalty,
  addPoints,
  getRewards,
  createReward,
  redeemReward,
} from './loyalty.controller';
import { authorize, requireMode, requirePlan } from '../../middleware/auth';

const router = Router();

router.use(requireMode('PRODUCT'));
router.use(requirePlan('SHOP', 'BUSINESS'));
router.get('/config', getLoyaltyConfig);
router.get('/client/:clientId', getClientLoyalty);
router.post('/add-points', addPoints);
router.get('/rewards', getRewards);
router.post('/rewards', authorize('OWNER', 'MANAGER'), createReward);
router.post('/redeem', redeemReward);

export default router;
