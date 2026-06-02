import { Router } from 'express';
import { register, login, me, updateProfile, changePassword, updateStore, updateCategories, forgotPassword, resetPassword } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { registerSchema, loginSchema } from './auth.schema';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, me);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);
router.put('/store', authenticate, updateStore);
router.put('/categories', authenticate, updateCategories);

export default router;
