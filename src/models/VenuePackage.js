import mongoose, { model, Schema, Types } from "mongoose";
import slugify from "slugify";

const venuePackageSchema = new Schema(
  {
    isVerified: {
      type: Boolean,
      default: false,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
    vendor: {
      type: Types.ObjectId,
      ref: "Vendor",
      required: [true, "Vendor is required"],
    },
    venueCategory: {
      type: Types.ObjectId,
      ref: "VenueCategory",
      required: [true, "Venue category is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
    },
    shortDescription: {
      type: String,
      required: [true, "Short description is required"],
    },
    fullDescription: {
      type: String,
      required: [true, "Full description is required"],
    },
    // fields locality, full address, city, state, country, google maps link, pincode
    location: {
      locality: {
        type: String,
        required: [true, "Locality is required"],
      },
      fullAddress: {
        type: String,
        required: [true, "Full address is required"],
      },
      city: {
        type: Types.ObjectId,
        ref: "City",
        required: [true, "City is required"],
      },
      state: {
        type: Types.ObjectId,
        ref: "State",
        required: [true, "State is required"],
      },
      country: {
        type: Types.ObjectId,
        ref: "Country",
        required: [true, "Country is required"],
      },
      googleMapsLink: {
        type: String,
      },
      pincode: {
        type: String,
        required: [true, "Pincode is required"],
      },
    },
    venueDetails: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    amenities: [String],
    spacePreferences: [String],
    pricing: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    // fields cover image, gallery images, video
    media: {
      coverImage: {
        public_id: {
          type: String,
          required: [true, "Cover image public_id is required"],
        },
        url: {
          type: String,
          required: [true, "Cover image URL is required"],
        },
      },
      galleryImages: [
        {
          public_id: {
            type: String,
            required: [true, "Gallery image public_id is required"],
          },
          url: {
            type: String,
            required: [true, "Gallery image URL is required"],
          },
        },
      ],
      video: {
        public_id: {
          type: String,
        },
        url: {
          type: String,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

venuePackageSchema.pre("save", async function (next) {
  if (!this.isModified("title") && !this.isModified("location.city")) {
    return next();
  }

  const cityDoc = await model("City").findById(this.location.city);
  const cityName = cityDoc ? cityDoc.name : "";

  const baseSlug = slugify(this.title, {
    lower: true,
    strict: true,
    trim: true,
  });
  const citySlug = slugify(cityName, { lower: true, strict: true, trim: true });

  // _id always available before save
  this.slug = `${baseSlug}-${citySlug}-${this._id.toString()}`;

  next();
});

const VenuePackage =
  mongoose.models.VenuePackage || model("VenuePackage", venuePackageSchema);

export default VenuePackage;
