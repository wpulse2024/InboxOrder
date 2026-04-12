import { Types } from 'mongoose';
import { Order } from '../../models/Order';

export async function aggregateSummary(tenantId: string) {
  const tid = new Types.ObjectId(tenantId);
  return Order.aggregate([
    { $match: { tenantId: tid } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        revenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
      },
    },
  ]);
}

export async function aggregateTopProducts(tenantId: string, limit: number) {
  const tid = new Types.ObjectId(tenantId);
  return Order.aggregate([
    { $match: { tenantId: tid } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        count: { $sum: '$items.quantity' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { product: '$_id', count: 1, orders: 1, _id: 0 } },
  ]);
}

export async function aggregatePeakHours(tenantId: string) {
  const tid = new Types.ObjectId(tenantId);
  return Order.aggregate([
    { $match: { tenantId: tid } },
    { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { hour: '$_id', count: 1, _id: 0 } },
  ]);
}
