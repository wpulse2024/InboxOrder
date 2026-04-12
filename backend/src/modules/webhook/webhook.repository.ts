import { Message, IMessage } from '../../models/Message';
import { WebhookLog, IWebhookLog } from '../../models/WebhookLog';

export async function messageExists(tenantId: string, fbMessageId: string): Promise<boolean> {
  return !!(await Message.exists({ tenantId, fbMessageId }));
}

export async function createMessage(data: {
  tenantId: string;
  fbMessageId: string;
  senderId: string;
  text: string;
  rawPayload: Record<string, unknown>;
}): Promise<IMessage> {
  return Message.create({ ...data, processed: false });
}

export async function createWebhookLog(data: {
  tenantId: string;
  messageId: unknown;
  eventType: string;
  payload: Record<string, unknown>;
  statusCode: number;
}): Promise<IWebhookLog> {
  return WebhookLog.create({ ...data, retries: 0 });
}
