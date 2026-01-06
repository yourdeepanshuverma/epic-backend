import mongoose, { Schema, model } from "mongoose";
import slugify from "slugify";

const blogSchema = new Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    excerpt: {
      type: String,
      required: true,
      maxlength: 300,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    readTime: {
      type: Number,
      required: true,
      default: 1,
    },
    content: {
      type: String,
      required: true,
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
  },
  {
    timestamps: true,
  }
);

blogSchema.pre("save", async function () {
  if (this.isModified("content")) {
    const wpm = 200;
    const plainText = this.content.replace(/<[^>]*>/g, "");
    const words = plainText.trim().split(/\s+/).length;
    this.readTime = Math.ceil(words / wpm);
  }

  if (!this.isModified("title")) {
    return;
  }

  const baseSlug = slugify(this.title, {
    lower: true,
    strict: true,
    trim: true,
  });

  // _id always available before save
  this.slug = `${baseSlug}-${this._id.toString()}`;
});

const Blog = mongoose.models.Blog || model("Blog", blogSchema);

export default Blog;
