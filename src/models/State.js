import mongoose, { Schema, Types, model } from "mongoose";

const stateSchema = new Schema(
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
    country: {
      type: Types.ObjectId,
      ref: "Country",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const State = mongoose.models.State || model("State", stateSchema);

export default State;
