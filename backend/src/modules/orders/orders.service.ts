import { AppError } from '../../middleware/errorHandler';
import { emitOrderUpdated } from '../../realtime/emitters';
import type { OrderStatus } from '../../models/Order';
import * as repo from './orders.repository';

export async function listOrders(filters: repo.OrderFilters) {
  return repo.findOrders(filters);
}

export async function getOrder(orderId: string, tenantId: string) {
  const order = await repo.findOrderById(orderId, tenantId);
  if (!order) throw new AppError('Order not found', 404);
  return order;
}

export async function updateStatus(
  orderId: string,
  tenantId: string,
  status: OrderStatus,
  userId: string,
  note?: string
) {
  const order = await repo.updateOrderStatus(orderId, tenantId, status, userId, note);
  if (!order) throw new AppError('Order not found', 404);

  emitOrderUpdated(tenantId, orderId, status);
  return order;
}

export async function saveCorrection(
  orderId: string,
  tenantId: string,
  corrections: Parameters<typeof repo.saveCorrection>[2]
) {
  const order = await repo.saveCorrection(orderId, tenantId, corrections);
  if (!order) throw new AppError('Order not found', 404);
  return order;
}
