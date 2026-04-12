import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import * as ctrl from './facebook.controller';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/pages', asyncHandler(ctrl.listPages));
router.post('/pages', asyncHandler(ctrl.addPage));
router.patch('/pages/:pageId/token', asyncHandler(ctrl.rotateToken));
router.delete('/pages/:pageId', asyncHandler(ctrl.removePage));

export default router;
