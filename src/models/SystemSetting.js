import mongoose, { Schema, model } from "mongoose";

const systemSettingSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true, // e.g., "lead_costs"
    },
    value: {
      type: Schema.Types.Mixed, // Can store any JSON structure
      required: true,
    },
    description: String,
  },
  { timestamps: true }
);

const SystemSetting = mongoose.models.SystemSetting || model("SystemSetting", systemSettingSchema);
export default SystemSetting;
