import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { Tenant } from '../models/Tenant';
import { Customer } from '../models/Customer';
import { Message } from '../models/Message';
import { ParsedOrder } from '../models/ParsedOrder';
import { Order } from '../models/Order';
import { NotificationLog } from '../models/NotificationLog';

const CUSTOMERS = [
  { name: 'Rafiul Islam', phone: '01712345678', address: 'House 12, Road 5, Dhanmondi, Dhaka' },
  { name: 'Nusrat Jahan', phone: '01812345678', address: 'Flat 3B, Banani, Dhaka' },
  { name: 'Kamal Hossain', phone: '01912345678', address: 'Agrabad Access Road, Chattogram' },
  { name: 'Farhana Akter', phone: '01612345678', address: 'Shahjalal Upashahar, Sylhet' },
  { name: 'Tanvir Ahmed', phone: '01512345678', address: 'GEC Circle, Chattogram' },
];

const PRODUCTS = [
  'Cotton Panjabi (White, XL)',
  'Leather Wallet',
  'Wireless Earbuds',
  'Ladies Handbag',
  'Formal Shirt (Blue, M)',
  'Kids Sneakers Size 3',
  'Perfume - Oud 50ml',
];

const STATUSES: Array<'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'> = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

function daysAgo(n: number, hour = 10): Date {
  const d = new Date('2026-08-15T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

async function seedDemo(): Promise<void> {
  await mongoose.connect(env.mongodbUri);

  const tenant = await Tenant.findOne({ name: 'Demo Tenant' });
  if (!tenant) throw new Error('Run `npm run seed` first to create the Demo Tenant.');

  await Order.deleteMany({ tenantId: tenant._id });
  await ParsedOrder.deleteMany({ tenantId: tenant._id });
  await Message.deleteMany({ tenantId: tenant._id });
  await Customer.deleteMany({ tenantId: tenant._id });
  await NotificationLog.deleteMany({ tenantId: tenant._id });

  const customers = [];
  for (const c of CUSTOMERS) {
    const customer = await Customer.create({
      tenantId: tenant._id,
      fbSenderId: `psid_${Math.random().toString(36).slice(2, 12)}`,
      name: c.name,
      phone: c.phone,
      address: c.address,
      totalOrders: 0,
      lastMessageAt: daysAgo(Math.floor(Math.random() * 20)),
    });
    customers.push(customer);
  }

  let orderCount = 0;
  for (let i = 0; i < 22; i += 1) {
    const customer = customers[i % customers.length];
    const product = PRODUCTS[i % PRODUCTS.length];
    const quantity = 1 + (i % 3);
    const price = 450 + (i % 6) * 150;
    const ageDays = 21 - i;
    const hour = [9, 10, 11, 13, 14, 15, 19, 20, 21][i % 9];
    const source: 'rule' | 'ai' = i % 4 === 0 ? 'ai' : 'rule';
    const confidence = source === 'rule' ? 0.8 + (i % 3) * 0.06 : 0.55 + (i % 4) * 0.05;
    const rawText = `Ami ${product} lagbe, ${quantity}ta. amar number ${customer.phone}, address: ${customer.address}`;

    const message = await Message.create({
      tenantId: tenant._id,
      fbMessageId: `fbmsg_${Date.now()}_${i}`,
      senderId: customer.fbSenderId,
      customerId: customer._id,
      text: rawText,
      rawPayload: { text: rawText, mid: `fbmsg_${i}` },
      processed: true,
      createdAt: daysAgo(ageDays, hour),
    });

    const parsedOrder = await ParsedOrder.create({
      tenantId: tenant._id,
      messageId: message._id,
      intent: 'order',
      product,
      quantity,
      phone: customer.phone,
      address: customer.address,
      confidence: Math.min(confidence, 0.98),
      source,
      rawText,
      createdAt: daysAgo(ageDays, hour),
    });

    const status = STATUSES[i % STATUSES.length];
    await Order.create({
      tenantId: tenant._id,
      customerId: customer._id,
      messageId: message._id,
      parsedOrderId: parsedOrder._id,
      status,
      items: [{ product, quantity, price }],
      totalAmount: quantity * price,
      parsedBy: source,
      phone: customer.phone,
      address: customer.address,
      createdAt: daysAgo(ageDays, hour),
    });

    customer.totalOrders += 1;
    await customer.save();
    orderCount += 1;
  }

  // A couple of question/spam messages for realism (no order created)
  const noise = customers[0];
  await Message.create({
    tenantId: tenant._id,
    fbMessageId: `fbmsg_${Date.now()}_q1`,
    senderId: noise.fbSenderId,
    customerId: noise._id,
    text: 'Apnader shop kothay? Delivery koto din lagbe?',
    rawPayload: { text: 'Apnader shop kothay?' },
    processed: true,
    createdAt: daysAgo(2),
  });

  await NotificationLog.create([
    {
      tenantId: tenant._id,
      type: 'order:new',
      message: `New order from ${customers[0].name}`,
      read: false,
    },
    {
      tenantId: tenant._id,
      type: 'order:new',
      message: `New order from ${customers[1].name}`,
      read: false,
    },
    {
      tenantId: tenant._id,
      type: 'webhook:failure',
      message: 'Facebook webhook delivery failed (retrying)',
      read: true,
    },
  ]);

  console.log(`Seeded ${customers.length} customers, ${orderCount} orders.`);
  await mongoose.disconnect();
}

seedDemo().catch((err: Error) => {
  console.error('Demo seed failed:', err.message);
  process.exit(1);
});
