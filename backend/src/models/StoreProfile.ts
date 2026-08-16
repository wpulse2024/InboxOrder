import { Schema, model, Document, Types } from 'mongoose';

export interface IStoreProfileProduct {
  name: string;
  price: number;
  description?: string;
  sku?: string;
  category?: string;
  imageUrl?: string;
}

export interface IStoreProfileFaq {
  question: string;
  answer: string;
}

export interface IStoreProfile extends Document {
  tenantId: Types.ObjectId;
  businessInfo?: string;
  products: IStoreProfileProduct[];
  faqs: IStoreProfileFaq[];
  createdAt: Date;
  updatedAt: Date;
}

const storeProfileSchema = new Schema<IStoreProfile>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    businessInfo: { type: String, maxlength: 4000 },
    products: [
      {
        name: { type: String, required: true, maxlength: 200 },
        price: { type: Number, required: true, min: 0 },
        description: { type: String, maxlength: 500 },
        sku: { type: String, maxlength: 60 },
        category: { type: String, maxlength: 100 },
        imageUrl: { type: String, maxlength: 1000 },
      },
    ],
    faqs: [
      {
        question: { type: String, required: true, maxlength: 300 },
        answer: { type: String, required: true, maxlength: 1000 },
      },
    ],
  },
  { timestamps: true }
);

// One store profile per tenant
storeProfileSchema.index({ tenantId: 1 }, { unique: true });

export const StoreProfile = model<IStoreProfile>('StoreProfile', storeProfileSchema);
