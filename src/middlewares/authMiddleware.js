import jwt from "jsonwebtoken";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import Vendor from "../models/Vendor.js";

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

      const vendor = await Vendor.findById(decoded.id);

      if (!vendor) {
        return next(new ErrorHandler(401, "Not authorized"));
      }

      if (vendor.status !== "active") {
        return next(new ErrorHandler(401, "Your vendor account is not active"));
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
      return next(new ErrorHandler(401, "Not authorized, token failed"));
    }
  }

  if (!token) {
    return next(new ErrorHandler(401, "Please login to access this route"));
  }
});

export { getVendorHeaders };
