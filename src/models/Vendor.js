import mongoose, { model, Schema } from "mongoose";
import slugify from "slugify";
import bcrypt from "bcryptjs";

/**
 * Vendor Status Enum
 * @enum {string}
 * @readonly
 * @property {string} ACTIVE - Active vendor
 * @property {string} INACTIVE - Inactive vendor
 * @property {string} PENDING - Pending approval
 * @property {string} REJECTED - Rejected vendor
 * @property {string} BLOCKED - Blocked vendor
 */
export const STATUS = ["active", "inactive", "pending", "rejected", "blocked"];

const mediaSchema = new Schema(
  {
    url: String,
    public_id: String,
  },
  {
    _id: false,
  }
);

const documentSchema = new Schema(
  {
    gst: mediaSchema,
    pan: mediaSchema,
    idProof: mediaSchema,
    registrationProof: mediaSchema,
  },
  { _id: false }
);

const walletSchema = new Schema(
  {
    balance: {
      type: Number,
      default: 0,
    },
    transactions: [
      {
        type: {
          type: String,
          enum: ["credit", "debit"],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        purpose: {
          type: String,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { _id: false }
);

const vendorSchema = new Schema(
  {
    // ----------------------
    // BASIC DETAILS
    // ----------------------
    vendorName: {
      type: String,
      required: true,
      trim: true,
    },

    profile: {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },

    slug: {
      type: String,
      unique: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    experience: {
      type: Number,
      required: true,
    },

    teamSize: {
      type: Number,
      default: null,
    },

    workingSince: {
      type: Number,
      required: true,
    },

    // ----------------------
    // LOCATION
    // ----------------------
    state: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      required: true,
    },

    locality: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    pincode: {
      type: String,
    },

    googleMapLink: String,

    // ----------------------
    // MEDIA
    // ----------------------
    coverImage: mediaSchema,

    // ----------------------
    // DOCUMENTS
    // ----------------------
    documents: documentSchema,

    // ----------------------
    // CONTACT PERSON INFO
    // ----------------------
    contactPerson: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    website: String,

    // ----------------------
    // WALLET SYSTEM
    // ----------------------
    wallet: {
      type: walletSchema,
      default: () => ({ balance: 0, transactions: [] }),
    },

    // ----------------------
    // ADMIN CONTROLS
    // ----------------------
    featured: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: STATUS,
      default: "pending",
      lowercase: true,
    },

    verifiedBadge: {
      type: Boolean,
      default: false,
    },

    adminNotes: {
      type: String,
      default: "",
    },

    lastActive: {
      type: Date,
      default: Date.now,
    },

    autoApprovePackages: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

vendorSchema.pre("save", async function (next) {
  // PASSWORD check
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  // Slug generation
  if (this.isModified("vendorName")) {
    const baseSlug = slugify(this.vendorName, {
      lower: true,
      strict: true,
      trim: true,
    });

    this.slug = `${baseSlug}-${this._id.toString()}`;
  }

  next();
});

vendorSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const Vendor = mongoose.models.Vendor || model("Vendor", vendorSchema);

export default Vendor;
