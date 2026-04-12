import { env } from '../config/env';
import { AiLog } from '../models/AiLog';
import { logger } from '../utils/logger';
import type { ParseResult } from './ruleParser';

interface AiParseResponse {
  intent: ParseResult['intent'];
  product?: string;
  quantity?: number;
  phone?: string;
  address?: string;
  confidence_score: number;
}

function buildPrompt(text: string): string {
  return `You are an order parser for a Bangladeshi e-commerce business on Facebook Messenger.

Extract order information from the following message. The message may be in Bengali, English, or a mix of both.

Message: "${text}"

Respond with ONLY a valid JSON object with these fields:
{
  "intent": "order" | "question" | "spam" | "unknown",
  "product": "product name or null",
  "quantity": number or null,
  "phone": "Bangladesh phone number (01XXXXXXXXX format) or null",
  "address": "delivery address or null",
  "confidence_score": number between 0 and 1
}

Do not include any explanation, only the JSON object.`;
}

export async function aiParse(
  text: string,
  messageId: string,
  tenantId: string
): Promise<ParseResult | null> {
  const prompt = buildPrompt(text);
  const startMs = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.aiTimeoutMs);

  try {
    const response = await fetch(env.aiApiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.aiApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.aiModel,
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startMs;

    if (!response.ok) {
      throw new Error(`AI API returned ${response.status}`);
    }

    const body = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const rawText = body.content?.[0]?.text ?? '';

    await AiLog.create({ tenantId, messageId, prompt, response: rawText, latencyMs });

    const parsed = JSON.parse(rawText) as AiParseResponse;

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

    logger.warn({ err, messageId }, 'AI parser failed, falling back to rule result');

    await AiLog.create({
      tenantId,
      messageId,
      prompt,
      latencyMs,
      error: errorMsg,
    }).catch(() => {}); // don't throw if log write fails

    return null;
  }
}
