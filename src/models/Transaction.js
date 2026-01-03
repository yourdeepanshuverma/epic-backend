import mongoose, { Schema, model, Types } from "mongoose";

const transactionSchema = new Schema(
  {
    vendor: {
      type: Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    gateway: {
      type: String,
      enum: ["razorpay", "stripe", "cashfree", "paytm", "phonepe", "internal"],
      required: true,
    },

    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentId: String,

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: [
        "created",
        "authorized",
        "captured",
        "failed",
        "refunded",
        "success",
      ],
    },

    method: String, // card / upi / netbanking etc

    // ⭐ STORE FULL RAW GATEWAY RESPONSE HERE
    raw_response: {
      type: Schema.Types.Mixed,
      default: {},
    },

    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

const Transaction =
  mongoose.models.Transaction || model("Transaction", transactionSchema);

export default Transaction;
