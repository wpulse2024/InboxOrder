import { AppError } from '../../middleware/errorHandler';
import * as repo from './customers.repository';

export async function listCustomers(
  tenantId: string,
  search?: string,
  page?: number,
  limit?: number
) {
  return repo.findCustomers(tenantId, search, page, limit);
}

export async function getCustomer(customerId: string, tenantId: string) {
  const customer = await repo.findCustomerById(customerId, tenantId);
  if (!customer) throw new AppError('Customer not found', 404);
  return customer;
}

export async function getCustomerOrders(customerId: string, tenantId: string) {
  await getCustomer(customerId, tenantId); // ensure ownership
  return repo.findCustomerOrders(customerId, tenantId);
}
