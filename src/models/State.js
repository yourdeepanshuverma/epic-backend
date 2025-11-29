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
      public_id: { type: String, required: true },
      url: { type: String, required: true },
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
