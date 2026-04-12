import { Schema, model, Document, Types } from 'mongoose';

export interface IWebhookLog extends Document {
  tenantId: Types.ObjectId;
  eventType: string;
  payload: Record<string, unknown>;
  statusCode: number;
  retries: number;
  error?: string;
  resolvedAt?: Date; // set when final retry succeeds or job is abandoned
  createdAt: Date;
}

const webhookLogSchema = new Schema<IWebhookLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    eventType: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    statusCode: { type: Number, required: true },
    retries: { type: Number, default: 0, min: 0 },
    error: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Supports paginated webhook log list and retention cleanup queries
webhookLogSchema.index({ tenantId: 1, createdAt: -1 });
// Supports filtering failed/unresolved events for the retry worker
webhookLogSchema.index({ tenantId: 1, statusCode: 1, resolvedAt: 1 });

export const WebhookLog = model<IWebhookLog>('WebhookLog', webhookLogSchema);
