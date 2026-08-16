import { handleConversationMessage } from './conversationBot.service';
import { handleGrokAgentMessage } from './grokAgentBot.service';
import { ConversationParams } from './types';

/**
 * Routes each incoming message to the AI sales agent if the tenant has configured
 * a Grok API key, otherwise to the original rigid slot-filling bot. Absence of
 * grokApiKeyEncrypted is the sole switch — no separate enable/pause flag.
 */
export async function routeConversationMessage(params: ConversationParams): Promise<void> {
  return params.tenant.grokApiKeyEncrypted
    ? handleGrokAgentMessage(params)
    : handleConversationMessage(params);
}
