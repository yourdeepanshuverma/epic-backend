import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";
import SystemSetting from "../models/SystemSetting.js";
import VenuePackage from "../models/VenuePackage.js";
import ServicePackage from "../models/ServicePackage.js";

// Default Costs
const DEFAULT_LEAD_COSTS = {
  standard: 10,
  premium: 25,
  elite: 50,
};

export const getSystemSettings = asyncHandler(async (req, res) => {
  const { key } = req.params;
  let setting = await SystemSetting.findOne({ key });

  // If asking for lead_costs and not found, return default
  if (key === "lead_costs" && !setting) {
    return res.status(200).json(
      new SuccessResponse(200, "Settings fetched (default)", DEFAULT_LEAD_COSTS)
    );
  }

  if (!setting) {
    return res.status(200).json(new SuccessResponse(200, "Setting not found", null));
  }

  res.status(200).json(new SuccessResponse(200, "Settings fetched", setting.value));
});

export const updateSystemSettings = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  const setting = await SystemSetting.findOneAndUpdate(
    { key },
    { value },
    { new: true, upsert: true }
  );

  res.status(200).json(new SuccessResponse(200, "Settings updated", setting.value));
});

export const checkAdmin = asyncHandler(async (req, res, next) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }

  return res
    .status(200)
    .cookies("isAdmin", isAdmin, { httpOnly: true })
    .json(new SuccessResponse(200, "Admin check successful", { isAdmin }));
});

/* ======================================================
    ADMIN: GET ALL VENUE PACKAGES (With Filters)
====================================================== */
export const getAdminVenuePackages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;

  const filter = {};

  if (status === "pending") filter.approved = false;
  if (status === "approved") filter.approved = true;
  // If status is 'all' or undefined, show all

  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }

  const packages = await VenuePackage.find(filter)
    .populate("vendor", "vendorName email phone")
    .populate("venueCategory", "name")
    .populate("location.city", "name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await VenuePackage.countDocuments(filter);

  res.status(200).json(
    new SuccessResponse(200, "Admin Venue Packages", {
      packages,
      total,
      page,
      limit,
    })
  );
});

/* ======================================================
    ADMIN: GET ALL SERVICE PACKAGES (With Filters)
====================================================== */
export const getAdminServicePackages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;

  const filter = {};

  if (status === "pending") filter.approved = false;
  if (status === "approved") filter.approved = true;

  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }

  const packages = await ServicePackage.find(filter)
    .populate("vendor", "vendorName email phone")
    .populate("serviceSubCategory", "name")
    .populate("location.city", "name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await ServicePackage.countDocuments(filter);

  res.status(200).json(
    new SuccessResponse(200, "Admin Service Packages", {
      packages,
      total,
      page,
      limit,
    })
  );
});

/* ======================================================
    ADMIN: UPDATE PACKAGE STATUS (Approve/Reject)
====================================================== */
export const updateVenuePackageStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { approved, visibility } = req.body;

  const pkg = await VenuePackage.findById(id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  if (approved !== undefined) pkg.approved = approved;
  if (visibility !== undefined) pkg.visibility = visibility;

  await pkg.save();

  res.status(200).json(new SuccessResponse(200, "Package status updated", pkg));
});

export const updateServicePackageStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { approved, visibility } = req.body;

  const pkg = await ServicePackage.findById(id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  if (approved !== undefined) pkg.approved = approved;
  if (visibility !== undefined) pkg.visibility = visibility;

  await pkg.save();

  res.status(200).json(new SuccessResponse(200, "Package status updated", pkg));
});
