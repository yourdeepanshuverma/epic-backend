import jwt from "jsonwebtoken";
import { generateAccessToken } from "../utils/generateToken.js";
import Vendor from "../models/Vendor.js";
import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import User from "../models/User.js";

export const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new ErrorResponse(401, "Refresh token required"));
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    if (decoded.type !== "refresh") {
      return next(new ErrorResponse(401, "Invalid token type"));
    }

    const vendor = await Vendor.findById(decoded.id);

    if (!vendor || vendor.refreshToken !== refreshToken) {
      return next(new ErrorResponse(403, "Invalid refresh token"));
    }

    // Generate new access token ONLY
    const newAccessToken = generateAccessToken(vendor._id);

    res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    return next(new ErrorResponse(403, "Invalid or expired refresh token"));
  }
});


export const refreshAccessTokenUser = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new ErrorResponse(401, "Refresh token required"));
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    if (decoded.type !== "refresh") {
      return next(new ErrorResponse(401, "Invalid token type"));
    }

    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return next(new ErrorResponse(403, "Invalid refresh token"));
    }

    // Generate new access token ONLY
    const newAccessToken = generateAccessToken(user._id);

    res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    return next(new ErrorResponse(403, "Invalid or expired refresh token"));
  }
});