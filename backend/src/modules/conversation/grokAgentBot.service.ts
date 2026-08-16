import { Types } from 'mongoose';
import { Customer, ICustomer } from '../../models/Customer';
import { GrokConversationState, IGrokConversationState } from '../../models/GrokConversationState';
import { ConversationDraft } from '../../models/ConversationState';
import { Order } from '../../models/Order';
import { StoreProfile, IStoreProfileProduct, IStoreProfileFaq } from '../../models/StoreProfile';
import { ITenant } from '../../models/Tenant';
import { decrypt } from '../../utils/crypto';
import { logger } from '../../utils/logger';
import { findOrCreateCustomer } from '../customers/customers.repository';
import { grokChatCompletion, GrokMessage, GrokToolCall } from '../../integrations/grok/grokClient';
import { GROK_TOOL_DEFINITIONS, GROK_TOOL_EXECUTORS, GrokToolContext } from './grokTools';
import { reply } from './reply';
import { ConversationParams } from './types';

const MAX_TOOL_ITERATIONS = 5;
const HISTORY_WINDOW = 16;
const RETRY_TEXT = "Sorry, I'm having trouble responding right now — could you send that again in a moment?";
const FOLLOWUP_TEXT = "Let me follow up on that shortly — thanks for your patience!";

export async function handleGrokAgentMessage(params: ConversationParams): Promise<void> {
  const { tenantId, tenant, senderId, text, messageId, parsedBy } = params;

  await findOrCreateCustomer(tenantId, senderId, senderId);
  const customer = await Customer.findOne({ tenantId, fbSenderId: senderId });
  if (!customer) {
    logger.error({ tenantId, senderId }, 'Customer missing for Grok agent, aborting');
    return;
  }

  const state = await GrokConversationState.findOneAndUpdate(
    { tenantId, fbSenderId: senderId },
    { $setOnInsert: { tenantId, fbSenderId: senderId, draft: {}, history: [], emailAsked: false } },
    { upsert: true, new: true }
  );

  let pendingOrderCandidateId: Types.ObjectId | undefined;
  let pendingOrderSummary = '';
  if (!state.pendingOrderId) {
    const openOrder = await Order.findOne({
      tenantId,
      customerId: customer._id,
      status: { $in: ['pending', 'confirmed', 'processing'] },
    }).sort({ createdAt: -1 });

    if (openOrder) {
      pendingOrderCandidateId = openOrder._id as Types.ObjectId;
      const itemsSummary =
        openOrder.items.map((i) => `${i.quantity} x ${i.product}`).join(', ') || 'no items';
      pendingOrderSummary = `The customer already has an order in progress (${itemsSummary}, status: ${openOrder.status}). Before finalizing a new order, ask whether they want to replace it or keep both, then call resolve_pending_order.`;
    }
  }

  const storeProfile = await StoreProfile.findOne({ tenantId }).lean();

  const apiKey = decrypt(tenant.grokApiKeyEncrypted as string);

  // Snapshot BEFORE the tool loop runs — used to block resolve_pending_order and
  // finalize_order from firing back-to-back in the same turn with no user round-trip.
  const decisionResolvedBeforeThisTurn = !!state.decision;

  const ctx: GrokToolContext = {
    state,
    tenantId,
    tenant,
    messageId,
    parsedBy,
    customer,
    pendingOrderCandidateId,
    decisionResolvedBeforeThisTurn,
  };

  const systemPrompt = buildSystemPrompt(tenant, storeProfile, state.draft, customer, pendingOrderSummary);
  const cappedHistory = state.history.slice(-HISTORY_WINDOW).map(toGrokMessage);

  const messages: GrokMessage[] = [
    { role: 'system', content: systemPrompt },
    ...cappedHistory,
    { role: 'user', content: text },
  ];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await grokChatCompletion({
      tenantId,
      messageId,
      apiKey,
      messages,
      tools: GROK_TOOL_DEFINITIONS,
    });

    if (!response) {
      await reply(params, RETRY_TEXT);
      return;
    }

    const recovered = extractInlineFunctionCalls(response.content);
    response.content = recovered.text || null;
    if (recovered.calls.length > 0) {
      const syntheticToolCalls: GrokToolCall[] = recovered.calls.map((c, i) => ({
        id: `recovered-${iteration}-${i}`,
        type: 'function',
        function: { name: c.name, arguments: c.args },
      }));
      response.tool_calls = [...(response.tool_calls ?? []), ...syntheticToolCalls];
    }

    if (response.tool_calls && response.tool_calls.length > 0) {
      messages.push({ role: 'assistant', content: response.content ?? null, tool_calls: response.tool_calls });

      for (const toolCall of response.tool_calls) {
        const executor = GROK_TOOL_EXECUTORS[toolCall.function.name];
        const result = executor
          ? await executor(ctx, toolCall.function.arguments)
          : { ok: false, error: `Unknown tool: ${toolCall.function.name}` };

        if (toolCall.function.name === 'finalize_order' && result.ok) {
          await reply(params, String(result.confirmationText));
          await appendHistory(tenantId, senderId, state.history, [
            { role: 'user', content: text },
            { role: 'assistant', content: String(result.confirmationText) },
          ]);
          await GrokConversationState.deleteOne({ tenantId, fbSenderId: senderId });
          return;
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      // Persist the atomic draft/pendingOrderId/decision mutation performed by tool
      // executors this iteration, narrowing the same class of race the rigid bot has.
      await GrokConversationState.findOneAndUpdate(
        { tenantId, fbSenderId: senderId },
        {
          $set: {
            draft: state.draft,
            emailAsked: state.emailAsked,
            pendingOrderId: state.pendingOrderId,
            decision: state.decision,
          },
        }
      );

      continue;
    }

    // Final natural-language reply — no more tool calls this turn.
    const finalText = response.content ?? FOLLOWUP_TEXT;
    await reply(params, finalText);
    await appendHistory(tenantId, senderId, state.history, [
      { role: 'user', content: text },
      { role: 'assistant', content: finalText },
    ]);
    return;
  }

  // Iteration cap hit — never leave the customer with silence.
  logger.warn({ tenantId, senderId, messageId }, 'Grok agent hit MAX_TOOL_ITERATIONS');
  await reply(params, FOLLOWUP_TEXT);
  await appendHistory(tenantId, senderId, state.history, [
    { role: 'user', content: text },
    { role: 'assistant', content: FOLLOWUP_TEXT },
  ]);
}

// Some Groq/Llama responses narrate a tool call as literal text (e.g.
// `<function=save_product_and_quantity>{"product":"Bag","quantity":1}</function>`)
// instead of populating the API's structured tool_calls field. Left alone, that raw
// syntax leaks straight into the customer's Messenger reply and the intended call
// never executes. Strip it out of the visible text and recover it as a real call.
const INLINE_FUNCTION_TAG_RE =
  /<function\s*=\s*([a-zA-Z_][\w]*)\s*>\s*(\{[\s\S]*?\})?\s*(?:<\/function\s*>)?/g;

function extractInlineFunctionCalls(content: string | null): { text: string; calls: { name: string; args: string }[] } {
  if (!content) return { text: '', calls: [] };
  const calls: { name: string; args: string }[] = [];
  const text = content
    .replace(INLINE_FUNCTION_TAG_RE, (_match, name: string, jsonArgs?: string) => {
      calls.push({ name, args: jsonArgs ?? '{}' });
      return '';
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { text, calls };
}

function toGrokMessage(entry: IGrokConversationState['history'][number]): GrokMessage {
  return { role: entry.role, content: entry.content };
}

async function appendHistory(
  tenantId: string,
  fbSenderId: string,
  existing: IGrokConversationState['history'],
  additions: { role: 'user' | 'assistant'; content: string }[]
): Promise<void> {
  await GrokConversationState.findOneAndUpdate(
    { tenantId, fbSenderId },
    { $set: { history: [...existing, ...additions] } }
  );
}

interface StoreProfileLean {
  businessInfo?: string;
  products: IStoreProfileProduct[];
  faqs: IStoreProfileFaq[];
}

function buildSystemPrompt(
  tenant: ITenant,
  storeProfile: StoreProfileLean | null,
  draft: ConversationDraft,
  customer: ICustomer,
  pendingOrderSummary: string
): string {
  const lines: string[] = [
    `You are a friendly, helpful human customer support agent for "${tenant.name}", a business that sells products over Facebook Messenger.`,
    'Reply naturally to every message — greetings, questions, small talk — the way a real support agent would. Keep replies short and conversational.',
    "Your main job is to take the customer's order. Weave data collection naturally into the conversation instead of interrogating one field at a time.",
    'This store only supports single-item orders (one product, one quantity per order).',
    'Call the save_* tools immediately whenever the customer gives you a piece of information, even mid-sentence — do not wait for a specific format.',
    'Before finalizing, show the customer a full order summary (product, quantity, delivery address, phone) as plain text and wait for their next message to be a clear yes/confirmation. Only call finalize_order once name, phone, product, quantity, and address are all known AND the customer has just explicitly confirmed that exact summary — pass confirmed:true only in that case. If they have not yet confirmed, show the summary and ask, do not call finalize_order this turn. Never write the order confirmation yourself — finalize_order returns it for you to send verbatim.',
    'Never write tool/function calls out as text (e.g. "<function=...>...</function>") — always use the real tool-calling mechanism. Your text replies must contain natural language only.',
  ];

  if (storeProfile?.businessInfo) {
    lines.push(`\nBusiness info:\n${storeProfile.businessInfo}`);
  }
  if (storeProfile?.products?.length) {
    const productLines = storeProfile.products
      .map((p) => {
        const meta = [p.sku && `SKU: ${p.sku}`, p.category].filter(Boolean).join(', ');
        return `- ${p.name}: ${p.price}${meta ? ` (${meta})` : ''}${p.description ? ` — ${p.description}` : ''}`;
      })
      .join('\n');
    lines.push(`\nProducts:\n${productLines}`);
  }
  if (storeProfile?.faqs?.length) {
    const faqLines = storeProfile.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
    lines.push(`\nFrequently asked questions:\n${faqLines}`);
  }

  // Falls back to the customer's saved profile (from a prior order) so returning
  // customers aren't re-asked for details already on file — mirrors the fallback
  // finalize_order's server-side validation already applies (see grokTools.ts).
  const known: string[] = [];
  const knownName = draft.name || (customer.name && !/^\d+$/.test(customer.name) ? customer.name : undefined);
  const knownPhone = draft.phone || customer.phone;
  const knownAddress = draft.address || customer.address;
  if (knownName) known.push(`name: ${knownName}`);
  if (knownPhone) known.push(`phone: ${knownPhone}`);
  if (draft.product) known.push(`product: ${draft.product}`);
  if (draft.quantity) known.push(`quantity: ${draft.quantity}`);
  if (knownAddress) known.push(`address: ${knownAddress}`);
  if (draft.email) known.push(`email: ${draft.email}`);
  lines.push(`\nKnown so far: ${known.length ? known.join(', ') : 'nothing yet'}.`);
  lines.push(
    'If a detail is already known (including from the customer\'s saved profile above), do not ask for it again — only ask for what is still missing.'
  );

  if (pendingOrderSummary) {
    lines.push(`\n${pendingOrderSummary}`);
  }

  return lines.join('\n');
}
