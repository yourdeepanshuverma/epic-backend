import mongoose, { model, Schema } from "mongoose";

const serviceCategorySchema = new Schema({
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

const ServiceCategory =
  mongoose.models.ServiceCategory ||
  model("ServiceCategory", serviceCategorySchema);

export default ServiceCategory;
