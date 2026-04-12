import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import * as ctrl from './orders.controller';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', asyncHandler(ctrl.listOrders));
router.get('/:id', asyncHandler(ctrl.getOrder));
router.patch('/:id/status', asyncHandler(ctrl.updateStatus));
router.patch('/:id/correction', asyncHandler(ctrl.saveCorrection));

export default router;
