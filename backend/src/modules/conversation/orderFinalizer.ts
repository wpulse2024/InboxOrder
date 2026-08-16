import { Types } from 'mongoose';
import { ICustomer } from '../../models/Customer';
import { IOrder, IOrderItem, Order } from '../../models/Order';
import { StoreProfile } from '../../models/StoreProfile';
import { ITenant } from '../../models/Tenant';
import { ConversationDraft } from '../../models/ConversationState';
import { incrementOrderCount, updateCustomerDetails } from '../customers/customers.repository';
import { cancelOrderBySystem } from '../orders/orders.repository';
import { emitOrderNew, emitOrderUpdated } from '../../realtime/emitters';
import { createNotification } from '../notifications/notifications.service';
import { logger } from '../../utils/logger';

export interface FinalizeOrderParams {
  tenantId: string;
  tenant: ITenant;
  messageId: string;
  parsedBy: 'rule' | 'ai';
  customer: ICustomer;
  draft: ConversationDraft;
  pendingOrderId?: Types.ObjectId;
  decision?: 'keep' | 'replace';
}

export interface FinalizeOrderResult {
  order: IOrder;
  confirmationText: string;
  replacedPendingOrder: boolean;
  keptBothOrders: boolean;
}

/**
 * Shared order-creation path used by both the rigid rule-based bot and the
 * Grok agent bot. Callers own sending the confirmation text and cleaning up
 * their own conversation-state document — the two bots use different models.
 */
export async function finalizeOrder(params: FinalizeOrderParams): Promise<FinalizeOrderResult> {
  const { tenantId, tenant, messageId, parsedBy, customer, draft, pendingOrderId, decision } =
    params;

  const name = draft.name ?? customer.name;
  const phone = draft.phone ?? customer.phone;
  const address = draft.address ?? customer.address;

  await updateCustomerDetails(customer._id.toString(), {
    name: draft.name,
    phone: draft.phone,
    address: draft.address,
    email: draft.email,
  });

  const replacedPendingOrder = !!pendingOrderId && decision === 'replace';
  const keptBothOrders = !!pendingOrderId && decision === 'keep';

  if (replacedPendingOrder && pendingOrderId) {
    await cancelOrderBySystem(
      pendingOrderId.toString(),
      tenantId,
      'Cancelled by customer — replaced with a new order via chat'
    );
    emitOrderUpdated(tenantId, pendingOrderId.toString(), 'cancelled');
  }

  const quantity = draft.quantity ?? 1;
  const catalogProduct = await findCatalogProduct(tenantId, draft.product!);

  const item: IOrderItem = {
    product: draft.product!,
    quantity,
    ...(catalogProduct && {
      price: catalogProduct.price,
      subtotal: catalogProduct.price * quantity,
      description: catalogProduct.description,
      sku: catalogProduct.sku,
      category: catalogProduct.category,
      imageUrl: catalogProduct.imageUrl,
    }),
  };

  const order = await Order.create({
    tenantId,
    customerId: customer._id,
    messageId,
    status: tenant.settings.autoConfirmOrders ? 'confirmed' : 'pending',
    items: [item],
    totalAmount: item.subtotal,
    parsedBy,
    phone,
    address,
  });

  await incrementOrderCount(customer._id.toString());

  emitOrderNew(tenantId, {
    ...order.toObject(),
    customerId: {
      _id: customer._id,
      name,
      fbSenderId: customer.fbSenderId,
      phone,
    },
  });
  await createNotification(tenantId, 'order:new', `New order from ${name || customer.fbSenderId}`, {
    orderId: order._id.toString(),
  });

  logger.info(
    { orderId: order._id, tenantId, replacedPendingOrder, keptBothOrders },
    'Order finalized via conversation bot'
  );

  const trailer = replacedPendingOrder
    ? ' and your previous order was cancelled'
    : keptBothOrders
      ? ' as a new order alongside your existing one'
      : '';

  const confirmationText =
    `Thanks, ${name}! Your order for ${draft.quantity} x ${draft.product} has been placed${trailer}. ` +
    `We'll deliver to: ${address}. We'll reach you at ${phone}.`;

  return { order, confirmationText, replacedPendingOrder, keptBothOrders };
}

/**
 * Snapshots the matching StoreProfile catalog entry (price/description/sku/
 * category/image) onto the order item at creation time, POS-style, so order
 * detail stays accurate even if the catalog product is edited/removed later.
 */
async function findCatalogProduct(tenantId: string, productName: string) {
  const profile = await StoreProfile.findOne({ tenantId }).lean();
  if (!profile?.products?.length) return null;

  const needle = productName.trim().toLowerCase();
  return (
    profile.products.find((p) => p.name.trim().toLowerCase() === needle) ??
    profile.products.find(
      (p) => needle.includes(p.name.trim().toLowerCase()) || p.name.trim().toLowerCase().includes(needle)
    ) ??
    null
  );
}
