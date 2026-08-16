import { Types } from 'mongoose';
import { Order, IOrder, OrderStatus } from '../../models/Order';
import { OrderStatusHistory } from '../../models/OrderStatusHistory';
import { ParsedOrder } from '../../models/ParsedOrder';

export interface OrderFilters {
  tenantId: string;
  status?: OrderStatus;
  dateFrom?: Date;
  dateTo?: Date;
  product?: string;
  page?: number;
  limit?: number;
}

export async function findOrders(filters: OrderFilters) {
  const { tenantId, status, dateFrom, dateTo, page = 1, limit = 20 } = filters;
  const query: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId) };

  if (status) query.status = status;
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) (query.createdAt as Record<string, unknown>).$gte = dateFrom;
    if (dateTo) (query.createdAt as Record<string, unknown>).$lte = dateTo;
  }

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('customerId', 'name fbSenderId phone')
      .lean(),
    Order.countDocuments(query),
  ]);

  return { orders, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function findOrderById(
  orderId: string,
  tenantId: string
): Promise<IOrder | null> {
  return Order.findOne({ _id: orderId, tenantId })
    .populate('customerId', 'name fbSenderId phone address')
    .populate('messageId', 'text fbMessageId senderId');
}

export async function updateOrderStatus(
  orderId: string,
  tenantId: string,
  toStatus: OrderStatus,
  changedBy: string,
  note?: string
): Promise<IOrder | null> {
  const order = await Order.findOne({ _id: orderId, tenantId });
  if (!order) return null;

  const fromStatus = order.status;
  order.status = toStatus;
  await order.save();

  await OrderStatusHistory.create({
    tenantId,
    orderId,
    fromStatus,
    toStatus,
    changedBy: new Types.ObjectId(changedBy),
    note,
  });

  return order;
}

/**
 * System/bot-driven cancellation — no dashboard user involved, so `changedBy`
 * is left unset. Used when a customer chooses to replace an existing order
 * via the conversational Messenger flow; the admin reviews/finalizes later.
 */
export async function cancelOrderBySystem(
  orderId: string,
  tenantId: string,
  note: string
): Promise<IOrder | null> {
  const order = await Order.findOne({ _id: orderId, tenantId });
  if (!order) return null;

  const fromStatus = order.status;
  order.status = 'cancelled';
  await order.save();

  await OrderStatusHistory.create({
    tenantId,
    orderId,
    fromStatus,
    toStatus: 'cancelled',
    note,
  });

  return order;
}

export async function saveCorrection(
  orderId: string,
  tenantId: string,
  corrections: Partial<Pick<IOrder, 'items' | 'notes' | 'totalAmount'>>
): Promise<IOrder | null> {
  return Order.findOneAndUpdate(
    { _id: orderId, tenantId },
    { ...corrections, parsedBy: 'manual', correctedAt: new Date() },
    { new: true }
  );
}
