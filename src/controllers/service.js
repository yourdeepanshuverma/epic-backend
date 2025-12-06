import Service from "../models/Service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";

/* ======================================================
   Create Service
====================================================== */
export const createService = asyncHandler(async (req, res, next) => {
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
export const getAllServices = asyncHandler(async (req, res) => {
  const services = await Service.find().sort({ name: 1 });

  return res
    .status(200)
    .json(new SuccessResponse(200, "Services fetched successfully", services));
});

/* ======================================================
   Get Single Service
====================================================== */
export const getServiceById = asyncHandler(async (req, res, next) => {
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
