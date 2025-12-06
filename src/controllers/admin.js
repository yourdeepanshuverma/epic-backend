import Vendor, { STATUS } from "../models/Vendor.js";
import VenuePackage from "../models/VenuePackage.js";
import asyncHandler from "../utils/asyncHandler.js";
import { deleteFromCloudinary } from "../utils/cloudinary.js";
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

//#region ADMIN VENDOR CONTROLS
