import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import * as ctrl from './analytics.controller';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/summary', asyncHandler(ctrl.getSummary));
router.get('/top-products', asyncHandler(ctrl.getTopProducts));
router.get('/peak-hours', asyncHandler(ctrl.getPeakHours));
router.get('/conversion', asyncHandler(ctrl.getConversion));

export default router;
