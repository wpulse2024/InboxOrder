import { Message } from '../models/Message';
import { Tenant } from '../models/Tenant';
import { ParsedOrder } from '../models/ParsedOrder';
import { Order } from '../models/Order';
import { findOrCreateCustomer, incrementOrderCount } from '../modules/customers/customers.repository';
import { hybridParse } from '../parser/hybridParser';
import { emitOrderNew } from '../realtime/emitters';
import { createNotification } from '../modules/notifications/notifications.service';
import { logger } from '../utils/logger';

export async function processMessage(messageId: string, tenantId: string): Promise<void> {
  logger.info({ messageId, tenantId }, 'Processing message');

  const message = await Message.findById(messageId);
  if (!message) {
    logger.warn({ messageId }, 'Message not found, skipping');
    return;
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    logger.warn({ tenantId }, 'Tenant not found, skipping');
    return;
  }

  const aiEnabled = tenant.settings.aiParserEnabled;
  const { result, source } = await hybridParse(
    message.text,
    messageId,
    tenantId,
    aiEnabled
  );

  await ParsedOrder.create({
    tenantId,
    messageId: message._id,
    intent: result.intent,
    product: result.product,
    quantity: result.quantity,
    phone: result.phone,
    address: result.address,
    confidence: result.confidence,
    source,
    rawText: message.text,
  });

  if (result.intent !== 'order') {
    await Message.updateOne({ _id: messageId }, { processed: true });
    return;
  }

  const customer = await findOrCreateCustomer(tenantId, message.senderId, message.senderId);

  if (result.phone) await customer.updateOne({ phone: result.phone });
  if (result.address) await customer.updateOne({ address: result.address });

  const order = await Order.create({
    tenantId,
    customerId: customer._id,
    messageId: message._id,
    status: tenant.settings.autoConfirmOrders ? 'confirmed' : 'pending',
    items: result.product
      ? [{ product: result.product, quantity: result.quantity ?? 1 }]
      : [],
    parsedBy: source,
  });

  await incrementOrderCount(customer._id.toString());
  await Message.updateOne({ _id: messageId }, { processed: true });

  emitOrderNew(tenantId, order.toObject());
  await createNotification(
    tenantId,
    'order:new',
    `New order from ${customer.name || message.senderId}`,
    { orderId: order._id.toString() }
  );

  logger.info({ orderId: order._id, source, confidence: result.confidence }, 'Order created');
}
