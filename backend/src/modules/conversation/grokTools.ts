import { Types } from 'mongoose';
import { ICustomer } from '../../models/Customer';
import { ITenant } from '../../models/Tenant';
import { IGrokConversationState } from '../../models/GrokConversationState';
import { GrokToolDefinition } from '../../integrations/grok/grokClient';
import { finalizeOrder } from './orderFinalizer';
import { EMAIL_REGEX, PHONE_REGEX } from './validation';

export interface GrokToolContext {
  state: IGrokConversationState;
  tenantId: string;
  tenant: ITenant;
  messageId: string;
  parsedBy: 'rule' | 'ai';
  customer: ICustomer;
  /** Open order found for this customer, if any — only resolvable into state.pendingOrderId via resolve_pending_order. */
  pendingOrderCandidateId?: Types.ObjectId;
  /** True if a pending-order replace/keep decision was already on record BEFORE this turn started. */
  decisionResolvedBeforeThisTurn: boolean;
}

export type GrokToolResult = { ok: boolean; error?: string; [k: string]: unknown };

type ToolExecutor = (ctx: GrokToolContext, args: unknown) => Promise<GrokToolResult>;

function parseArgs(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === 'object' && raw !== null) return raw as Record<string, unknown>;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function missingRequiredFields(ctx: GrokToolContext): string[] {
  const { state, customer } = ctx;
  const missing: string[] = [];
  const hasRealName = !!state.draft.name || (!!customer.name && !/^\d+$/.test(customer.name));
  if (!hasRealName) missing.push('name');
  if (!state.draft.phone && !customer.phone) missing.push('phone');
  if (!state.draft.product) missing.push('product');
  if (!state.draft.quantity) missing.push('quantity');
  if (!state.draft.address && !customer.address) missing.push('address');
  return missing;
}

export const GROK_TOOL_DEFINITIONS: GrokToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'save_customer_name',
      description: "Save the customer's full name once they've given it.",
      parameters: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_customer_phone',
      description:
        'Save the customer\'s delivery contact phone number. Must be a Bangladesh mobile number (01[3-9] followed by 8 digits, e.g. 01712345678).',
      parameters: {
        type: 'object',
        properties: { phone: { type: 'string' } },
        required: ['phone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_product_and_quantity',
      description: 'Save the product the customer wants to order and how many units (single-item orders only).',
      parameters: {
        type: 'object',
        properties: {
          product: { type: 'string' },
          quantity: { type: 'integer', minimum: 1 },
        },
        required: ['product', 'quantity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_delivery_address',
      description: 'Save the delivery address for the order.',
      parameters: {
        type: 'object',
        properties: { address: { type: 'string' } },
        required: ['address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_customer_email',
      description: "Save the customer's email for order updates. Optional — only call if the customer provides one.",
      parameters: {
        type: 'object',
        properties: { email: { type: 'string' } },
        required: ['email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'resolve_pending_order',
      description:
        'Record whether the customer wants to replace their existing in-progress order with this new one, or keep both. Only call this when a pending order was mentioned in context.',
      parameters: {
        type: 'object',
        properties: { decision: { type: 'string', enum: ['replace', 'keep'] } },
        required: ['decision'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'finalize_order',
      description:
        "Create the order once name, phone, product, quantity, and address are all known AND the customer has explicitly confirmed the order summary you showed them. Never call this in the same turn you first show the summary — show it, wait for their reply, then call this only if that reply is a clear confirmation.",
      parameters: {
        type: 'object',
        properties: {
          confirmed: {
            type: 'boolean',
            description:
              "True only if the customer's most recent message is an explicit yes/confirmation of an order summary you already showed them in a prior message.",
          },
        },
        required: ['confirmed'],
      },
    },
  },
];

const PLACEHOLDER_NAMES = new Set(['unknown', 'n/a', 'na', 'none', 'null', 'undefined', 'anonymous', 'customer']);

export const GROK_TOOL_EXECUTORS: Record<string, ToolExecutor> = {
  async save_customer_name(ctx, rawArgs) {
    const args = parseArgs(rawArgs);
    const name = typeof args?.name === 'string' ? args.name.trim() : '';
    if (!name || PLACEHOLDER_NAMES.has(name.toLowerCase())) {
      return { ok: false, error: 'name must be the customer\'s actual name — only call this once they have given it' };
    }
    ctx.state.draft.name = name;
    return { ok: true };
  },

  async save_customer_phone(ctx, rawArgs) {
    const args = parseArgs(rawArgs);
    const raw = typeof args?.phone === 'string' ? args.phone.trim() : '';
    const match = raw.match(PHONE_REGEX);
    if (!match) {
      return {
        ok: false,
        error:
          "That doesn't look like a valid Bangladesh phone number (e.g. 01712345678). Ask the customer to resend it.",
      };
    }
    ctx.state.draft.phone = match[1];
    return { ok: true };
  },

  async save_product_and_quantity(ctx, rawArgs) {
    const args = parseArgs(rawArgs);
    const product = typeof args?.product === 'string' ? args.product.trim() : '';
    const quantity = typeof args?.quantity === 'number' ? Math.round(args.quantity) : NaN;
    if (!product) return { ok: false, error: 'product must be a non-empty string' };
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, error: 'quantity must be a positive integer' };
    }
    ctx.state.draft.product = product;
    ctx.state.draft.quantity = quantity;
    return { ok: true };
  },

  async save_delivery_address(ctx, rawArgs) {
    const args = parseArgs(rawArgs);
    const address = typeof args?.address === 'string' ? args.address.trim() : '';
    if (!address) return { ok: false, error: 'address must be a non-empty string' };
    ctx.state.draft.address = address;
    return { ok: true };
  },

  async save_customer_email(ctx, rawArgs) {
    const args = parseArgs(rawArgs);
    const email = typeof args?.email === 'string' ? args.email.trim() : '';
    ctx.state.emailAsked = true;
    if (!EMAIL_REGEX.test(email)) {
      return { ok: false, error: 'That does not look like a valid email address.' };
    }
    ctx.state.draft.email = email;
    return { ok: true };
  },

  async resolve_pending_order(ctx, rawArgs) {
    const args = parseArgs(rawArgs);
    const decision = args?.decision === 'keep' || args?.decision === 'replace' ? args.decision : null;
    if (!decision) return { ok: false, error: "decision must be 'replace' or 'keep'" };
    if (!ctx.pendingOrderCandidateId) {
      return { ok: false, error: 'There is no pending order to resolve right now.' };
    }
    ctx.state.pendingOrderId = ctx.pendingOrderCandidateId;
    ctx.state.decision = decision;
    return { ok: true };
  },

  async finalize_order(ctx, rawArgs) {
    const args = parseArgs(rawArgs);
    if (args?.confirmed !== true) {
      return {
        ok: false,
        error:
          'Not confirmed. Show the customer a full order summary (product, quantity, address, phone) and wait for an explicit yes before calling finalize_order again.',
      };
    }

    const missing = missingRequiredFields(ctx);
    if (missing.length > 0) {
      return { ok: false, error: `Missing required details: ${missing.join(', ')}` };
    }
    if (ctx.state.pendingOrderId && !ctx.state.decision) {
      return {
        ok: false,
        error: 'The customer has a pending order — ask whether to replace it or keep both before finalizing.',
      };
    }
    if (ctx.pendingOrderCandidateId && !ctx.decisionResolvedBeforeThisTurn) {
      return {
        ok: false,
        error:
          'A pending order was just found this turn — ask the customer whether to replace it or keep both, and wait for their reply in a future turn before finalizing. Do not resolve and finalize in the same turn.',
      };
    }

    const result = await finalizeOrder({
      tenantId: ctx.tenantId,
      tenant: ctx.tenant,
      messageId: ctx.messageId,
      parsedBy: ctx.parsedBy,
      customer: ctx.customer,
      draft: ctx.state.draft,
      pendingOrderId: ctx.state.pendingOrderId,
      decision: ctx.state.decision,
    });

    return { ok: true, confirmationText: result.confirmationText, orderId: result.order._id.toString() };
  },
};
