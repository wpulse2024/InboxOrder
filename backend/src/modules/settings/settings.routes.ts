import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import * as ctrl from './settings.controller';
import * as oauthCtrl from './facebookOAuth.controller';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', asyncHandler(ctrl.getSettings));
router.patch('/', asyncHandler(ctrl.updateSettings));
router.post('/facebook/connect', asyncHandler(ctrl.connectFacebook));
router.delete('/facebook/disconnect', asyncHandler(ctrl.disconnectFacebook));
router.post('/ai/grok', asyncHandler(ctrl.connectGrok));
router.delete('/ai/grok', asyncHandler(ctrl.disconnectGrok));

router.get('/facebook/oauth/start', asyncHandler(oauthCtrl.startFacebookOAuth));
router.get('/facebook/oauth/pending', asyncHandler(oauthCtrl.getPendingPages));
router.post('/facebook/oauth/select', asyncHandler(oauthCtrl.selectFacebookPage));

export default router;
