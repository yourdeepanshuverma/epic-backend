import { client } from "../config/googleClient.js";
import Vendor, { STATUSES } from "../models/Vendor.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import {
  generateAccessToken,
  generateRefreshToken
} from "../utils/generateToken.js";
import sendEmail from "../utils/sendEmail.js";
import SuccessResponse from "../utils/SuccessResponse.js";
import redis from "../config/redisClient.js";
import { generateOtp } from "../utils/helper.js";
import { sendOtpSms } from "../utils/smsService.js";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/* ======================================================
   CREATE VENDOR
   (Admin or Vendor Registration)


   Sample fronted payload:
{
  "vendorName": "The Royal Venue",                  // REQUIRED * Vendor Name/Company Name
  "profile": File                                   // REQUIRED * Profile Image/Company Logo

  "password": "Test@123",                           // REQUIRED (only for registration)

  "experience": 5,                                  // REQUIRED
  "teamSize": 20,                                   // OPTIONAL
  "workingSince": 2018,                             // REQUIRED

  "state": "6723bc9f9321aa423b55d821",              // REQUIRED
  "city": "6723bd209321aa423b55d839",               // REQUIRED
  "locality": "South Delhi",                        // REQUIRED
  "address": "123 ABC Road, South Delhi",           // REQUIRED
  "pincode": "110030",                              // OPTIONAL
  "googleMapLink": "https://goo.gl/maps/xyz123",    // OPTIONAL

  "coverImage": File,                               // OPTIONAL

  "documents": {                                    // OPTIONAL (each field optional)
    "gst": File,
    "pan": File,
    "idProof": File,
    "registrationProof": File
  },

  "contactPerson": "Rahul Sharma",                  // REQUIRED
  "phone": "9876543210",                            // REQUIRED
  "email": "vendor@gmail.com",                      // REQUIRED
  "website": "https://vendor-website.com"           // OPTIONAL
}


====================================================== */
export const createVendor = asyncHandler(async (req, res, next) => {
  const {
    vendorName,
    password,
    experience,
    teamSize,
    workingSince,
    state,
    city,
    locality,
    address,
    pincode,
    googleMapLink,
    latitude,     
    longitude,    
    contactPerson,
    phone,
    email,
    website,
  } = req.body;

  if (!vendorName || !password || !email || !phone) {
    return next(new ErrorResponse(400, "Required fields missing"));
  }

  const emailExists = await Vendor.exists({ email });
  if (emailExists) {
    return next(
      new ErrorResponse(400, "Vendor with this email already exists")
    );
  }

  const phoneExists = await Vendor.exists({ phone });
  if (phoneExists) {
    return next(
      new ErrorResponse(400, "Vendor with this phone already exists")
    );
  }

  if (!req.files || !req.files?.profile?.[0]) {
    return next(new ErrorResponse(400, "Profile image is required"));
  }

  const uploadedProfile = await uploadToCloudinary([req.files?.profile?.[0]]);
  const profile = uploadedProfile[0];

  let coverImage = null;
  if (req.files?.coverImage?.[0]) {
    const uploadedCoverImage = await uploadToCloudinary([
      req.files.coverImage?.[0],
    ]);
    coverImage = uploadedCoverImage[0];
  }

  let documents = {};
  const docs = req.files;

  const filesToUpload = [];
  const fileKeyMap = [];

  if (docs["documents[gst]"]) {
    filesToUpload.push(docs["documents[gst]"][0]);
    fileKeyMap.push("gst");
  }
  if (docs["documents[pan]"]) {
    filesToUpload.push(docs["documents[pan]"][0]);
    fileKeyMap.push("pan");
  }
  if (docs["documents[idProof]"]) {
    filesToUpload.push(docs["documents[idProof]"][0]);
    fileKeyMap.push("idProof");
  }
  if (docs["documents[registrationProof]"]) {
    filesToUpload.push(docs["documents[registrationProof]"][0]);
    fileKeyMap.push("registrationProof");
  }

  const uploadedResults = await uploadToCloudinary(filesToUpload);

  const finalDocumentObj = {};
  uploadedResults.forEach((upload, index) => {
    const key = fileKeyMap[index];
    finalDocumentObj[key] = upload;
  });

  documents = finalDocumentObj;

  let location = undefined;

  if (latitude && longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return next(new ErrorResponse(400, "Invalid latitude or longitude"));
    }

    location = {
      type: "Point",
      coordinates: [lng, lat], //  [longitude, latitude]
    };
  }

  const vendor = await Vendor.create({
    vendorName,
    profile,
    password,
    experience,
    teamSize,
    workingSince,
    state,
    city,
    locality,
    address,
    pincode,
    googleMapLink,
    location, 
    coverImage,
    documents,
    contactPerson,
    phone,
    email,
    website,
  });

  if (!vendor) {
    await deleteFromCloudinary([
      profile,
      coverImage,
      ...Object.values(documents),
    ]);
  }

  const accessToken = generateAccessToken(vendor._id);
  const refreshToken = generateRefreshToken(vendor._id);
  vendor.refreshToken = refreshToken;
  await vendor.save({ validateBeforeSave: false });

  res.status(201).json(
    new SuccessResponse(
      201,
      `Vendor ${vendor.vendorName} created successfully`,
      { vendor, accessToken}
    )
  );

  await sendEmail(
    vendor.email,
    "Vendor Registration Successful",
    `
    <h3>Dear ${vendor.vendorName},</h3>
    <p>We are excited to have you on board!</p>
    <p>Your vendor account has been successfully created.</p>
    <p>Your login email: ${vendor.email}</p>
    <p>Your login phone: ${vendor.phone}</p>
    <p>Your password: ${password}</p>
    <p>You can now log in and start using our services.</p>
    <br/>
    <p>Best Regards,<br/>Epic Team</p>
  `
  );
});

/* ======================================================
   GET SINGLE VENDOR
====================================================== */
export const getVendorProfile = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.vendor?._id).select(
    "-password -featured -status -verifiedBadge -adminNotes -autoApprovePackages -lastActive -__v"
  );

  if (!vendor) return next(new ErrorResponse(404, "Vendor not found"));

  return res
    .status(200)
    .json(new SuccessResponse(200, "Vendor details", vendor));
});

/* ======================================================
   UPDATE VENDOR
====================================================== */
export const updateVendor = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.vendor?._id).select(
    "-password -wallet -featured -status -verifiedBadge -adminNotes -autoApprovePackages -__v"
  );
  if (!vendor) return next(new ErrorResponse(404, "Vendor not found"));

  if (req.files?.profile?.[0]) {
    const uploadedProfile = await uploadToCloudinary([req.files?.profile?.[0]]);
    req.body.profile = uploadedProfile[0];
  }
  if (req.files?.coverImage?.[0]) {
    const uploadedCoverImage = await uploadToCloudinary([
      req.files.coverImage?.[0],
    ]);
    req.body.coverImage = uploadedCoverImage[0];
  }

  const docs = req.files || {};

  const filesToUpload = [];
  const fileKeyMap = [];

  if (docs["documents[gst]"]) {
    filesToUpload.push(docs["documents[gst]"][0]);
    fileKeyMap.push("gst");
  }
  if (docs["documents[pan]"]) {
    filesToUpload.push(docs["documents[pan]"][0]);
    fileKeyMap.push("pan");
  }
  if (docs["documents[idProof]"]) {
    filesToUpload.push(docs["documents[idProof]"][0]);
    fileKeyMap.push("idProof");
  }
  if (docs["documents[registrationProof]"]) {
    filesToUpload.push(docs["documents[registrationProof]"][0]);
    fileKeyMap.push("registrationProof");
  }

  if (filesToUpload.length > 0) {
    const uploadedResults = await uploadToCloudinary(filesToUpload);

    const finalDocumentObj = {};
    uploadedResults.forEach((upload, index) => {
      const key = fileKeyMap[index];
      finalDocumentObj[key] = upload;
    });

    req.body.documents = {
      ...(vendor.documents || {}),
      ...finalDocumentObj,
    };
  }

  // Prevent vendor from updating protected admin fields
  const blockedFields = [
    "password",
    "wallet",
    "role",
    "featured",
    "status",
    "verifiedBadge",
    "featured",
    "adminNotes",
    "autoApprovePackages",
  ];
  blockedFields.forEach((field) => delete req.body[field]);

  Object.assign(vendor, req.body);

  await vendor.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new SuccessResponse(200, "Vendor profile updated", vendor));
});

/* ======================================================
   PHONE UPDATE OTP FLOW
====================================================== */
export const sendPhoneUpdateOtp = asyncHandler(async (req, res, next) => {
  const { phone } = req.body;
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    return next(new ErrorResponse(400, "Invalid phone number"));
  }

  // Check if phone is already used by another vendor
  const existingVendor = await Vendor.findOne({ phone });
  if (existingVendor) {
    return next(new ErrorResponse(400, "Phone number already in use"));
  }

  // Prevent spamming
  if (await redis.get(`phone_update_otp:${req.vendor._id}`)) {
    return next(new ErrorResponse(400, "OTP already sent. Please wait."));
  }

  const otp = generateOtp();
  // Store OTP with new phone in redis (expires in 5m)
  // Format: "OTP:NEW_PHONE"
  await redis.setex(
    `phone_update_otp:${req.vendor._id}`,
    300,
    `${otp}:${phone}`
  );

  await sendOtpSms(phone, otp, "phone number update");

  return res
    .status(200)
    .json(new SuccessResponse(200, "OTP sent successfully"));
});

export const verifyPhoneUpdateOtp = asyncHandler(async (req, res, next) => {
  const { otp } = req.body;
  const storedData = await redis.get(`phone_update_otp:${req.vendor._id}`);

  if (!storedData) {
    return next(new ErrorResponse(400, "OTP expired or invalid"));
  }

  const [storedOtp, newPhone] = storedData.split(":");

  if (storedOtp !== otp) {
    return next(new ErrorResponse(400, "Invalid OTP"));
  }

  // Update vendor phone
  const vendor = await Vendor.findById(req.vendor._id);
  vendor.phone = newPhone;
  await vendor.save();

  await redis.del(`phone_update_otp:${req.vendor._id}`);

  return res
    .status(200)
    .json(new SuccessResponse(200, "Phone number updated successfully"));
});

/* ======================================================
    GET VENDOR WALLET BALANCE
====================================================== */
export const getVendorWalletBalance = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.vendor?._id).select("wallet");
  if (!vendor) return next(new ErrorResponse(404, "Vendor not found"));
  return res.status(200).json(
    new SuccessResponse(200, "Vendor wallet balance", {
      balance: vendor?.wallet?.balance,
    })
  );
});

/* ======================================================
    GET VENDOR WALLET TRANSACTIONS
====================================================== */
export const getVendorWalletTransactions = asyncHandler(
  async (req, res, next) => {
    const vendor = await Vendor.findById(req.vendor?._id)
      .select("wallet")
      .populate({
        path: "wallet.transactions",
        options: { sort: { createdAt: -1 } },
      });
    if (!vendor) return next(new ErrorResponse(404, "Vendor not found"));

    return res.status(200).json(
      new SuccessResponse(200, "Vendor wallet transactions", {
        transactions: vendor.wallet.transactions,
      })
    );
  }
);

/* ======================================================
   VENDOR LOGIN
====================================================== */
export const vendorLogin = asyncHandler(async (req, res, next) => {
  const { email, phone, password } = req.body;

  const vendor = await Vendor.findOne({
    $or: [{ email }, { phone }],
  }).select("+password");

  if (!vendor || !(await vendor.isPasswordCorrect(password))) {
    return next(new ErrorResponse(401, "Invalid login details"));
  }

  const accessToken = generateAccessToken(vendor._id);
  const refreshToken = generateRefreshToken(vendor._id);
  vendor.refreshToken = refreshToken;
  await vendor.save({ validateBeforeSave: false });

  if (vendor.role === "admin") {
    return res.status(200).json(
      new SuccessResponse(200, "Welcome Admin", {
        vendor,
        accessToken,
      })
    );
  }

  return res
    .status(200)
    .json(new SuccessResponse(200, "Login successful", { vendor, accessToken }));
});

/* // Google OAuth Callback response format
  //  RESPONSE if VENDOR EXISTS (CASE 1):
{
  "status": 200,
  "message": "Login successful",
  "data": {
    "token": "jwt-token-here",
    "vendor": {
      "_id": "123",
      "vendorName": "Royal Banquet",
      "email": "vendor@gmail.com"
    }
  }
}

  //  RESPONSE if VENDOR DOES NOT EXIST (CASE 2):
{
  "status": 200,
  "message": "Vendor not found",
  "data": {
    "googleData": {
      "vendorName": "Rahul Sharma",
      "email": "rahul@gmail.com"
    },
    "isNewVendor": true
  }
}
*/
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
    vendorName: payload.name,
    email: payload.email,
  };

  // Check if vendor exists
  const vendor = await Vendor.findOne({ email: googleData.email });

  if (vendor) {
    const accessToken = generateAccessToken(vendor._id);
    const refreshToken = generateRefreshToken(vendor._id);
    vendor.refreshToken = refreshToken;
    await vendor.save({ validateBeforeSave: false });
    return res.status(200).json(
      new SuccessResponse(200, "Login successful", {
        accessToken,
        vendor,
      })
    );
  }

  // Vendor not found → send Google basic data for signup
  return res.status(200).json(
    new SuccessResponse(200, "Vendor not registered", {
      isNewVendor: true,
      googleData,
    })
  );
});

/* ======================================================
   FORGOT PASSWORD FLOW
====================================================== */

// Forget password - send OTP
export const sendForgotPasswordOtp = asyncHandler(async (req, res, next) => {
  const { phone } = req.body;

  if (!phone || !/^[6-9]\d{9}$/.test(phone))
    return next(new ErrorResponse(400, "Invalid phone number"));

  const vendor = await Vendor.findOne({ phone });
  if (!vendor) return next(new ErrorResponse(404, "Vendor not found"));

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
  await redis.setex(`resetVendorToken:${phone}`, 600, "verified"); // 10 min reset token

  res
    .status(200)
    .json(
      new SuccessResponse(200, "OTP verified, you may now reset your password.")
    );
});

// Reset password
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { phone, newPassword } = req.body;

  const verified = await redis.get(`resetVendorToken:${phone}`);

  if (!verified)
    return next(
      new ErrorResponse(403, "Session expired. Please reverify OTP.")
    );

  const vendor = await Vendor.findOne({phone });
  if (!vendor) return next(new ErrorResponse(404, "Vendor not found"));

  vendor.password = newPassword;
  await vendor.save();

  await redis.del(`resetVendorToken:${phone}`); // invalidate token
  res.status(200).json(new SuccessResponse(200, "Password reset successfully"));
});

/* ======================================================
   GET ALL VENDORS (Admin)
====================================================== */
export const getAllVendors = asyncHandler(async (req, res, next) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }

  // Query params
  const { status, page = 1, limit = 10 } = req.query;

  // console.log("Backend: Received req.query:", req.query);

  const filter = {};

  // Status filtering (existing logic)
  if (status && STATUSES.includes(status)) {
    filter.status = status;
  } else if (status && status !== "all") {
    return next(new ErrorResponse(400, "Invalid vendor status provided."));
  }

  // console.log("Backend: Applied filter:", filter);

  const pageNumber = Math.max(1, parseInt(page));
  const limitNumber = Math.max(1, parseInt(limit));
  const skip = (pageNumber - 1) * limitNumber;

  // Fetch paginated vendors
  const vendors = await Vendor.find(filter)
    .populate("state")
    .populate("city")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNumber);

  // Total count for pagination metadata
  const totalVendors = await Vendor.countDocuments(filter);

  const totalPages = Math.ceil(totalVendors / limitNumber);

  return res.status(200).json(
    new SuccessResponse(200, "All vendors fetched", {
      vendors,
      pagination: {
        total: totalVendors,
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    })
  );
});

/* ======================================================
   GET SINGLE VENDOR (Admin)
====================================================== */
export const getVendorById = asyncHandler(async (req, res, next) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }
  const vendor = await Vendor.findById(req.params.id);

  if (!vendor) return next(new ErrorResponse(404, "Vendor not found"));

  return res
    .status(200)
    .json(new SuccessResponse(200, "Vendor details", vendor));
});

/* ======================================================
    UPDATE VENDOR ADMIN SETTINGS
====================================================== */
export const updateVendorStatus = asyncHandler(async (req, res, next) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }
  const { status } = req.body;
  if (!STATUSES.includes(status)) {
    return next(new ErrorResponse(400, "Invalid status value"));
  }

  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return next(new ErrorResponse(404, "Vendor not found"));
  vendor.status = req.body.status ?? vendor.status;
  await vendor.save();

  return res
    .status(200)
    .json(new SuccessResponse(200, `Vendor status updated to ${status}`));
});

/* ======================================================
   TOGGLE FEATURED VENDOR (Admin)
====================================================== */
export const toggleFeaturedVendor = asyncHandler(async (req, res, next) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return next(new ErrorResponse(404, "Vendor not found"));
  vendor.featured = !vendor.featured;
  await vendor.save();

  return res
    .status(200)
    .json(
      new SuccessResponse(
        200,
        `${vendor.featured ? "Vendor marked as featured" : "Vendor unfeatured"}`
      )
    );
});

/* ======================================================
    TOGGLE VERIFY BADGE (Admin)
====================================================== */
export const toggleVerifyBadge = asyncHandler(async (req, res, next) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return next(new ErrorResponse(404, "Vendor not found"));
  vendor.verifiedBadge = !vendor.verifiedBadge;
  await vendor.save();

  return res
    .status(200)
    .json(
      new SuccessResponse(
        200,
        `${
          vendor.verifiedBadge
            ? "Verified badge granted to vendor"
            : "Verified badge removed from vendor"
        }`
      )
    );
});

/* ======================================================
    UPDATE VENDOR ADMIN NOTES (Admin)
====================================================== */
export const updateAdminNotesForVendor = asyncHandler(
  async (req, res, next) => {
    const isAdmin = req.vendor && req.vendor.role === "admin";

    if (!isAdmin) {
      return next(new ErrorResponse(403, "Access denied. Admins only."));
    }
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return next(new ErrorResponse(404, "Vendor not found"));
    vendor.adminNotes = req.body.adminNotes ?? vendor.adminNotes;
    await vendor.save();

    return res
      .status(200)
      .json(new SuccessResponse(200, "Vendor admin notes updated"));
  }
);

/* ======================================================
   TOGGLE AUTO-APPROVE PACKAGES SETTING (Admin)
====================================================== */
export const toggleAutoApprovePackages = asyncHandler(
  async (req, res, next) => {
    const isAdmin = req.vendor && req.vendor.role === "admin";

    if (!isAdmin) {
      return next(new ErrorResponse(403, "Access denied. Admins only."));
    }
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return next(new ErrorResponse(404, "Vendor not found"));
    vendor.autoApprovePackages = !vendor.autoApprovePackages;
    await vendor.save();
    return res
      .status(200)
      .json(
        new SuccessResponse(
          200,
          `${
            vendor.autoApprovePackages
              ? "Auto-approve packages enabled"
              : "Auto-approve packages disabled"
          }`
        )
      );
  }
);

/* ======================================================
   DELETE VENDOR (Admin)
====================================================== */
export const deleteVendor = asyncHandler(async (req, res, next) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }

  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) {
    return next(new ErrorResponse(404, "Vendor not found"));
  }

  await deleteFromCloudinary([
    vendor.profile,
    vendor.coverImage,
    ...Object.values(vendor.documents),
  ]);
  await vendor.deleteOne();

  return res
    .status(200)
    .json(
      new SuccessResponse(
        200,
        `Vendor ${vendor.vendorName} deleted successfully`
      )
    );
});

/* ======================================================
   UPDATE VENDOR DETAILS (Admin)
====================================================== */
export const updateVendorDetailsByAdmin = asyncHandler(async (req, res, next) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }
  const { id } = req.params;
  const vendor = await Vendor.findById(id);

  if (!vendor) {
    return next(new ErrorResponse(404, "Vendor not found"));
  }

  const payload = req.body;
  
  // Handle profile image update
  if (req.files?.profile?.[0]) {
    if (vendor.profile?.public_id) {
      await deleteFromCloudinary([vendor.profile]);
    }
    const uploadedProfile = await uploadToCloudinary([req.files?.profile?.[0]]);
    payload.profile = uploadedProfile[0];
  }

  // Handle cover image update
  if (req.files?.coverImage?.[0]) {
    if (vendor.coverImage?.public_id) {
      await deleteFromCloudinary([vendor.coverImage]);
    }
    const uploadedCoverImage = await uploadToCloudinary([req.files.coverImage?.[0]]);
    payload.coverImage = uploadedCoverImage[0];
  }

  // Handle document updates (gst, pan, idProof, registrationProof)
  const docs = req.files;
  const filesToUpload = [];
  const fileKeyMap = [];

  if (docs["documents[gst]"]) { filesToUpload.push(docs["documents[gst]"][0]); fileKeyMap.push("gst"); }
  if (docs["documents[pan]"]) { filesToUpload.push(docs["documents[pan]"][0]); fileKeyMap.push("pan"); }
  if (docs["documents[idProof]"]) { filesToUpload.push(docs["documents[idProof]"][0]); fileKeyMap.push("idProof"); }
  if (docs["documents[registrationProof]"]) { filesToUpload.push(docs["documents[registrationProof]"][0]); fileKeyMap.push("registrationProof"); }

  if (filesToUpload.length > 0) {
      const uploadedResults = await uploadToCloudinary(filesToUpload);
      const finalDocumentObj = {};
      uploadedResults.forEach((upload, index) => {
        const key = fileKeyMap[index];
        finalDocumentObj[key] = upload;
      });
      payload.documents = {
        ...(vendor.documents || {}), // Preserve existing documents if not replaced
        ...finalDocumentObj,
      };
  }

  // Prevent admin from updating certain sensitive/protected fields via this endpoint
  const blockedFields = [
    "password", // Password should have its own separate change mechanism
    "email", // Email changes should involve verification
    "phone", // Phone changes should involve OTP verification
    "wallet",
    "role",
    "status", // Status should be updated via updateVendorStatus controller
    "featured", // Featured status should be updated via toggleFeaturedVendor
    "verifiedBadge", // Verified badge should be updated via toggleVerifyBadge
    "adminNotes", // Admin notes should be updated via updateAdminNotesForVendor
    "autoApprovePackages", // Auto-approve should be updated via toggleAutoApprovePackages
  ];
  blockedFields.forEach((field) => delete payload[field]);

  // Update vendor with new data
  Object.assign(vendor, payload);

  await vendor.save({ validateBeforeSave: false }); // Validate only specific fields, not everything.

  return res.status(200).json(new SuccessResponse(200, "Vendor details updated successfully by admin.", vendor));
});
