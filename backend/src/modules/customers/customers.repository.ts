import { Types } from 'mongoose';
import { Customer, ICustomer } from '../../models/Customer';
import { Order } from '../../models/Order';

export async function findCustomers(
  tenantId: string,
  search?: string,
  page = 1,
  limit = 20
) {
  const query: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId) };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const [customers, total] = await Promise.all([
    Customer.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Customer.countDocuments(query),
  ]);

  return { customers, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function findCustomerById(customerId: string, tenantId: string) {
  return Customer.findOne({ _id: customerId, tenantId });
}

export async function findCustomerOrders(customerId: string, tenantId: string) {
  return Order.find({ customerId, tenantId }).sort({ createdAt: -1 }).lean();
}

export async function findOrCreateCustomer(
  tenantId: string,
  fbSenderId: string,
  name: string
): Promise<ICustomer> {
  const existing = await Customer.findOne({ tenantId, fbSenderId });
  if (existing) return existing;

  return Customer.create({ tenantId, fbSenderId, name });
}

export async function incrementOrderCount(customerId: string): Promise<void> {
  await Customer.updateOne({ _id: customerId }, { $inc: { totalOrders: 1 } });
}

/** Writes collected conversation-flow fields onto the Customer doc. Skips unset fields. */
export async function updateCustomerDetails(
  customerId: string,
  fields: { name?: string; phone?: string; address?: string; email?: string }
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (fields.name) update.name = fields.name;
  if (fields.phone) update.phone = fields.phone;
  if (fields.address) update.address = fields.address;
  if (fields.email) update.email = fields.email;
  if (Object.keys(update).length === 0) return;
  await Customer.updateOne({ _id: customerId }, update);
}
