import { Types } from 'mongoose';
import {
  ConversationState,
  ConversationStage,
  IConversationState,
} from '../../models/ConversationState';
import { Customer, ICustomer } from '../../models/Customer';
import { Order } from '../../models/Order';
import { logger } from '../../utils/logger';
import { findOrCreateCustomer } from '../customers/customers.repository';
import { finalizeOrder } from './orderFinalizer';
import { reply } from './reply';
import { ConversationParams } from './types';
import { EMAIL_REGEX, PHONE_REGEX } from './validation';

const QUESTIONS: Record<ConversationStage, string> = {
  awaiting_name: "Thanks for reaching out! Could you tell me your full name?",
  awaiting_phone: "Got it. What's the best phone number to reach you on for delivery?",
  awaiting_product: 'Which product would you like to order?',
  awaiting_quantity: 'How many would you like?',
  awaiting_address: "What's the delivery address?",
  awaiting_email:
    "Would you like to share an email for order updates? (Reply 'skip' if you'd rather not.)",
  awaiting_pending_order_decision: '',
};

const RETRY_MESSAGES: Partial<Record<ConversationStage, string>> = {
  awaiting_phone: "That doesn't look like a valid Bangladesh number (e.g. 01712345678). Could you resend it?",
  awaiting_quantity: 'Please send the quantity as a number, e.g. 2.',
  awaiting_name: 'Sorry, I didn\'t catch that — could you send your name?',
  awaiting_product: "Sorry, I didn't catch that — which product would you like?",
  awaiting_address: "Sorry, I didn't catch that — what's the delivery address?",
};

export async function handleConversationMessage(params: ConversationParams): Promise<void> {
  const { tenantId, senderId, text, parseResult } = params;

  let state = await ConversationState.findOne({ tenantId, fbSenderId: senderId });
  let isFreshStart = false;

  if (!state) {
    if (parseResult.intent !== 'order') return;

    await findOrCreateCustomer(tenantId, senderId, senderId);

    state = await ConversationState.create({
      tenantId,
      fbSenderId: senderId,
      stage: 'awaiting_name',
      draft: {
        product: parseResult.product,
        quantity: parseResult.quantity,
        phone: parseResult.phone,
        address: parseResult.address,
      },
    });
    isFreshStart = true;
  }

  if (!isFreshStart) {
    const advanced = applyReply(state, text);
    if (!advanced) {
      await state.save();
      await reply(params, RETRY_MESSAGES[state.stage] ?? QUESTIONS[state.stage]);
      return;
    }
  }

  const customer = await Customer.findOne({ tenantId, fbSenderId: senderId });
  if (!customer) {
    logger.error({ tenantId, senderId }, 'Customer missing mid-conversation, aborting');
    await ConversationState.deleteOne({ _id: state._id });
    return;
  }

  if (state.stage === 'awaiting_pending_order_decision' && state.decision) {
    await finalize(params, state, customer);
    return;
  }

  const nextStage = findNextMissingStage(state, customer);
  if (nextStage) {
    state.stage = nextStage;
    await state.save();
    await reply(params, QUESTIONS[nextStage]);
    return;
  }

  if (!state.pendingOrderId) {
    const openOrder = await Order.findOne({
      tenantId,
      customerId: customer._id,
      status: { $in: ['pending', 'confirmed', 'processing'] },
    }).sort({ createdAt: -1 });

    if (openOrder) {
      state.pendingOrderId = openOrder._id as Types.ObjectId;
      state.stage = 'awaiting_pending_order_decision';
      await state.save();
      const itemsSummary =
        openOrder.items.map((i) => `${i.quantity} x ${i.product}`).join(', ') || 'no items';
      await reply(
        params,
        `You already have an order in progress (${itemsSummary}, status: ${openOrder.status}). ` +
          `Should I replace it with this new order, or keep both? Reply "keep both" or "replace".`
      );
      return;
    }
  }

  await finalize(params, state, customer);
}

/** Applies free-text reply to the current stage. Returns false to re-ask the same stage. */
function applyReply(state: IConversationState, text: string): boolean {
  const trimmed = text.trim();

  switch (state.stage) {
    case 'awaiting_name':
      if (!trimmed) return false;
      state.draft.name = trimmed;
      return true;

    case 'awaiting_phone': {
      const match = trimmed.match(PHONE_REGEX);
      if (!match) return false;
      state.draft.phone = match[1];
      return true;
    }

    case 'awaiting_product':
      if (!trimmed) return false;
      state.draft.product = trimmed;
      return true;

    case 'awaiting_quantity': {
      const match = trimmed.match(/\d+/);
      if (!match) return false;
      state.draft.quantity = parseInt(match[0], 10);
      return true;
    }

    case 'awaiting_address':
      if (!trimmed) return false;
      state.draft.address = trimmed;
      return true;

    case 'awaiting_email': {
      if (EMAIL_REGEX.test(trimmed)) state.draft.email = trimmed;
      state.emailAsked = true;
      return true; // optional field — always advance
    }

    case 'awaiting_pending_order_decision': {
      const lower = trimmed.toLowerCase();
      state.decision = lower.includes('both') || lower.includes('keep') ? 'keep' : 'replace';
      return true;
    }

    default:
      return true;
  }
}

function findNextMissingStage(
  state: IConversationState,
  customer: ICustomer
): ConversationStage | null {
  const hasRealName = !!state.draft.name || (!!customer.name && !/^\d+$/.test(customer.name));
  if (!hasRealName) return 'awaiting_name';
  if (!state.draft.phone && !customer.phone) return 'awaiting_phone';
  if (!state.draft.product) return 'awaiting_product';
  if (!state.draft.quantity) return 'awaiting_quantity';
  if (!state.draft.address && !customer.address) return 'awaiting_address';
  if (!state.draft.email && !customer.email && !state.emailAsked) return 'awaiting_email';
  return null;
}

async function finalize(
  params: ConversationParams,
  state: IConversationState,
  customer: ICustomer
): Promise<void> {
  const { tenantId, tenant, messageId, parsedBy } = params;

  const result = await finalizeOrder({
    tenantId,
    tenant,
    messageId,
    parsedBy,
    customer,
    draft: state.draft,
    pendingOrderId: state.pendingOrderId,
    decision: state.decision,
  });

  await ConversationState.deleteOne({ _id: state._id });

  await reply(params, result.confirmationText);
}
