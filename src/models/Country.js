import mongoose, { Schema, model } from "mongoose";

const countrySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    image: {
      public_id: { type: String, default: "" },
      url: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
  }
);

const Country = mongoose.models.Country || model("Country", countrySchema);

export default Country;
