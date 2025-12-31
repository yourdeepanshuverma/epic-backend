import asyncHandler from "../utils/asyncHandler.js";
import VenuePackage from "../models/VenuePackage.js";
import VenueCategory from "../models/VenueCategory.js"; // Added import
import ServiceCategory from "../models/ServiceCategory.js"; // Added import
import ServiceSubCategory from "../models/ServiceSubCategory.js"; // Added import
import SuccessResponse from "../utils/SuccessResponse.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import City from "../models/City.js";
import Lead from "../models/Lead.js"; // Added import
import ServicePackage from "../models/ServicePackage.js"; // Added import
import extractIdFromSlug from "../utils/extractIdFromSlug.js";
import mongoose from "mongoose"; // Added import
import { redactPhoneNumber } from "../utils/helper.js";

// GET ALL VENUE CATEGORIES - public
export const getAllVenueCategories = asyncHandler(async (req, res) => {
  const categories = await VenueCategory.find()
    .select("name image slug")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new SuccessResponse(200, "All venue categories", categories));
});

// GET ALL SERVICE CATEGORIES - public
export const getAllServiceCategories = asyncHandler(async (req, res) => {
  const categories = await ServiceCategory.find()
    .select("name image slug")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new SuccessResponse(200, "All service categories", categories));
});

// GET SERVICE SUB-CATEGORIES BY CATEGORY - public
export const getServiceSubCategoriesByCategory = asyncHandler(
  async (req, res) => {
    const { categoryId } = req.params;

    const subCategories = await ServiceSubCategory.find({
      serviceCategory: categoryId,
    })
      .select("name image slug services")
      .populate("services", "name icon");

    return res
      .status(200)
      .json(new SuccessResponse(200, "Sub-categories fetched", subCategories));
  }
);

// GET ALL VENUE PACKAGES - public
export const getAllVenuePackages = asyncHandler(async (req, res) => {
  const {
    category,
    city,
    isVerified,
    visibility,
    minPrice,
    maxPrice,
    spacePreferences,
  } = req.query;

  const filter = {};

  // CATEGORY FILTER
  if (category) filter.venueCategory = category;

  // DEFAULT: Only show approved and visible packages
  filter.approved = true;
  filter.visibility = "public";

  if (isVerified) filter.isVerified = isVerified;

  // CITY FILTER
  if (city) {
    if (mongoose.Types.ObjectId.isValid(city)) {
      filter["location.city"] = city;
    } else {
      const cityDoc = await City.findOne({ name: new RegExp(city, "i") });
      if (cityDoc) filter["location.city"] = cityDoc._id;
    }
  }

  // PRICE FILTER
  if (minPrice || maxPrice) {
    filter.startingPrice = {};
    if (minPrice) filter.startingPrice.$gte = Number(minPrice);
    if (maxPrice) filter.startingPrice.$lte = Number(maxPrice);
  }

  // SPACE PREFERENCES FILTER (Venue specific)
  if (spacePreferences) {
    const prefs = spacePreferences.split(",");
    filter["services.spacePreferences"] = { $in: prefs };
  }

  const packages = await VenuePackage.find(filter)
    .populate("venueCategory")
    .populate("location.city")
    .populate("location.state")
    .populate("location.country")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new SuccessResponse(200, "All venue packages", packages));
});

// GET ALL SERVICE PACKAGES - public
export const getAllServicePackages = asyncHandler(async (req, res) => {
  const { subCategory, city, minPrice, maxPrice } = req.query;

  const filter = {
    approved: true,
    visibility: "public",
  };

  if (subCategory) filter.serviceSubCategory = subCategory;

  if (city) {
    if (mongoose.Types.ObjectId.isValid(city)) {
      filter["location.city"] = city;
    } else {
      const cityDoc = await City.findOne({ name: new RegExp(city, "i") });
      if (cityDoc) filter["location.city"] = cityDoc._id;
    }
  }

  if (minPrice || maxPrice) {
    filter.startingPrice = {};
    if (minPrice) filter.startingPrice.$gte = Number(minPrice);
    if (maxPrice) filter.startingPrice.$lte = Number(maxPrice);
  }

  const packages = await ServicePackage.find(filter)
    .populate("serviceSubCategory")
    .populate("location.city")
    .populate("location.state")
    .populate("location.country")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new SuccessResponse(200, "All service packages", packages));
});

// GET SINGLE PACKAGE - public
export const getVenuePackage = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;
  const id = extractIdFromSlug(slug);

  const pkg = await VenuePackage.findById(id)
    .populate("venueCategory")
    .populate("location.city")
    .populate("location.state")
    .populate("location.country");

  if (!pkg) {
    return next(new ErrorResponse(404, "Venue package not found"));
  }

  return res
    .status(200)
    .json(new SuccessResponse(200, "Venue package details", pkg));
});

// GET SINGLE SERVICE PACKAGE - public
export const getServicePackage = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;
  const id = extractIdFromSlug(slug);

  const pkg = await ServicePackage.findById(id)
    .populate("serviceSubCategory")
    .populate("location.city")
    .populate("location.state")
    .populate("location.country");

  if (!pkg) {
    return next(new ErrorResponse(404, "Service package not found"));
  }

  return res
    .status(200)
    .json(new SuccessResponse(200, "Service package details", pkg));
});

/* ======================================================
    PUBLIC: CREATE LEAD (Website Inquiry)
====================================================== */
export const createLead = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    phone,
    location,
    eventDate,
    guestCount,
    budget,
    message,
    interestedInPackage,
    packageType,
  } = req.body;

  if (!name || !phone) {
    return next(new ErrorResponse(400, "Name and Phone are required"));
  }

  // 1. Detect Device Type
  const userAgent = req.headers["user-agent"] || "";
  let deviceType = "Unknown";
  const tags = [];

  if (/mobile/i.test(userAgent)) deviceType = "Mobile";
  else if (/tablet|ipad/i.test(userAgent)) deviceType = "Tablet";
  else deviceType = "Desktop";

  if (/iphone|ipad|macintosh/i.test(userAgent)) {
    tags.push("iOS User");
  }

  // 2. Auto Assign Category & Price
  let category = "Standard";
  let price = 50;

  const budgetNum = Number(budget) || 0;
  const guestNum = Number(guestCount) || 0;

  if (budgetNum >= 1000000 || guestNum >= 500) {
    category = "Elite";
    price = 150;
    tags.push("High Value");
  } else if (budgetNum >= 300000 || guestNum >= 200) {
    category = "Premium";
    price = 100;
  }

  // 3. Redact Contact Info from Message
  const cleanMessage = redactPhoneNumber(message);

  const lead = await Lead.create({
    name,
    email,
    phone,
    location,
    eventDate,
    guestCount,
    budget,
    message: cleanMessage,
    interestedInPackage,
    packageType,
    category,
    price,
    deviceType,
    tags,
  });

  // TODO: Notify vendors (Optional future step)

  res
    .status(201)
    .json(new SuccessResponse(201, "Inquiry submitted successfully", lead));
});
