import * as repo from './analytics.repository';

export async function getSummary(tenantId: string) {
  const result = await repo.aggregateSummary(tenantId);

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
  return repo.aggregateTopProducts(tenantId, limit);
}

export async function getPeakHours(tenantId: string) {
  return repo.aggregatePeakHours(tenantId);
}

export async function getConversion(tenantId: string) {
  const summary = await getSummary(tenantId);
  return { conversionRate: summary.conversionRate };
}
