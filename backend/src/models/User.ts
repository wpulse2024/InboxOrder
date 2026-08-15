import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  tenantId: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: 'owner' | 'admin' | 'staff';
  isActive: boolean;
  isPlatformAdmin: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['owner', 'admin', 'staff'], default: 'owner' },
    isActive: { type: Boolean, default: true },
    // Cross-tenant flag — separate from the tenant-scoped `role` above. Grants access to
    // platform-wide config (shared Facebook App credentials, AI settings) in /admin/config.
    isPlatformAdmin: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

// Unique email per tenant; index supports auth lookups
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export const User = model<IUser>('User', userSchema);
