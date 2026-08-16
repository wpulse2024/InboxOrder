import { getSendToken } from '../facebook/facebook.service';
import { sendTextMessage } from '../../utils/facebookSend';
import { logger } from '../../utils/logger';
import { ConversationParams } from './types';

export async function reply(params: ConversationParams, text: string): Promise<void> {
  if (!text) return;
  if (!params.pageId) {
    logger.warn(
      { tenantId: params.tenantId, senderId: params.senderId },
      'No pageId on message, cannot send Messenger reply'
    );
    return;
  }
  try {
    const token = await getSendToken(params.tenantId, params.pageId);
    await sendTextMessage(token, params.senderId, text);
  } catch (err) {
    logger.warn(
      { err, tenantId: params.tenantId, senderId: params.senderId },
      'Failed to send conversation reply'
    );
  }
}
