import { Types } from 'mongoose';
import { Order } from '../../models/Order';

export async function getSummary(tenantId: string) {
  const tid = new Types.ObjectId(tenantId);
  const result = await Order.aggregate([
    { $match: { tenantId: tid } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        revenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
      },
    },
  ]);

  const summary: Record<string, { count: number; revenue: number }> = {};
  let totalOrders = 0;
  let totalRevenue = 0;

  for (const r of result) {
    summary[r._id] = { count: r.count, revenue: r.revenue };
    totalOrders += r.count;
    totalRevenue += r.revenue;
  }

  const confirmed = summary['confirmed']?.count ?? 0;
  const conversionRate = totalOrders > 0 ? (confirmed / totalOrders) * 100 : 0;

  return { byStatus: summary, totalOrders, totalRevenue, conversionRate };
}

export async function getTopProducts(tenantId: string, limit = 10) {
  const tid = new Types.ObjectId(tenantId);
  return Order.aggregate([
    { $match: { tenantId: tid } },
    { $unwind: '$items' },
    { $group: { _id: '$items.product', count: { $sum: '$items.quantity' }, orders: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { product: '$_id', count: 1, orders: 1, _id: 0 } },
  ]);
}

export async function getPeakHours(tenantId: string) {
  const tid = new Types.ObjectId(tenantId);
  return Order.aggregate([
    { $match: { tenantId: tid } },
    { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { hour: '$_id', count: 1, _id: 0 } },
  ]);
}

export async function getConversion(tenantId: string) {
  const summary = await getSummary(tenantId);
  return { conversionRate: summary.conversionRate };
}
