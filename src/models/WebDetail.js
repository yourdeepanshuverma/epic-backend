const socialSchema = new mongoose.Schema({
  platform: { type: String, required: true }, // e.g., "facebook", "twitter"
  url: { type: String, required: true },
});

const webDetailSchema = new Schema(
  {
    siteName: {
      type: String,
      required: true,
    },
    siteURL: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    logoURL: {
      type: String,
      required: true,
    },
    faviconURL: {
      type: String,
      required: true,
    },
    contactEmail: {
      type: String,
      required: true,
    },
    contactPhone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    socialMediaLinks: [socialSchema],
  },
  {
    timestamps: true,
  }
);
