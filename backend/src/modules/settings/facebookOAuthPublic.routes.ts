import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { handleFacebookOAuthCallback } from './facebookOAuth.controller';

// Mounted outside the authenticated /api/settings router — Facebook redirects
// the browser here directly with no Authorization header.
const router = Router();

router.get('/callback', asyncHandler(handleFacebookOAuthCallback));

export default router;
