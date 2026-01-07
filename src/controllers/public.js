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
import SystemSetting from "../models/SystemSetting.js";
import Blog from "../models/Blog.js"; // Added import
import axios from "axios";

// GET ALL VENUE CATEGORIES - public
export const getAllVenueCategories = asyncHandler(async (req, res) => {
  const categories = await VenueCategory.find()
    .select("name image slug description")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new SuccessResponse(200, "All venue categories", categories));
});

// GET ALL SERVICE CATEGORIES - public
export const getAllServiceCategories = asyncHandler(async (req, res) => {
  const categories = await ServiceCategory.find()
    .select("name image slug description")
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
      .select("name image slug description services")
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
  let {
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

  // 0. Normalize Location (Google Maps Geocoding)
  let structuredLocation = { city: "", state: "" };

  if (typeof location === "string" && location.trim().length > 0) {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        const geoRes = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json`,
          {
            params: { address: location, key: apiKey },
          }
        );

        if (geoRes.data.status === "OK" && geoRes.data.results.length > 0) {
          const components = geoRes.data.results[0].address_components;
          let city = "";
          let state = "";

          components.forEach((comp) => {
            if (comp.types.includes("locality")) city = comp.long_name;
            else if (
              !city &&
              comp.types.includes("administrative_area_level_2")
            )
              city = comp.long_name; // District as fallback

            if (comp.types.includes("administrative_area_level_1"))
              state = comp.long_name;
          });

          // If City found, use it. If not, fallback to original string in City field for searchability
          structuredLocation = {
            city: city || location,
            state: state,
            fullAddress: geoRes.data.results[0].formatted_address, // Save full address
          };
        } else {
          structuredLocation = {
            city: location,
            state: "",
            fullAddress: location,
          };
        }
      } else {
        // No API Key, treat string as city
        structuredLocation = {
          city: location,
          state: "",
          fullAddress: location,
        };
      }
    } catch (err) {
      console.error("Geocoding Error:", err.message);
      structuredLocation = { city: location, state: "", fullAddress: location };
    }
  } else if (typeof location === "object") {
    structuredLocation = location;
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

  try {
    const setting = await SystemSetting.findOne({ key: "lead_costs" });
    if (setting && setting.value) {
      const costs = setting.value;
      // Convert to array and sort by minBudget descending (highest criteria first)
      const tiers = Object.keys(costs)
        .map((key) => ({
          key,
          ...costs[key],
        }))
        .sort((a, b) => (b.minBudget || 0) - (a.minBudget || 0));

      for (const tier of tiers) {
        const tierMinBudget = Number(tier.minBudget) || 0;
        const tierMinGuests = Number(tier.minGuests) || 0;

        if (budgetNum >= tierMinBudget && guestNum >= tierMinGuests) {
          category =
            tier.label || tier.key.charAt(0).toUpperCase() + tier.key.slice(1);
          price = Number(tier.amount) || 50;
          if (tier.key === "elite" || tier.minBudget >= 1000000)
            tags.push("High Value");
          break; // Stop at the highest matching tier
        }
      }
    } else {
      // Fallback Logic
      if (budgetNum >= 1000000 || guestNum >= 500) {
        category = "Elite";
        price = 150;
        tags.push("High Value");
      } else if (budgetNum >= 300000 || guestNum >= 200) {
        category = "Premium";
        price = 100;
      }
    }
  } catch (err) {
    console.error("Error fetching lead rules:", err);
    // Fallback Logic
    if (budgetNum >= 1000000 || guestNum >= 500) {
      category = "Elite";
      price = 150;
      tags.push("High Value");
    } else if (budgetNum >= 300000 || guestNum >= 200) {
      category = "Premium";
      price = 100;
    }
  }

  // 3. Redact Contact Info from Message
  const cleanMessage = redactPhoneNumber(message);

  // 4. Determine Business Category Name (New logic to store type explicitly)
  let bizCat = "General Inquiry";
  try {
    if (interestedInPackage && packageType) {
      if (packageType === "VenuePackage") {
        const pkg = await VenuePackage.findById(interestedInPackage).populate(
          "venueCategory"
        );
        if (pkg && pkg.venueCategory) bizCat = pkg.venueCategory.name;
      } else if (packageType === "ServicePackage") {
        const pkg = await ServicePackage.findById(interestedInPackage).populate(
          "serviceSubCategory"
        );
        if (pkg && pkg.serviceSubCategory) bizCat = pkg.serviceSubCategory.name;
      }
    }
  } catch (err) {
    console.error("Error determining business category:", err);
  }

  // 5. Increment Inquiry Count for Package (Popularity Logic)
  if (interestedInPackage && packageType) {
    try {
      if (packageType === "VenuePackage") {
        await VenuePackage.findByIdAndUpdate(interestedInPackage, {
          $inc: { inquiryCount: 1 },
        });
      } else if (packageType === "ServicePackage") {
        await ServicePackage.findByIdAndUpdate(interestedInPackage, {
          $inc: { inquiryCount: 1 },
        });
      }
    } catch (err) {
      console.error("Error updating inquiry count:", err);
    }
  }

  const lead = await Lead.create({
    name,
    email,
    phone,
    location: structuredLocation,
    eventDate,
    guestCount,
    budget,
    message: cleanMessage,
    interestedInPackage,
    packageType,
    businessCategory: bizCat,
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

/* ======================================================
    PUBLIC: GET ALL BLOGS
====================================================== */
export const getPublicBlogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category, search } = req.query;

  const filter = {};

  if (category) filter.category = category;
  if (search) filter.title = { $regex: search, $options: "i" };

  const blogs = await Blog.find(filter)
    .populate("vendor", "vendorName profile")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Blog.countDocuments(filter);

  res.status(200).json(
    new SuccessResponse(200, "Public blogs fetched", {
      blogs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  );
});

/* ======================================================
    PUBLIC: GET SINGLE BLOG (By Slug)
====================================================== */
export const getPublicBlog = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;

  const blog = await Blog.findOne({ slug }).populate(
    "vendor",
    "vendorName profile"
  );

  if (!blog) {
    return next(new ErrorResponse(404, "Blog not found"));
  }

  res
    .status(200)
    .json(new SuccessResponse(200, "Public blog details", blog));
});

/* ======================================================
    PUBLIC: GET POPULAR VENUE PACKAGES
====================================================== */
export const getPopularVenuePackages = asyncHandler(async (req, res) => {
  const { limit = 8 } = req.query;

  const packages = await VenuePackage.find({
    approved: true,
    visibility: "public",
  })
    .sort({ inquiryCount: -1, createdAt: -1 })
    .limit(Number(limit))
    .populate("venueCategory")
    .populate("location.city")
    .populate("location.state")
    .populate("location.country")
    .select(
      "title slug featuredImage startingPrice location venueCategory inquiryCount reviews"
    );

  return res
    .status(200)
    .json(new SuccessResponse(200, "Popular venue packages", packages));
});

/* ======================================================
    PUBLIC: GET POPULAR SERVICE PACKAGES
====================================================== */
export const getPopularServicePackages = asyncHandler(async (req, res) => {
  const { limit = 8 } = req.query;

  const packages = await ServicePackage.find({
    approved: true,
    visibility: "public",
  })
    .sort({ inquiryCount: -1, createdAt: -1 })
    .limit(Number(limit))
    .populate("serviceSubCategory")
    .populate("location.city")
    .populate("location.state")
    .populate("location.country")
    .select(
      "title slug featuredImage startingPrice location serviceSubCategory inquiryCount reviews"
    );

  return res
    .status(200)
    .json(new SuccessResponse(200, "Popular service packages", packages));
});

/* ======================================================
    PUBLIC: GET PREMIUM VENUE PACKAGES
====================================================== */
export const getPremiumVenuePackages = asyncHandler(async (req, res) => {
  const { limit = 8 } = req.query;

  const packages = await VenuePackage.find({
    approved: true,
    visibility: "public",
    isPremium: true,
  })
    .sort({ inquiryCount: -1, createdAt: -1 }) // Sort by Popularity then Newest
    .limit(Number(limit))
    .populate("venueCategory")
    .populate("location.city")
    .populate("location.state")
    .populate("location.country")
    .select(
      "title slug featuredImage startingPrice location venueCategory inquiryCount reviews isPremium"
    );

  return res
    .status(200)
    .json(new SuccessResponse(200, "Premium venue packages", packages));
});

/* ======================================================
    PUBLIC: GET PREMIUM SERVICE PACKAGES
====================================================== */
export const getPremiumServicePackages = asyncHandler(async (req, res) => {
  const { limit = 8 } = req.query;

  const packages = await ServicePackage.find({
    approved: true,
    visibility: "public",
    isPremium: true,
  })
    .sort({ inquiryCount: -1, createdAt: -1 }) // Sort by Popularity then Newest
    .limit(Number(limit))
    .populate("serviceSubCategory")
    .populate("location.city")
    .populate("location.state")
    .populate("location.country")
    .select(
      "title slug featuredImage startingPrice location serviceSubCategory inquiryCount reviews isPremium"
    );

  return res
    .status(200)
    .json(new SuccessResponse(200, "Premium service packages", packages));
});