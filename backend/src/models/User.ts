import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  tenantId: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'staff';
  isActive: boolean;
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
    role: { type: String, enum: ['admin', 'staff'], default: 'admin' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

// Unique email per tenant; index supports auth lookups
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export const User = model<IUser>('User', userSchema);
