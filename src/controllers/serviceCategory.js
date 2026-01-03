import ServiceCategory from "../models/ServiceCategory.js";
import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";
import slugify from "slugify";

// CREATE CATEGORY
export const createServiceCategory = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;

  if (!name) return next(new ErrorResponse(400, "Name is required"));
  if (!req.file) return next(new ErrorResponse(400, "Image is required"));

  const slug = slugify(name, { lower: true, strict: true, trim: true });

  const existing = await ServiceCategory.exists({ name, slug });
  if (existing)
    return next(
      new ErrorResponse(400, "Category with this name already exists")
    );

  const uploadedImg = await uploadToCloudinary([req.file]);

  const category = await ServiceCategory.create({
    name,
    slug,
    description,
    image: uploadedImg[0],
  });

  res
    .status(201)
    .json(new SuccessResponse(201, "Category created successfully", category));
});

// GET ALL CATEGORIES
export const getAllServiceCategories = asyncHandler(async (req, res) => {
  const categories = await ServiceCategory.find();

  res
    .status(200)
    .json(new SuccessResponse(200, "Categories fetched", categories));
});

// GET SINGLE CATEGORY
export const getServiceCategory = asyncHandler(async (req, res, next) => {
  const category = await ServiceCategory.findById(req.params.id);

  if (!category) return next(new ErrorResponse(404, "Category not found"));

  res.status(200).json(new SuccessResponse(200, "Category fetched", category));
});

// UPDATE CATEGORY
export const updateServiceCategory = asyncHandler(async (req, res, next) => {
  const category = await ServiceCategory.findById(req.params.id);
  if (!category) return next(new ErrorResponse(404, "Category not found"));

  if (req.body.name) {
    const slug = slugify(req.body.name, {
      lower: true,
      strict: true,
      trim: true,
    });
    const existing = await ServiceCategory.exists({
      $or: [{ name: req.body.name }, { slug }],
      _id: { $ne: category._id },
    });
    if (existing)
      return next(
        new ErrorResponse(400, `Category with this name already exists`)
      );

    category.name = req.body.name;
    category.slug = slug;
  }

  if (req.body.description !== undefined) {
    category.description = req.body.description;
  }

  // If a new image is uploaded
  if (req.file) {
    const uploadedImg = await uploadToCloudinary([req.file]);
    if (uploadedImg) {
      await deleteFromCloudinary([category.image]);
      category.image = uploadedImg[0];
    }
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

// DELETE CATEGORY
export const deleteServiceCategory = asyncHandler(async (req, res, next) => {
  const category = await ServiceCategory.findById(req.params.id);

  if (!category) return next(new ErrorResponse(404, "Category not found"));

  const deleted = await deleteFromCloudinary([category.image]);
  if (deleted) {
    await category.deleteOne();
  }

  res
    .status(200)
    .json(new SuccessResponse(200, "Category deleted successfully"));
});

// GET ALL CATEGORIES
export const getCategoriesForServicePackage = asyncHandler(async (req, res) => {
  const categories = await ServiceCategory.find().select("_id name");

  res
    .status(200)
    .json(
      new SuccessResponse(200, "Categories fetched successfully", categories)
    );
});
