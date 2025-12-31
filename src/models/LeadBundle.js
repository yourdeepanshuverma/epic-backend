import mongoose, { Schema, model } from "mongoose";

const leadBundleSchema = new Schema(
  {
    name: {
      type: String, // e.g., "Starter Pack", "Pro Pack"
      required: true,
    },
    credits: {
      type: Number, // e.g., 20 leads
      required: true,
    },
    price: {
      type: Number, // e.g., 1500 INR
      required: true,
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const LeadBundle =
  mongoose.models.LeadBundle || model("LeadBundle", leadBundleSchema);
export default LeadBundle;