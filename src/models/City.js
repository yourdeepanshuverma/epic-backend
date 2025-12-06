import mongoose, { Schema, Types, model } from "mongoose";

const citySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    image: {
      public_id: { type: String, default: "" },
      url: { type: String, default: "" },
    },
    state: {
      type: Types.ObjectId,
      ref: "State",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const City = mongoose.models.City || model("City", citySchema);

export default City;
