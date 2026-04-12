import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rateLimiter';
import * as ctrl from './auth.controller';

const router = Router();

router.post('/register', authRateLimiter, asyncHandler(ctrl.register));
router.post('/login', authRateLimiter, asyncHandler(ctrl.login));
router.get('/me', authenticate, asyncHandler(ctrl.getMe));

export default router;
