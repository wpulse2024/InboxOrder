import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { webhookRateLimiter } from '../../middleware/rateLimiter';
import * as ctrl from './webhook.controller';

const router = Router();

// GET: Facebook webhook challenge verification (now async — supports per-page verify tokens)
router.get('/facebook', asyncHandler(ctrl.handleGet));
router.post('/facebook', webhookRateLimiter, asyncHandler(ctrl.handlePost));

export default router;
