// Shared types consumed by both backend and frontend

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type ParseSource = 'rule' | 'ai' | 'manual';

export type NotificationType = 'order:new' | 'order:updated' | 'webhook:failure' | 'system';

export interface ParseResult {
  intent: 'order' | 'question' | 'spam' | 'unknown';
  product?: string;
  quantity?: number;
  phone?: string;
  address?: string;
  confidence: number;
}

export interface SocketEvents {
  'order:new': { order: unknown };
  'order:updated': { orderId: string; status: OrderStatus };
  'webhook:failure': { error: string; retries: number };
  'notification:new': { notification: unknown };
}
