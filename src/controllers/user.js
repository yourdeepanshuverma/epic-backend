import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/User.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";
import generateToken from "../utils/generateToken.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { client } from "../config/googleClient.js";

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

  const token = generateToken(user._id);

  res.status(201).json(
    new SuccessResponse(201, "User registered successfully", {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profile: user.profile,
        role: user.role,
      },
      token,
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

  const token = generateToken(user._id);

  res.status(200).json(
    new SuccessResponse(200, "Login successful", {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profile: user.profile,
        role: user.role,
      },
      token,
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
  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new ErrorResponse(404, "User not found"));
  }

  const { fullName, phone } = req.body;

  if (fullName) user.fullName = fullName;
  if (phone) user.phone = phone;

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
  const { code } = req.body;

  if (!code) {
    return next(new ErrorResponse(400, "Google authorization code missing"));
  }

  // Exchange code for tokens
  const { tokens } = await client.getToken(code);

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
      await user.save();
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

  const token = generateToken(user._id);

  res.status(200).json(
    new SuccessResponse(200, "Login successful", {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profile: user.profile,
        role: user.role,
      },
      token,
    })
  );
});