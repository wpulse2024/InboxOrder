import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import * as ctrl from './customers.controller';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', asyncHandler(ctrl.listCustomers));
router.get('/:id', asyncHandler(ctrl.getCustomer));
router.get('/:id/orders', asyncHandler(ctrl.getCustomerOrders));

export default router;
