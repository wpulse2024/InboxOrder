export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  product: string;
  quantity: number;
  price?: number;
}

export interface Order {
  _id: string;
  tenantId: string;
  customerId: Customer | string;
  messageId: { _id: string; text: string; fbMessageId: string; senderId: string } | string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount?: number;
  parsedBy: 'rule' | 'ai' | 'manual';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  _id: string;
  tenantId: string;
  fbSenderId: string;
  name: string;
  phone?: string;
  address?: string;
  totalOrders: number;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  tenantId: string;
  type: 'order:new' | 'order:updated' | 'webhook:failure' | 'system';
  message: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data?: T[];
  orders?: T[];
  customers?: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isPlatformAdmin: boolean;
  tenant: { id: string; name: string; pageId: string } | null;
}
