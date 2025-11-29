import mongoose, { model, Schema } from "mongoose";

const vendorCategorySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  image: {
    public_id: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
});

const VendorCategory =
  mongoose.models.VendorCategory ||
  model("VendorCategory", vendorCategorySchema);

export default VendorCategory;
