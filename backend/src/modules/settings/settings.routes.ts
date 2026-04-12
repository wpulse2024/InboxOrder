import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import * as ctrl from './settings.controller';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', asyncHandler(ctrl.getSettings));
router.patch('/', asyncHandler(ctrl.updateSettings));
router.post('/facebook/connect', asyncHandler(ctrl.connectFacebook));
router.delete('/facebook/disconnect', asyncHandler(ctrl.disconnectFacebook));

export default router;
