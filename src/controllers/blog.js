import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";
import Blog from "../models/Blog.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import extractIdFromSlug from "../utils/extractIdFromSlug.js";

// @desc    Create a new blog
// @route   POST /api/v1/blogs
// @access  Private (Vendor/Admin)
export const createBlog = asyncHandler(async (req, res, next) => {
  const { title, category, content, excerpt } = req.body;

  if (!title || !category || !content || !excerpt) {
    return next(new ErrorResponse(400, "Please provide all required fields"));
  }

  if (!req.file) {
    return next(new ErrorResponse(400, "Please upload a cover image"));
  }

  // Upload image
  const uploadedImages = await uploadToCloudinary([req.file]);
  const image = uploadedImages[0];

  const blog = await Blog.create({
    vendor: req.vendor._id,
    title,
    category,
    content,
    excerpt,
    image: {
      public_id: image.public_id,
      url: image.url,
    },
  });

  res.status(201).json(new SuccessResponse(201, "Blog created successfully", blog));
});

// @desc    Get all blogs (Vendor's own)
// @route   GET /api/v1/blogs
// @access  Private
export const getAllBlogs = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, category, search, vendorId } = req.query;

  const filter = {};

  // Role based filtering
  if (req.vendor.role === "admin") {
    // Admin can filter by specific vendor if provided
    if (vendorId) {
      filter.vendor = vendorId;
    }
  } else {
    // Vendor can ONLY see their own
    filter.vendor = req.vendor._id;
  }

  if (category) {
    filter.category = category;
  }

  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }

  const blogs = await Blog.find(filter)
    .populate("vendor", "vendorName email profile") // Added email for more context if needed, mostly vendorName/profile
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Blog.countDocuments(filter);

  res.status(200).json(
    new SuccessResponse(200, "Blogs fetched successfully", {
      blogs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  );
});

// @desc    Get single blog by slug (extracting ID)
// @route   GET /api/v1/blogs/:slug
// @access  Private (Owner/Admin)
export const getBlog = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;
  const id = extractIdFromSlug(slug);

  const blog = await Blog.findById(id).populate(
    "vendor",
    "vendorName email profile"
  );

  if (!blog) {
    return next(new ErrorResponse(404, "Blog not found"));
  }

  // Check ownership
  if (
    blog.vendor._id.toString() !== req.vendor._id.toString() &&
    req.vendor.role !== "admin"
  ) {
    return next(new ErrorResponse(403, "Not authorized to view this blog"));
  }

  res.status(200).json(new SuccessResponse(200, "Blog fetched successfully", blog));
});

// @desc    Update blog
// @route   PUT /api/v1/blogs/:id
// @access  Private (Owner/Admin)
export const updateBlog = asyncHandler(async (req, res, next) => {
  let blog = await Blog.findById(req.params.id);

  if (!blog) {
    return next(new ErrorResponse(404, "Blog not found"));
  }

  // Check ownership
  if (
    blog.vendor.toString() !== req.vendor._id.toString() &&
    req.vendor.role !== "admin"
  ) {
    return next(
      new ErrorResponse(403, "Not authorized to update this blog")
    );
  }

  const { title, category, content, excerpt } = req.body;

  // Update fields
  if (title) blog.title = title;
  if (category) blog.category = category;
  if (content) blog.content = content;
  if (excerpt) blog.excerpt = excerpt;

  // Handle image update
  if (req.file) {
    // Delete old image
    if (blog.image && blog.image.public_id) {
      await deleteFromCloudinary([{ public_id: blog.image.public_id }]);
    }

    // Upload new image
    const uploadedImages = await uploadToCloudinary([req.file]);
    const image = uploadedImages[0];
    blog.image = {
        public_id: image.public_id,
        url: image.url
    };
  }

  await blog.save();

  res.status(200).json(new SuccessResponse(200, "Blog updated successfully", blog));
});

// @desc    Delete blog
// @route   DELETE /api/v1/blogs/:id
// @access  Private (Owner/Admin)
export const deleteBlog = asyncHandler(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    return next(new ErrorResponse(404, "Blog not found"));
  }

  // Check ownership
  if (
    blog.vendor.toString() !== req.vendor._id.toString() &&
    req.vendor.role !== "admin"
  ) {
    return next(
      new ErrorResponse(403, "Not authorized to delete this blog")
    );
  }

  // Delete image from Cloudinary
  if (blog.image && blog.image.public_id) {
    await deleteFromCloudinary([{ public_id: blog.image.public_id }]);
  }

  await blog.deleteOne();

  res.status(200).json(new SuccessResponse(200, "Blog deleted successfully", {}));
});
