import { ruleBasedParse, ParseResult } from './ruleParser';
import { parseWithAI } from './aiParser';
import { logger } from '../utils/logger';

const CONFIDENCE_THRESHOLD = 0.7;

export async function hybridParse(
  text: string,
  messageId: string,
  tenantId: string,
  aiEnabled = true
): Promise<{ result: ParseResult; source: 'rule' | 'ai' }> {
  const ruleResult = ruleBasedParse(text);

  logger.debug(
    { messageId, tenantId, confidence: ruleResult.confidence, intent: ruleResult.intent },
    'rule parser complete'
  );

  if (ruleResult.confidence >= CONFIDENCE_THRESHOLD) {
    logger.info(
      { messageId, tenantId, confidence: ruleResult.confidence, source: 'rule' },
      'hybrid decision: rule result accepted (confidence above threshold)'
    );
    return { result: ruleResult, source: 'rule' };
  }

  if (!aiEnabled) {
    logger.info(
      { messageId, tenantId, confidence: ruleResult.confidence, source: 'rule' },
      'hybrid decision: AI disabled, using rule result'
    );
    return { result: ruleResult, source: 'rule' };
  }

  logger.info(
    { messageId, tenantId, ruleConfidence: ruleResult.confidence, threshold: CONFIDENCE_THRESHOLD },
    'hybrid decision: rule confidence below threshold, calling AI parser'
  );

  const aiResult = await parseWithAI(text, messageId, tenantId);

  if (aiResult) {
    logger.info(
      { messageId, tenantId, confidence: aiResult.confidence, source: 'ai' },
      'hybrid decision: AI result accepted'
    );
    return { result: aiResult, source: 'ai' };
  }

  // AI failed — fall back to rule result (aiParser already logged the error)
  logger.info(
    { messageId, tenantId, confidence: ruleResult.confidence, source: 'rule' },
    'hybrid decision: AI failed, falling back to rule result'
  );
  return { result: ruleResult, source: 'rule' };
}
