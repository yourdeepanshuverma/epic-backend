import ServiceSubCategory from "../models/ServiceSubCategory.js";
import ServiceCategory from "../models/ServiceCategory.js";
import Service from "../models/Service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";
import slugify from "slugify";
import mongoose from "mongoose";

export const createServiceSubCategory = asyncHandler(async (req, res, next) => {
  const { name, serviceCategory, services, description } = req.body;

  if (!name) return next(new ErrorResponse(400, "Name is required"));
  if (!serviceCategory)
    return next(new ErrorResponse(400, "Service category is required"));

  if (!req.file)
    return next(new ErrorResponse(400, "Sub-category image is required"));

  // Generate slug
  const slug = slugify(name, { lower: true, strict: true, trim: true });

  const existing = await ServiceSubCategory.exists({ name, slug });
  if (existing)
    return next(
      new ErrorResponse(400, `Sub-category with name "${name}" already exists`)
    );

  // Validate serviceCategory
  const categoryExists = await ServiceCategory.findById(serviceCategory);
  if (!categoryExists)
    return next(new ErrorResponse(404, "Service category not found"));

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

  // Upload Image
  const uploadedImage = await uploadToCloudinary([req.file]);

  const subCategory = await ServiceSubCategory.create({
    name,
    slug,
    description,
    serviceCategory,
    services,
    image: uploadedImage[0],
  });

  res
    .status(201)
    .json(
      new SuccessResponse(201, "Service sub-category created", subCategory)
    );
});

export const getAllServiceSubCategories = asyncHandler(async (req, res) => {
  const { serviceCategory } = req.query;

  const filter = {};
  if (serviceCategory) filter.serviceCategory = serviceCategory;

  const data = await ServiceSubCategory.find(filter)
    .populate("serviceCategory", "name image")
    .populate("services", "name icon fields");

  res
    .status(200)
    .json(new SuccessResponse(200, "Sub-categories fetched", data));
});

export const getServiceSubCategory = asyncHandler(async (req, res, next) => {
  const data = await ServiceSubCategory.findById(req.params.id)
    .populate("serviceCategory", "name image")
    .populate("services", "name icon fields");

  if (!data) return next(new ErrorResponse(404, "Sub-category not found"));

  res.status(200).json(new SuccessResponse(200, "Sub-category fetched", data));
});

export const updateServiceSubCategory = asyncHandler(async (req, res, next) => {
  const subCategory = await ServiceSubCategory.findById(req.params.id);

  if (!subCategory)
    return next(new ErrorResponse(404, "Sub-category not found"));

  const { name, serviceCategory, services, description } = req.body;

  if (name) {
    const slug = slugify(name, { lower: true, strict: true });
    const existing = await ServiceSubCategory.exists({
      $or: [{ name }, { slug }],
      _id: { $ne: subCategory._id },
    });

    if (existing)
      return next(
        new ErrorResponse(
          400,
          `Sub-category with name "${name}" already exists`
        )
      );

    subCategory.name = name;
    subCategory.slug = slug;
  }

  if (description !== undefined) subCategory.description = description;

  if (serviceCategory) {
    const exists = await ServiceCategory.findById(serviceCategory);
    if (!exists)
      return next(new ErrorResponse(404, "Service category not found"));
    subCategory.serviceCategory = serviceCategory;
  }

  // Update services
  if (services) {
    const invalid = services.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalid.length > 0) {
      return next(new ErrorResponse(400, "Invalid service IDs provided"));
    }
    subCategory.services = services;
  }

  // Update image
  if (req.file) {
    const uploadedImage = await uploadToCloudinary([req.file]);
    if (uploadedImage && uploadedImage.length > 0) {
      await deleteFromCloudinary([subCategory.image]);
      subCategory.image = uploadedImage[0];
    }
  }

  await subCategory.save();

  res
    .status(200)
    .json(
      new SuccessResponse(
        200,
        `Sub-category '${subCategory.name}' updated`,
        subCategory
      )
    );
});

export const deleteServiceSubCategory = asyncHandler(async (req, res, next) => {
  const subCategory = await ServiceSubCategory.findById(req.params.id);

  if (!subCategory)
    return next(new ErrorResponse(404, "Sub-category not found"));

  await subCategory.deleteOne();

  res.status(200).json(new SuccessResponse(200, "Sub-category deleted"));
});

export const getServiceSubCategoriesForPackage = asyncHandler(
  async (req, res) => {
    const categoryExists = await ServiceCategory.exists({
      _id: req.params.serviceCategory,
    });

    if (!categoryExists) {
      return res
        .status(404)
        .json(new ErrorResponse(404, "Service category not found"));
    }

    const categories = await ServiceSubCategory.find({
      serviceCategory: req.params.serviceCategory,
    })
      .select("_id name services")
      .populate("services");

    res
      .status(200)
      .json(
        new SuccessResponse(
          200,
          "Sub-categories fetched successfully",
          categories
        )
      );
  }
);
