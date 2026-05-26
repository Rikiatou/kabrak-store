import { Router } from 'express';
import * as ctrl from './public.controller';

const router = Router();

router.get('/tenant/:slug', ctrl.getTenantBySlug);
router.get('/products/:slug', ctrl.getPublicProducts);

export default router;
