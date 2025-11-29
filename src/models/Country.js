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
      public_id: { type: String, required: true },
      url: { type: String, required: true },
    },
  },
  {
    timestamps: true,
  }
);

const Country = mongoose.models.Country || model("Country", countrySchema);

export default Country;
