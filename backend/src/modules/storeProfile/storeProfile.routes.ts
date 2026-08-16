import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import * as ctrl from './storeProfile.controller';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', asyncHandler(ctrl.getStoreProfile));
router.put('/', asyncHandler(ctrl.upsertStoreProfile));

export default router;
