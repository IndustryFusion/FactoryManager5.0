import { Schema, model } from 'mongoose';

export const PersistantTaskSchema = new Schema(
  {
    producerId: { type: String, required: true },
    bindingId: { type: String, required: true },
    assetId: { type: String, required: true },
    contractId: { type: String, required: true },
    interval: { type: Number, required: true }, // e.g. "10s", "2m"
    expiry: { type: Date, required: true },
    dataType: { type: Schema.Types.Mixed, required: true },
    assetProperties: { type: Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

export const PersistantTaskModel = model('BindingTask', PersistantTaskSchema);