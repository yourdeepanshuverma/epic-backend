import mongoose, { model, Schema } from "mongoose";

const serviceSubCategory = new Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  Image: {
    public_id: {
      type: String,
      required: [true, "Public ID is required"],
    },
    url: {
      type: String,
      required: [true, "URL is required"],
    },
  },
  serviceCategory: {
    type: Schema.Types.ObjectId,
    ref: "ServiceCategory",
    required: [true, "Service Category is required"],
  },
  // sections for grouping fields in UI
  sections: [
    {
      label: String,
      key: String,
    },
  ],
  // single flexible schema for EVERYTHING
  fields: [
    {
      label: String, // shown to vendor
      key: String, // stored in package
      type: {
        type: String,
        enum: FIELD_TYPES,
      },
      section: String, // "details" | "amenities" | "space" | "pricing"
      options: [String], // for select, multi select, space, amenities
      isFilterable: Boolean, // optional, for filtering UI
    },
  ],
});

const ServiceSubCategory =
  mongoose.models.ServiceSubCategory ||
  model("ServiceSubCategory", serviceSubCategory);

export default ServiceSubCategory;
