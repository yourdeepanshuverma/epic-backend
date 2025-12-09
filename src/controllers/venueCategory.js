import slugify from "slugify";
import Service from "../models/Service.js";
import VenueCategory from "../models/VenueCategory.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";
import mongoose from "mongoose";

/* ======================================================
   CREATE CATEGORY
====================================================== */
export const createCategory = asyncHandler(async (req, res, next) => {
  const { name, services } = req.body;

  if (!name) {
    return next(new ErrorResponse(400, "Category name is required"));
  }

  const slug = slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  });

  // Check duplicate
  const exists = await VenueCategory.exists({ $or: [{ name }, { slug }] });
  if (exists) {
    return next(
      new ErrorResponse(400, `Category with this name '${name}' already exists`)
    );
  }

  // Validate services list
  if (services && services.length > 0) {
    const invalid = services.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalid.length > 0) {
      return next(new ErrorResponse(400, "Invalid service IDs provided"));
    }

    const existingServices = await Service.find({ _id: { $in: services } });
    if (existingServices.length !== services.length) {
      return next(new ErrorResponse(404, "One or more services not found"));
    }
  }

  // Image upload
  if (!req.file) {
    return next(new ErrorResponse(400, "Category image is required"));
  }

  const uploadedImage = await uploadToCloudinary([req.file]);
  const category = await VenueCategory.create({
    name,
    slug,
    image: uploadedImage[0],
    services,
  });

  res
    .status(201)
    .json(
      new SuccessResponse(
        201,
        `'${name}' Category created successfully`,
        category
      )
    );
});

/* ======================================================
   GET ALL CATEGORIES (Paginated)
====================================================== */
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await VenueCategory.find()
    .populate("services")
    .sort({ name: 1 });

  res
    .status(200)
    .json(
      new SuccessResponse(200, "Categories fetched successfully", categories)
    );
});

/* ======================================================
   GET SINGLE CATEGORY
====================================================== */
export const getCategory = asyncHandler(async (req, res, next) => {
  const category = await VenueCategory.findById(req.params.id).populate(
    "services"
  );

  if (!category) return next(new ErrorResponse(404, "Category not found"));

  res
    .status(200)
    .json(new SuccessResponse(200, "Category fetched successfully", category));
});

/* ======================================================
   UPDATE CATEGORY
====================================================== */
export const updateCategory = asyncHandler(async (req, res, next) => {
  const { name, services } = req.body;

  const category = await VenueCategory.findById(req.params.id);
  if (!category) return next(new ErrorResponse(404, "Category not found"));

  if (name) {
    // Check duplicate
    const slug = slugify(name, {
      lower: true,
      strict: true,
      trim: true,
    });
    const exists = await VenueCategory.exists({
      $or: [{ name }, { slug }],
      _id: { $ne: category._id },
    });

    if (exists) {
      return next(
        new ErrorResponse(
          400,
          `Category with this name '${name}' already exists`
        )
      );
    }

    category.name = name;
    category.slug = slug;
  }

  if (services) {
    const invalid = services.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalid.length > 0) {
      return next(new ErrorResponse(400, "Invalid service IDs provided"));
    }
    category.services = services;
  }

  // Image update if new image provided
  if (req.file) {
    const uploadedImage = await uploadToCloudinary([req.file]);
    category.image = uploadedImage[0];
  }

  await category.save();

  res
    .status(200)
    .json(
      new SuccessResponse(
        200,
        `'${category.name}' Category updated successfully`,
        category
      )
    );
});

/* ======================================================
   DELETE CATEGORY
====================================================== */
export const deleteCategory = asyncHandler(async (req, res, next) => {
  const category = await VenueCategory.findById(req.params.id);
  if (!category) return next(new ErrorResponse(404, "Category not found"));

  await category.deleteOne();

  return res
    .status(200)
    .json(
      new SuccessResponse(
        200,
        `'${category.name}' Category deleted successfully`
      )
    );
});

/* ======================================================
   GET CATEGORIES FOR VENUE PACKAGE
====================================================== */
export const getCategoriesForVenuePackage = asyncHandler(async (req, res) => {
  const categories = await VenueCategory.find().select("_id name");

  res
    .status(200)
    .json(
      new SuccessResponse(200, "Categories fetched successfully", categories)
    );
});
