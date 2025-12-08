import mongoose, { model, Schema, Types } from "mongoose";

const serviceSubCategory = new Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  slug: {
    type: String,
    required: [true, "Slug is required"],
    unique: true,
    lowercase: true,
    trim: true,
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
  serviceCategory: {
    type: Schema.Types.ObjectId,
    ref: "ServiceCategory",
    required: [true, "Service Category is required"],
  },
  // Services linked to category
  services: [
    {
      type: Types.ObjectId,
      ref: "Service",
    },
  ],
});

const ServiceSubCategory =
  mongoose.models.ServiceSubCategory ||
  model("ServiceSubCategory", serviceSubCategory);

export default ServiceSubCategory;
