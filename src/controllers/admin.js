import Vendor from "../models/Vendor.js";
import VenueCategory from "../models/VenueCategory.js";
import VenuePackage from "../models/VenuePackage.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";

// VERIFY PACKAGE - Admin
export const verifyVenuePackage = asyncHandler(async (req, res, next) => {
  const pkgId = req.params.id;

  const pkg = await VenuePackage.findById(pkgId);

  if (!pkg) {
    return next(new ErrorResponse(404, "Package not found"));
  }

  pkg.isVerified = true;
  await pkg.save();

  return res
    .status(200)
    .json(new SuccessResponse(200, "Venue package verified", pkg));
});

//#region VENUE CATEGORY CRUD

// CREATE CATEGORY - Admin
export const createVenueCategory = asyncHandler(async (req, res, next) => {
  const { name, sections, fields } = req.body;
  let image = req.file;

  if (!name) {
    return next(new ErrorResponse(400, "Name is required"));
  }

  const exists = await VenueCategory.findOne({ name });
  if (exists) {
    return next(new ErrorResponse(400, `Category '${name}' already exists`));
  }

  if (!image) {
    return next(new ErrorResponse(400, "Image is required"));
  }

  const upload = uploadToCloudinary([image]);
  if (!upload) {
    return next(new ErrorResponse(500, "Image upload failed"));
  }

  image = upload[0];

  const category = await VenueCategory.create({
    name,
    image,
    sections,
    fields,
  });

  if (!category) {
    return next(
      new ErrorResponse(500, `'${name}' Venue category creation failed`)
    );
  }

  return res
    .status(201)
    .json(
      new SuccessResponse(201, `'${name}' Venue category created`, category)
    );
});

// GET ALL CATEGORIES - Public
export const getAllVenueCategories = asyncHandler(async (req, res) => {
  const categories = await VenueCategory.find()
    .select("name image")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new SuccessResponse(200, "All venue categories", categories));
});

// GET SINGLE CATEGORY - Admin
export const getVenueCategory = asyncHandler(async (req, res, next) => {
  const category = await VenueCategory.findById(req.params.id);

  if (!category) {
    return next(new ErrorResponse(404, "Venue category not found"));
  }

  return res
    .status(200)
    .json(
      new SuccessResponse(
        200,
        `'${category.name}' Venue category details`,
        category
      )
    );
});

// UPDATE CATEGORY - Admin
export const updateVenueCategory = asyncHandler(async (req, res, next) => {
  const categoryId = req.params.id;

  const category = await VenueCategory.findById(categoryId);
  if (!category) {
    return next(new ErrorResponse(404, "Venue category not found"));
  }

  if (req.file) {
    // upload new image
    const upload = await uploadToCloudinary([req.file]);
    if (!upload) {
      return next(new ErrorResponse(500, "Image upload failed"));
    }
    await deleteFromCloudinary([category.image]); // delete old image
    req.body.image = upload[0];
  }

  const updated = await VenueCategory.findByIdAndUpdate(
    categoryId,
    {
      $set: {
        name: req.body.name || category.name,
        image: req.body.image || category.image,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new SuccessResponse(
        200,
        `'${updated.name}' Venue category updated`,
        updated
      )
    );
});

// DELETE CATEGORY
export const deleteVenueCategory = asyncHandler(async (req, res, next) => {
  const category = await VenueCategory.findById(req.params.id);

  if (!category) {
    return next(new ErrorResponse(404, "Venue category not found"));
  }

  await deleteFromCloudinary([category.image]);
  await category.deleteOne();

  return res
    .status(200)
    .json(
      new SuccessResponse(200, `'${category.name}' Venue category deleted`)
    );
});

/* -------------------------------------------
   VENUE CATEGORY SECTION CRUD OPERATIONS
------------------------------------------- */

// ADD SECTION
export const addSection = asyncHandler(async (req, res, next) => {
  const { label, key } = req.body;

  if (!label || !key) {
    return next(new ErrorResponse(400, "Label and key are required"));
  }

  const category = await VenueCategory.findById(req.params.id);
  if (!category) {
    return next(new ErrorResponse(404, "Category not found"));
  }

  const existingSection = category.sections.find((s) => s.key === key);
  if (existingSection) {
    return next(new ErrorResponse(400, "Section key already exists"));
  }

  category.sections.push({ label, key });
  await category.save();

  return res
    .status(200)
    .json(new SuccessResponse(200, "Section added", category));
});

// DELETE SECTION
export const deleteSection = asyncHandler(async (req, res, next) => {
  const { sectionKey } = req.params;

  const category = await VenueCategory.findById(req.params.id);
  if (!category) {
    return next(new ErrorResponse(404, "Category not found"));
  }

  const sectionRemoved = category.sections.filter((s) => s.key !== sectionKey);
  if (sectionRemoved.length === category.sections.length) {
    return next(new ErrorResponse(404, `'${sectionKey}' Section not found`));
  }
  category.sections = sectionRemoved;
  category.fields = category.fields.filter((f) => f.section !== sectionKey);
  await category.save();

  return res
    .status(200)
    .json(
      new SuccessResponse(
        200,
        `'${sectionKey}' Section deleted and its related fields are removed`,
        category
      )
    );
});

/* -------------------------------------------
    VENUE CATEGORY FIELD CRUD OPERATIONS
------------------------------------------- */

// ADD FIELD
export const addField = asyncHandler(async (req, res, next) => {
  const { label, key, type, section, options, isFilterable } = req.body;

  if (!label || !key || !type || !section) {
    return next(
      new ErrorResponse(400, "Label, key, type, and section are required")
    );
  }

  const category = await VenueCategory.findById(req.params.id);
  if (!category) {
    return next(new ErrorResponse(404, "Category not found"));
  }

  // ensure section exists
  const sectionExists = category.sections.find((s) => s.key === section);
  if (!sectionExists) {
    return next(new ErrorResponse(400, `'${section}' Invalid section key`));
  }

  const fieldExists = category.fields.find((f) => f.key === key);
  if (fieldExists) {
    return next(new ErrorResponse(400, `'${key}' Field key already exists`));
  }

  category.fields.push({
    label,
    key,
    type, // text, textarea, number, select, multi-select, checkbox, radio, date, time, range, image, images, tags, location, url, phone
    section,
    options,
    isFilterable,
  });

  await category.save();

  return res
    .status(200)
    .json(
      new SuccessResponse(200, `'${label}' Field added successfully`, category)
    );
});

// UPDATE FIELD
export const updateField = asyncHandler(async (req, res, next) => {
  const { fieldKey } = req.params;
  const { section } = req.body;

  const category = await VenueCategory.findById(req.params.id);
  if (!category) {
    return next(new ErrorResponse(404, "Category not found"));
  }

  const field = category.fields.find((f) => f.key === fieldKey);
  if (!field) {
    return next(new ErrorResponse(404, `'${fieldKey}' Field not found`));
  }

  if (section) {
    // ensure section exists
    const sectionExists = category.sections.find((s) => s.key === section);
    if (!sectionExists) {
      return next(new ErrorResponse(400, `'${section}' Invalid section key`));
    }
  }

  Object.assign(field, req.body);

  await category.save();

  return res
    .status(200)
    .json(new SuccessResponse(200, `'${field.label}' Field updated`, category));
});

// DELETE FIELD
export const deleteField = asyncHandler(async (req, res, next) => {
  const { fieldKey } = req.params;

  const category = await VenueCategory.findById(req.params.id);
  if (!category) {
    return next(new ErrorResponse(404, "Category not found"));
  }

  const field = category.fields.find((f) => f.key === fieldKey);
  if (!field) {
    return next(new ErrorResponse(404, `'${fieldKey}' Field not found`));
  }

  category.fields = category.fields.filter((f) => f.key !== fieldKey);
  await category.save();

  return res
    .status(200)
    .json(new SuccessResponse(200, `'${field.label}' Field deleted`, category));
});

//#endregion VENUE CATEGORY CRUD

/* ======================================================
   GET ALL VENDORS (Admin)
====================================================== */
export const getAllVendors = asyncHandler(async (req, res) => {
  const vendors = await Vendor.find()
    .populate("state")
    .populate("city")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new SuccessResponse(200, "All vendors fetched", vendors));
});
