import { env } from '../../config/env';
import { AiLog } from '../../models/AiLog';
import { logger } from '../../utils/logger';

export interface GrokToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface GrokMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: GrokToolCall[];
  tool_call_id?: string;
}

export interface GrokToolDefinition {
  type: 'function';
  function: { name: string; description: string; parameters: object };
}

interface GrokChatCompletionParams {
  tenantId: string;
  messageId: string;
  apiKey: string;
  messages: GrokMessage[];
  tools: GrokToolDefinition[];
}

interface GrokApiResponse {
  choices: Array<{ message: GrokMessage }>;
}

/**
 * Never throws — returns null on any failure (timeout, HTTP error, malformed
 * response) so the caller can fall back to a fixed retry-please message.
 * Mirrors parser/aiParser.ts's timeout/never-throw/AiLog contract.
 */
export async function grokChatCompletion(
  params: GrokChatCompletionParams
): Promise<GrokMessage | null> {
  const { tenantId, messageId, apiKey, messages, tools } = params;

  // Only the latest user turn is logged (not the full growing history) to keep AiLog rows bounded.
  const latestUserContent =
    [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  const startMs = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.grokTimeoutMs);

  try {
    const response = await fetch(env.grokApiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: env.grokModel,
        messages,
        tools,
        tool_choice: 'auto',
      }),
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startMs;

    if (!response.ok) {
      throw new Error(`Grok API returned HTTP ${response.status}`);
    }

    const body = (await response.json()) as GrokApiResponse;
    const message = body.choices?.[0]?.message;

    if (!message) {
      throw new Error('Grok API response missing choices[0].message');
    }

    await AiLog.create({
      tenantId,
      messageId,
      provider: 'groq',
      aiModel: env.grokModel,
      prompt: latestUserContent ?? '',
      response: message.content ?? JSON.stringify(message.tool_calls ?? []),
      latencyMs,
    }).catch(() => {});

    return message;
  } catch (err) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startMs;
    const errorMsg = err instanceof Error ? err.message : String(err);

    logger.warn({ err, messageId, tenantId }, 'Grok API call failed');

    await AiLog.create({
      tenantId,
      messageId,
      provider: 'groq',
      aiModel: env.grokModel,
      prompt: latestUserContent ?? '',
      latencyMs,
      success: false,
      error: errorMsg,
    }).catch(() => {});

    return null;
  }
}
