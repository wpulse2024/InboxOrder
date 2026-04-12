import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rateLimiter';
import * as ctrl from './auth.controller';

const router = Router();

// Public routes (rate-limited)
router.post('/register', authRateLimiter, asyncHandler(ctrl.register));
router.post('/login', authRateLimiter, asyncHandler(ctrl.login));
router.post('/refresh', authRateLimiter, asyncHandler(ctrl.refresh));
router.post('/logout', asyncHandler(ctrl.logout));

// Protected routes
router.get('/me', authenticate, asyncHandler(ctrl.getMe));
router.post('/logout-all', authenticate, asyncHandler(ctrl.logoutAll));

export default router;
