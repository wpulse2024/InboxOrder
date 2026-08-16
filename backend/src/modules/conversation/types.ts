import { ITenant } from '../../models/Tenant';
import type { ParseResult } from '../../parser/ruleParser';

export interface ConversationParams {
  tenantId: string;
  tenant: ITenant;
  pageId: string | null;
  senderId: string;
  text: string;
  messageId: string;
  parseResult: ParseResult;
  parsedBy: 'rule' | 'ai';
}
