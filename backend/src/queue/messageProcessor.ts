import { Message } from '../models/Message';
import { Tenant } from '../models/Tenant';
import { ParsedOrder } from '../models/ParsedOrder';
import { hybridParse } from '../parser/hybridParser';
import { routeConversationMessage } from '../modules/conversation/conversationRouter';
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

  // Saved unconditionally regardless of intent — see CLAUDE.md constraint #3.
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

  const recipient = (message.rawPayload as { recipient?: { id?: string } })?.recipient;
  const pageId = recipient?.id ?? null;

  await routeConversationMessage({
    tenantId,
    tenant,
    pageId,
    senderId: message.senderId,
    text: message.text,
    messageId: message._id.toString(),
    parseResult: result,
    parsedBy: source,
  });

  await Message.updateOne({ _id: messageId }, { processed: true });
}
