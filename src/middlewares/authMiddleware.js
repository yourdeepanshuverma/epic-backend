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
        "_id featured status verifiedBadge lastActive autoApprovePackages"
      );

      if (!vendor) {
        return next(new ErrorResponse(401, "Not authorized"));
      }

      const now = Date.now();

      // update only if 2 minutes old
      if (!vendor.lastActive || now - vendor.lastActive > 120000) {
        vendor.lastActive = Date.now();
      }

      await vendor.save({ validateBeforeSave: false });

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

export { getVendorHeaders };
