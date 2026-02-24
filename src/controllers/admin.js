import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";
import SystemSetting from "../models/SystemSetting.js";
import VenuePackage from "../models/VenuePackage.js";
import ServicePackage from "../models/ServicePackage.js";
import Vendor from "../models/Vendor.js";

// Default Costs
const DEFAULT_LEAD_COSTS = {
  standard: 10,
  premium: 25,
  elite: 50,
};

export const getSystemSettings = asyncHandler(async (req, res) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }

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
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }
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
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }
  const { page = 1, limit = 10, status, search, vendor } = req.query;

  const filter = {};

  if (status === "pending") filter.approved = false;
  if (status === "approved") filter.approved = true;
  // If status is 'all' or undefined, show all

  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }

  if (vendor) {
    filter.vendor = vendor;
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
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }
  const { page = 1, limit = 10, status, search, vendor } = req.query;

  const filter = {};

  if (status === "pending") filter.approved = false;
  if (status === "approved") filter.approved = true;

  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }

  if (vendor) {
    filter.vendor = vendor;
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
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }
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
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }
  const { id } = req.params;
  const { approved, visibility } = req.body;

  const pkg = await ServicePackage.findById(id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  if (approved !== undefined) pkg.approved = approved;
  if (visibility !== undefined) pkg.visibility = visibility;

  await pkg.save();

  res.status(200).json(new SuccessResponse(200, "Package status updated", pkg));
});

/* ======================================================
    ADMIN: BULK CREATE VENDORS
====================================================== */
export const bulkCreateVendors = asyncHandler(async (req, res, next) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }

  const vendorsData = req.body;

  if (!Array.isArray(vendorsData) || vendorsData.length === 0) {
    return next(new ErrorResponse(400, "No vendor data provided or data is not in an array"));
  }

  const results = {
    successCount: 0,
    errors: [],
  };

  for (let i = 0; i < vendorsData.length; i++) {
    const rowNumber = i + 2; // Assuming Excel row numbers start at 2 (1 for header)
    const vendor = vendorsData[i];

    const {
      vendorName,
      email,
      phone,
      password,
      experience,
      workingSince,
      contactPerson,
      state,
      city,
      locality,
      address,
    } = vendor;

    // 1. Check for required fields
    const requiredFields = {
      vendorName,
      email,
      phone,
      password,
      experience,
      workingSince,
      contactPerson,
      state,
      city,
      locality,
      address,
    };
    const missingField = Object.keys(requiredFields).find(
      (key) => !requiredFields[key]
    );

    if (missingField) {
      results.errors.push({
        row: rowNumber,
        email: email || "N/A",
        message: `Missing required field: ${missingField}`,
      });
      continue;
    }

    try {
      // 2. Check for uniqueness
      const existingVendor = await Vendor.findOne({ $or: [{ email }, { phone }] });
      if (existingVendor) {
        results.errors.push({
          row: rowNumber,
          email,
          message: "Email or phone number already exists.",
        });
        continue;
      }

      // 3. Create and save vendor
      const newVendor = new Vendor({
        ...vendor,
        profile: {
          public_id: "epic-uploads/defaults/default_avatar",
          url: "https://res.cloudinary.com/dntsyzdh3/image/upload/v1703173095/epic-uploads/defaults/default_avatar.jpg",
        },
      });

      await newVendor.save();
      results.successCount++;
    } catch (error) {
      results.errors.push({
        row: rowNumber,
        email,
        message: error.message || "An unknown error occurred during save.",
      });
    }
  }

  res.status(201).json(new SuccessResponse(201, "Bulk vendor processing complete.", results));
});
