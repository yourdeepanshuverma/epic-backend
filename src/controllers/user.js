import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/User.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";
import {generateAccessToken,generateRefreshToken} from "../utils/generateToken.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { client } from "../config/googleClient.js";

import redis from "../config/redisClient.js";
import { generateOtp } from "../utils/helper.js";
import { sendOtpSms } from "../utils/smsService.js";
import Vendor from "../models/Vendor.js";
import VenuePackage from "../models/VenuePackage.js";

// @desc    Register a new user
// @route   POST /api/v1/user/register
// @access  Public
export const registerUser = asyncHandler(async (req, res, next) => {
  const { fullName, email, password, phone } = req.body;

  if (!fullName || !email || !password) {
    return next(new ErrorResponse(400, "Please provide all required fields"));
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new ErrorResponse(400, "User already exists"));
  }

  let profile = {
    public_id: "default_user",
    url: "https://res.cloudinary.com/demo/image/upload/v1570979139/book_covers/default_user.jpg",
  };

  if (req.file) {
    const uploaded = await uploadToCloudinary([req.file]);
    if (uploaded && uploaded.length > 0) {
      profile = {
        public_id: uploaded[0].public_id,
        url: uploaded[0].url,
      };
    }
  }

  const user = await User.create({
    fullName,
    email,
    password,
    phone,
    profile,
  });

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });


  res.status(201).json(
    new SuccessResponse(201, "User registered successfully", {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profile: user.profile,
        role: user.role,
        refreshToken: user.refreshToken,
      },
      accessToken,
    })
  );
});

// @desc    Login user
// @route   POST /api/v1/user/login
// @access  Public
export const loginUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse(400, "Please provide email and password"));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorResponse(401, "Invalid credentials"));
  }

  const isMatch = await user.isPasswordCorrect(password);

  if (!isMatch) {
    return next(new ErrorResponse(401, "Invalid credentials"));
  }

  if (!user.isActive) {
    return next(new ErrorResponse(403, "Your account is inactive"));
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.status(200).json(
    new SuccessResponse(200, "Login successful", {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profile: user.profile,
        role: user.role,
        refreshToken: user.refreshToken,
      },
      accessToken,
    })
  );
});

// @desc    Get user profile
// @route   GET /api/v1/user/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new ErrorResponse(404, "User not found"));
  }

  res.status(200).json(new SuccessResponse(200, "User profile", user));
});

// @desc    Update user profile
// @route   PUT /api/v1/user/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id); // Use :id since admin route

  if (!user) {
    return next(new ErrorResponse(404, "User not found"));
  }

  const { fullName, phone, isActive } = req.body;

  // Update basic fields
  if (fullName !== undefined) user.fullName = fullName;
  if (phone !== undefined) user.phone = phone;

  if (isActive !== undefined) {
    if (typeof isActive !== "boolean") {
      return next(new ErrorResponse(400, "isActive must be true or false"));
    }
    user.isActive = isActive;
  }

  // Profile image upload (existing logic)
  if (req.file) {
    const uploaded = await uploadToCloudinary([req.file]);
    if (uploaded && uploaded.length > 0) {
      user.profile = {
        public_id: uploaded[0].public_id,
        url: uploaded[0].url,
      };
    }
  }

  await user.save();

  res.status(200).json(new SuccessResponse(200, "Profile updated", user));
});

// @desc    Google Login/Signup
// @route   POST /api/v1/user/google-auth
// @access  Public
export const googleAuth = asyncHandler(async (req, res, next) => {
  const { code, redirect_uri } = req.body;

  if (!code) {
    return next(new ErrorResponse(400, "Google authorization code missing"));
  }

  try {
    // Exchange code for tokens (support dynamic redirect_uri if provided)
    const { tokens } = await client.getToken({
      code,
      redirect_uri: redirect_uri || "postmessage",
    });

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const googleData = {
      googleId: payload.sub,
      fullName: payload.name,
      email: payload.email,
      profilePic: payload.picture,
    };

    // Check if user exists by email
    let user = await User.findOne({ email: googleData.email });

    if (user) {
      // If user exists but doesn't have googleId (was registered via email/password), link it
      if (!user.googleId) {
        user.googleId = googleData.googleId;
        // Skip validation to avoid password required error on existing docs if any schema issue
        await user.save({ validateBeforeSave: false });
      }
    } else {
      // New user -> Create account
      user = await User.create({
        fullName: googleData.fullName,
        email: googleData.email,
        googleId: googleData.googleId,
        profile: {
          public_id: "google_profile",
          url: googleData.profilePic,
        },
      });
    }

    if (!user.isActive) {
      return next(new ErrorResponse(403, "Your account is inactive"));
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(200).json(
      new SuccessResponse(200, "Login successful", {
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          profile: user.profile,
          role: user.role,
        },
        accessToken,
        refreshToken,
      })
    );
  } catch (error) {
    console.error("Google Auth Error:", error?.response?.data || error.message);
    return next(
      new ErrorResponse(
        400,
        error?.response?.data?.error_description ||
          error.message ||
          "Google authentication failed"
      )
    );
  }
});


// Send forget OTP
// Forget password - send OTP
export const sendForgotPasswordOtp = asyncHandler(async (req, res, next) => {
  const { phone } = req.body;

  if (!phone || !/^[6-9]\d{9}$/.test(phone))
    return next(new ErrorResponse(400, "Invalid phone number"));

  const user = await User.findOne({ phone });
  if (!user) return next(new ErrorResponse(404, "User not found"));

  // Prevent resending too fast
  if (await redis.get(`forget_password_otp:${phone}`)) {
    return next(new ErrorResponse(400, "OTP already sent. Please wait."));
  }

  const otp = generateOtp();
  await redis.setex(`forget_password_otp:${phone}`, 300, otp); // expires in 5 min

  await sendOtpSms(phone, otp, "password reset");
  res.status(200).json(new SuccessResponse(200, "OTP sent successfully"));
});

// Verify OTP for forget password
export const verifyForgotPasswordOtp = asyncHandler(async (req, res, next) => {
  const { phone, otp } = req.body;

  const storedOtp = await redis.get(`forget_password_otp:${phone}`);
  if (!storedOtp) return next(new ErrorResponse(400, "OTP expired or invalid"));
  if (storedOtp !== otp) return next(new ErrorResponse(400, "Invalid OTP"));

  // OTP verified → allow user to reset password
  await redis.del(`forget_password_otp:${phone}`);
  await redis.setex(`resetUserToken:${phone}`, 600, "verified"); // 10 min reset token

  res
    .status(200)
    .json(
      new SuccessResponse(200, "OTP verified, you may now reset your password.")
    );
});

// Reset password
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { phone, newPassword } = req.body;

  const verified = await redis.get(`resetUserToken:${phone}`);

  if (!verified)
    return next(
      new ErrorResponse(403, "Session expired. Please reverify OTP.")
    );

  const user = await User.findOne({ phone });
  if (!user) return next(new ErrorResponse(404, "User not found"));

  user.password = newPassword;
  await user.save();

  await redis.del(`resetUserToken:${phone}`); // invalidate token
  res.status(200).json(new SuccessResponse(200, "Password reset successfully"));
});


// search vendor near me
export const searchNearMe = asyncHandler(async (req, res, next) => {
  let { latitude, longitude, radius = 10, page = 1, limit = 10 } = req.query;

  if (!latitude || !longitude) {
    return next(new ErrorResponse(400, "Latitude and Longitude are required"));
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  const radiusInMeters = parseFloat(radius) * 1000;

  const pageNumber = Math.max(1, parseInt(page));
  const limitNumber = Math.max(1, parseInt(limit));
  const skip = (pageNumber - 1) * limitNumber;

  const vendors = await Vendor.find({
    status: "active",
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        $maxDistance: radiusInMeters,
      },
    },
  })
    // .select("-password")
    .select("vendorName profile location city state featured verifiedBadge slug")
    .skip(skip)
    .limit(limitNumber);

  const total = await Vendor.countDocuments({
    status: "active",
    location: {
      $geoWithin: {
        $centerSphere: [
          [lng, lat],
          radiusInMeters / 6378137, // meters → radians
        ],
      },
    },
  });

  const totalPages = Math.ceil(total / limitNumber);

  res.status(200).json(
    new SuccessResponse(200, "Nearby vendors fetched", {
      vendors,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        radiusKm: parseFloat(radius),
      },
    })
  );
});

// search venue ear me
export const searchNearMeVenue = asyncHandler(async (req, res, next) => {
  let { latitude, longitude, radius = 10, page = 1, limit = 10 } = req.query;

  if (!latitude || !longitude) {
    return next(new ErrorResponse(400, "Latitude and Longitude are required"));
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  const radiusInMeters = parseFloat(radius) * 1000;

  const pageNumber = Math.max(1, parseInt(page));
  const limitNumber = Math.max(1, parseInt(limit));
  const skip = (pageNumber - 1) * limitNumber;

  const venue = await VenuePackage.find({
    visibility: "public" ,
    geo_loc: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        $maxDistance: radiusInMeters,
      },
    },
  })
    // .select("-password")
    .select("title featureImage description startingPrice location")
    .skip(skip)
    .limit(limitNumber);

  const total = await VenuePackage.countDocuments({
    visibility: "public" ,
    geo_loc: {
      $geoWithin: {
        $centerSphere: [
          [lng, lat],
          radiusInMeters / 6378137, // meters → radians
        ],
      },
    },
  });

  const totalPages = Math.ceil(total / limitNumber);

  res.status(200).json(
    new SuccessResponse(200, "Nearby vendors fetched", {
      venue,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        radiusKm: parseFloat(radius),
      },
    })
  );
});