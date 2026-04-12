import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { webhookRateLimiter } from '../../middleware/rateLimiter';
import * as ctrl from './webhook.controller';

const router = Router();

router.get('/facebook', ctrl.handleGet);
router.post('/facebook', webhookRateLimiter, asyncHandler(ctrl.handlePost));

export default router;
