import mongoose, { model, Schema } from "mongoose";

const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "select",
  "multi-select",
  "checkbox",
  "radio",
  "date",
  "time",
  "range",
  "image",
  "images",
  "tags",
  "location",
  "url",
  "phone",
];

const venueCategorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      unique: true,
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
  },
  {
    timestamps: true,
  }
);

const VenueCategory =
  mongoose.models.VenueCategory || model("VenueCategory", venueCategorySchema);

export default VenueCategory;
