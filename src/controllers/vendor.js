import Vendor from "../models/Vendor.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";

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

  return res
    .status(201)
    .json(new SuccessResponse(201, "Vendor created successfully", vendor));
});

/* ======================================================
   GET SINGLE VENDOR
====================================================== */
export const getVendor = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id)
    .populate("state")
    .populate("city");

  if (!vendor) return next(new ErrorResponse(404, "Vendor not found"));

  return res
    .status(200)
    .json(new SuccessResponse(200, "Vendor details", vendor));
});

/* ======================================================
   UPDATE VENDOR (Vendor Side)
====================================================== */
export const updateVendor = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id).select(
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

  req.body.documents = {
    ...(vendor.documents || {}),
    ...finalDocumentObj,
  };

  // Prevent vendor from updating protected admin fields
  const blockedFields = [
    "password",
    "wallet",
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
    .json(new SuccessResponse(200, "Vendor updated", vendor));
});

/* ======================================================
   ADMIN: UPDATE STATUS
====================================================== */
export const updateVendorStatus = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return next(new ErrorResponse(404, "Vendor not found"));

  vendor.status = req.body.status ?? vendor.status;
  vendor.featured = req.body.featured ?? vendor.featured;
  vendor.verifiedBadge = req.body.verifiedBadge ?? vendor.verifiedBadge;
  vendor.adminNotes = req.body.adminNotes ?? vendor.adminNotes;
  vendor.autoApprovePackages =
    req.body.autoApprovePackages ?? vendor.autoApprovePackages;

  await vendor.save();

  return res
    .status(200)
    .json(new SuccessResponse(200, "Vendor admin settings updated", vendor));
});

/* ======================================================
   DELETE VENDOR (Admin)
====================================================== */
export const deleteVendor = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) {
    return next(new ErrorResponse(404, "Vendor not found"));
  }

  await vendor.deleteOne();

  return res
    .status(200)
    .json(new SuccessResponse(200, "Vendor deleted successfully"));
});

/* ======================================================
   VENDOR LOGIN
====================================================== */
export const vendorLogin = asyncHandler(async (req, res, next) => {
  const { email, phone, password } = req.body;

  const vendor = await Vendor.findOne({
    $or: [{ email }, { phone }],
  }).select("+password");

  if (!vendor) return next(new ErrorResponse(401, "Invalid login details"));

  const correct = await vendor.isPasswordCorrect(password);
  if (!correct) return next(new ErrorResponse(401, "Invalid login details"));

  res
    .status(200)
    .cookie("vendor_token", generateToken(vendor._id), cookieOptions)
    .json(new SuccessResponse(200, "Login successful", vendor));
});
