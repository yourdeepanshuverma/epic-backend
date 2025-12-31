import mongoose, { Schema, model } from "mongoose";

const leadSchema = new Schema(
  {
    // Customer Details
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      city: String,
      state: String,
    },
    eventDate: Date,
    guestCount: Number,
    budget: Number,
    message: String,

    // Lead Source
    source: {
      type: String,
      enum: ["website", "social", "manual"],
      default: "website",
    },
    
    // If inquiry came from a specific package
    interestedInPackage: {
      type: Schema.Types.ObjectId,
      refPath: "packageType", // Dynamic reference
    },
    packageType: {
      type: String,
      enum: ["VenuePackage", "ServicePackage"],
    },

    // ----------------------
    // LEAD CLASSIFICATION
    // ----------------------
    category: {
      type: String,
      enum: ["Standard", "Premium", "Elite"],
      default: "Standard",
    },

    price: {
      type: Number,
      required: true,
      default: 50, // Base price
    },

    deviceType: {
      type: String,
      enum: ["Mobile", "Desktop", "Tablet", "Unknown"],
      default: "Unknown",
    },

    tags: [String], // e.g., "High Budget", "Urgent", "iOS"

    // Sales Tracking
    purchasedBy: [
      {
        vendor: {
          type: Schema.Types.ObjectId,
          ref: "Vendor",
        },
        purchasedAt: {
          type: Date,
          default: Date.now,
        },
        pricePaid: Number,
        method: {
          type: String,
          enum: ["wallet", "credit"], // Wallet Balance or Lead Credit
        },
      },
    ],
  },
  { timestamps: true }
);

const Lead = mongoose.models.Lead || model("Lead", leadSchema);
export default Lead;