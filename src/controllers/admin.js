import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";

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
