import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, requirePlatformAdmin } from '../../middleware/auth';
import * as ctrl from './admin.controller';

const router = Router();

router.use(authenticate, requirePlatformAdmin);

router.get('/config', asyncHandler(ctrl.getConfig));
router.patch('/config', asyncHandler(ctrl.patchConfig));

export default router;
