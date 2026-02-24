import Service from "../models/Service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";

/* ======================================================
   Create Service
====================================================== */
export const createService = asyncHandler(async (req, res, next) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }
  const { name, icon, type } = req.body;

  if (!name) {
    return next(new ErrorResponse(400, "Service name is required"));
  }

  const exists = await Service.findOne({ name });
  if (exists) {
    return next(
      new ErrorResponse(400, `Service with this name "${name}" already exists`)
    );
  }

  const service = await Service.create({ name, icon, type });

  res
    .status(201)
    .json(
      new SuccessResponse(
        201,
        `'${service.name}' Service created successfully`,
        service
      )
    );
});

/* ======================================================
   Get All Services
====================================================== */
export const getAllServices = asyncHandler(async (req, res, next) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }

  // Pagination params 
  const { page = 1, limit = 10 } = req.query;

  // Safe parsing
  const pageNumber = Math.max(1, parseInt(page));
  const limitNumber = Math.max(1, parseInt(limit));
  const skip = (pageNumber - 1) * limitNumber;

  // Fetch paginated services 
  const services = await Service.find()
    .sort({ name: 1 }) // alphabetical
    .skip(skip)
    .limit(limitNumber);

  // Total count for pagination metadata
  const total = await Service.countDocuments();
  const totalPages = Math.ceil(total / limitNumber);

  return res.status(200).json(
    new SuccessResponse(200, "Services fetched successfully", {
      services,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    })
  );
});

/* ======================================================
   Get Single Service
====================================================== */
export const getServiceById = asyncHandler(async (req, res, next) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new ErrorResponse(404, "Service not found"));
  }

  res
    .status(200)
    .json(
      new SuccessResponse(
        200,
        `'${service.name}' Service fetched successfully`,
        service
      )
    );
});

/* ======================================================
   Update Service
====================================================== */
export const updateService = asyncHandler(async (req, res, next) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }

  const updated = await Service.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    return next(new ErrorResponse(404, "Service not found"));
  }

  res
    .status(200)
    .json(
      new SuccessResponse(
        200,
        `'${updated.name}' Service updated successfully`,
        updated
      )
    );
});

/* ======================================================
   Delete Service
====================================================== */
export const deleteService = asyncHandler(async (req, res, next) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new ErrorResponse(404, "Service not found"));
  }

  await service.deleteOne();

  res
    .status(200)
    .json(
      new SuccessResponse(
        200,
        `'${service.name}' Service deleted successfully`,
        {}
      )
    );
});
