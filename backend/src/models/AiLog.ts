import { Schema, model, Document, Types } from 'mongoose';

export interface IAiLog extends Document {
  tenantId: Types.ObjectId;
  messageId: Types.ObjectId;
  provider?: 'anthropic' | 'groq';
  aiModel?: string;    // AI model identifier (e.g. "gpt-4o", "claude-3-haiku")
  prompt: string;
  response?: string;
  latencyMs?: number;
  success: boolean;    // false when error is set; enables fast analytics queries
  error?: string;
  createdAt: Date;
}

const aiLogSchema = new Schema<IAiLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
    provider: { type: String, enum: ['anthropic', 'groq'] },
    aiModel: { type: String },
    prompt: { type: String, required: true },
    response: { type: String },
    latencyMs: { type: Number, min: 0 },
    success: { type: Boolean, required: true, default: true },
    error: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Supports AI failure rate analytics and recent log browsing
aiLogSchema.index({ tenantId: 1, createdAt: -1 });
// Supports filtering failed calls for monitoring/alerting
aiLogSchema.index({ tenantId: 1, success: 1, createdAt: -1 });

export const AiLog = model<IAiLog>('AiLog', aiLogSchema);
