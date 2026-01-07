import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import Vendor from "../models/Vendor.js";
import ErrorResponse from "../utils/ErrorResponse.js";

// Authentication using Headers
const getVendorHeaders = asyncHandler(async (req, _, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      //decodes token id
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const vendor = await Vendor.findById(decoded.id).select(
        "_id role featured status verifiedBadge lastActive autoApprovePackages"
      );

      if (!vendor) {
        return next(new ErrorResponse(401, "Not authorized"));
      }

      const now = Date.now();

      // update only if 2 minutes old
      if (!vendor.lastActive || now - vendor.lastActive > 120000) {
        vendor.lastActive = Date.now();
        try {
          await vendor.save({ validateBeforeSave: false });
        } catch (err) {
          console.error("Error updating vendor lastActive:", err.message);
        }
      }

      req.vendor = vendor;

      next();
    } catch (error) {
      return next(new ErrorResponse(401, "Not authorized, token failed"));
    }
  }

  if (!token) {
    return next(new ErrorResponse(401, "Please login to access this route"));
  }
});

const getUserHeaders = asyncHandler(async (req, _, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new ErrorResponse(401, "Not authorized"));
      }

      if (!user.isActive) {
        return next(new ErrorResponse(403, "User account is inactive"));
      }

      req.user = user;
      next();
    } catch (error) {
      return next(new ErrorResponse(401, "Not authorized, token failed"));
    }
  }

  if (!token) {
    return next(new ErrorResponse(401, "Please login to access this route"));
  }
});

const getAdminCookies = asyncHandler(async (req, _, next) => {
  const token = req.cookies["adminToken"];

  if (!token) {
    return next(new ErrorResponse(401, "Not authorized"));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const vendor = await Vendor.findById(decoded.id).select(
    "_id role featured status verifiedBadge lastActive autoApprovePackages"
  );
  if (!vendor || vendor.role !== "admin") {
    return next(new ErrorResponse(401, "Not authorized"));
  }

  req.vendor = vendor;

  next();
});

export { getVendorHeaders, getUserHeaders, getAdminCookies };
