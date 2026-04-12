import { ruleBasedParse, ParseResult } from './ruleParser';
import { aiParse } from './aiParser';

const CONFIDENCE_THRESHOLD = 0.7;

export async function hybridParse(
  text: string,
  messageId: string,
  tenantId: string,
  aiEnabled = true
): Promise<{ result: ParseResult; source: 'rule' | 'ai' }> {
  const ruleResult = ruleBasedParse(text);

  if (ruleResult.confidence >= CONFIDENCE_THRESHOLD || !aiEnabled) {
    return { result: ruleResult, source: 'rule' };
  }

  const aiResult = await aiParse(text, messageId, tenantId);
  if (aiResult) {
    return { result: aiResult, source: 'ai' };
  }

  // AI failed — fall back to rule result
  return { result: ruleResult, source: 'rule' };
}
