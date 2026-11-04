import { Router } from 'express';
import { register, login, me, updateProfile, changePassword, updateTenant } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { registerSchema, loginSchema, updateTenantSchema } from './auth.schema';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, me);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);
router.put('/tenant', authenticate, authorize('OWNER'), validate(updateTenantSchema), updateTenant);

export default router;
