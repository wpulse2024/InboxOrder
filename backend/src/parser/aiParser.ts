import { getPlatformConfig } from '../config/platformConfig';
import { AiLog } from '../models/AiLog';
import { logger } from '../utils/logger';
import type { ParseResult } from './ruleParser';

interface AiParseResponse {
  intent: ParseResult['intent'];
  product?: string | null;
  quantity?: number | null;
  phone?: string | null;
  address?: string | null;
  confidence_score: number;
}

const VALID_INTENTS = new Set<ParseResult['intent']>(['order', 'question', 'spam', 'unknown']);

function buildPrompt(text: string): string {
  return `You are an order parser for a Bangladeshi e-commerce business on Facebook Messenger.

Extract order information from the following customer message. The message may be in Bengali (Bangla), English, or a mix of both.

Message: "${text}"

Respond with ONLY a valid JSON object. No markdown, no explanation, no code fences — just raw JSON.

{
  "intent": "order" | "question" | "spam" | "unknown",
  "product": "product name or null",
  "quantity": number or null,
  "phone": "Bangladesh phone number starting with 01 (11 digits) or null",
  "address": "delivery address or null",
  "confidence_score": number between 0 and 1
}

Rules:
- intent "order": customer wants to buy something (e.g. চাই, নিব, অর্ডার, want, buy)
- intent "question": customer is asking about price, availability (e.g. দাম, কত, how much)
- intent "spam": promotional / irrelevant message
- intent "unknown": cannot determine intent
- phone must match Bangladesh format: 01[3-9]XXXXXXXX (exactly 11 digits)
- confidence_score reflects how confident you are in the extraction (0.0 – 1.0)`;
}

/**
 * Extracts the first JSON object from a string, stripping any surrounding
 * markdown fences or prose the model may have added.
 */
function extractJson(raw: string): string {
  // Strip ```json ... ``` or ``` ... ``` fences
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Find the first {...} block
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return raw.slice(start, end + 1);
  }

  return raw.trim();
}

function validateResponse(data: unknown): AiParseResponse {
  if (typeof data !== 'object' || data === null) {
    throw new Error('AI response is not an object');
  }

  const d = data as Record<string, unknown>;

  const intent: ParseResult['intent'] = VALID_INTENTS.has(d.intent as ParseResult['intent'])
    ? (d.intent as ParseResult['intent'])
    : 'unknown';

  const product = typeof d.product === 'string' && d.product.trim() ? d.product.trim() : null;
  const quantity = typeof d.quantity === 'number' && d.quantity > 0 ? Math.round(d.quantity) : null;
  const phone = typeof d.phone === 'string' && /^01[3-9]\d{8}$/.test(d.phone) ? d.phone : null;
  const address = typeof d.address === 'string' && d.address.trim() ? d.address.trim() : null;
  const confidence_score =
    typeof d.confidence_score === 'number'
      ? Math.min(1, Math.max(0, d.confidence_score))
      : 0;

  return { intent, product, quantity, phone, address, confidence_score };
}

export async function parseWithAI(
  text: string,
  messageId: string,
  tenantId: string
): Promise<ParseResult | null> {
  const { aiApiKey, aiApiUrl, aiModel, aiTimeoutMs } = getPlatformConfig();
  if (!aiApiKey) {
    logger.warn({ messageId, tenantId }, 'AI parser skipped — no AI API key configured');
    return null;
  }

  const prompt = buildPrompt(text);
  const startMs = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), aiTimeoutMs);

  try {
    const response = await fetch(aiApiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: aiModel,
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startMs;

    if (!response.ok) {
      throw new Error(`AI API returned HTTP ${response.status}`);
    }

    const body = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const rawText: string = body.content?.[0]?.text ?? '';

    await AiLog.create({ tenantId, messageId, prompt, response: rawText, latencyMs });

    const jsonString = extractJson(rawText);
    const parsed = validateResponse(JSON.parse(jsonString));

    return {
      intent: parsed.intent,
      product: parsed.product ?? undefined,
      quantity: parsed.quantity ?? undefined,
      phone: parsed.phone ?? undefined,
      address: parsed.address ?? undefined,
      confidence: parsed.confidence_score,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startMs;
    const errorMsg = err instanceof Error ? err.message : String(err);

    logger.warn({ err, messageId, tenantId }, 'AI parser failed, falling back to rule result');

    await AiLog.create({
      tenantId,
      messageId,
      prompt,
      latencyMs,
      error: errorMsg,
    }).catch(() => {}); // fire-and-forget — never throw from the log write

    return null;
  }
}
