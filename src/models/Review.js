import mongoose, { model } from "mongoose";
import { Schema } from "mongoose";

const PACKAGE_TYPES = ["venue", "service"];

const reviewSchema = new Schema(
  {
    packageType: { type: String, enum: PACKAGE_TYPES, required: true },
    package: {
      type: Schema.Types.ObjectId,
      ref: "VenuePackage",
      required: true,
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    name: { type: String, required: true },
    comment: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
  },
  {
    timestamps: true,
  }
);

const Review = mongoose.models.Review || model("Review", reviewSchema);

export default Review;
