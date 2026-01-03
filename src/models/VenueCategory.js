import mongoose, { model, Schema, Types } from "mongoose";

const venueCategorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
    },
    image: {
      public_id: {
        type: String,
        required: [true, "Image public_id is required"],
      },
      url: {
        type: String,
        required: [true, "Image URL is required"],
      },
    },
    // Services linked to category
    services: [
      {
        type: Types.ObjectId,
        ref: "Service",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const VenueCategory =
  mongoose.models.VenueCategory || model("VenueCategory", venueCategorySchema);

export default VenueCategory;
