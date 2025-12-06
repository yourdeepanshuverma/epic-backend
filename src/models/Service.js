import mongoose, { Schema, model } from "mongoose";

const FIELD_TYPES = ["text", "textarea", "number", "boolean"];

const serviceSchema = new Schema(
  {
    name: {
      type: String,
      required: true, // Example: "Spaces", "Inclusions"
      unique: true,
    },

    icon: {
      type: String, //  for UI purposes
    },

    type: {
      type: String,
      enum: FIELD_TYPES,
      default: "text",
    },
  },
  { timestamps: true }
);

const Service = mongoose.models.Service || model("Service", serviceSchema);
export default Service;
