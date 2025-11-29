import asyncHandler from "../utils/asyncHandler.js";
import VenuePackage from "../models/VenuePackage.js";
import SuccessResponse from "../utils/SuccessResponse.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import City from "../models/City.js";
import extractIdFromSlug from "../utils/extractIdFromSlug.js";

// GET ALL CATEGORIES - public
export const getAllVenueCategories = asyncHandler(async (req, res) => {
  const categories = await VenueCategory.find()
    .select("name image")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new SuccessResponse(200, "All venue categories", categories));
});

// GET ALL PACKAGES (with filters optional) - public
const getAllVenuePackages = asyncHandler(async (req, res) => {
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
  // VERIFICATION FILTER
  if (isVerified) filter.isVerified = isVerified;
  // VISIBILITY FILTER
  if (visibility) filter.visibility = visibility;

  // CITY FILTER
  if (city) {
    // if city is valid ObjectId → direct filter
    if (mongoose.Types.ObjectId.isValid(city)) {
      filter["location.city"] = city;
    } else {
      // if city is a name → find its ID
      const cityDoc = await City.findOne({ name: city });
      if (cityDoc) filter["location.city"] = cityDoc._id;
    }
  }

  // PRICE FILTER
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // SPACE PREFERENCES FILTER
  if (spacePreferences) {
    const prefs = spacePreferences.split(",");
    filter.spacePreferences = { $in: prefs };
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

/* only vendors can create, update, delete their packages */

// CREATE PACKAGE (Vendor)
const createVenuePackage = asyncHandler(async (req, res, next) => {
  const {
    venueCategory,
    title,
    price,
    shortDescription,
    fullDescription,
    location,
    venueDetails,
    amenities,
    spacePreferences,
    pricing,
    media,
  } = req.body;

  if (!venueCategory || !name || !shortDescription || !fullDescription) {
    return next(new ErrorResponse(400, "Required fields missing"));
  }

  const newPackage = await VenuePackage.create({
    vendor: req.vendor._id, // vendor logged in from middleware
    venueCategory,
    title,
    price,
    shortDescription,
    fullDescription,
    location,
    venueDetails,
    amenities,
    spacePreferences,
    pricing,
    media,
  });

  return res
    .status(201)
    .json(new SuccessResponse(201, "Venue package created", newPackage));
});

// UPDATE PACKAGE (Vendor)
const updateVenuePackage = asyncHandler(async (req, res, next) => {
  const vendorId = req.vendor._id;
  const pkgId = req.params.id;

  const pkg = await VenuePackage.exists({
    _id: pkgId,
    vendor: vendorId,
  });

  if (!pkg) {
    return next(new ErrorResponse(404, "Package not found or unauthorized"));
  }

  const updated = await VenuePackage.findByIdAndUpdate(
    pkgId,
    { $set: req.body },
    { new: true }
  );

  return res
    .status(200)
    .json(new SuccessResponse(200, "Venue package updated", updated));
});

// DELETE PACKAGE (Vendor)
export const deleteVenuePackage = asyncHandler(async (req, res, next) => {
  const vendorId = req.vendor._._id;
  const pkgId = req.params.id;

  const pkg = await VenuePackage.findOne({
    _id: pkgId,
    vendor: vendorId,
  });

  if (!pkg) {
    return next(new ErrorResponse(404, "Package not found or unauthorized"));
  }

  await pkg.deleteOne();

  return res
    .status(200)
    .json(new SuccessResponse(200, "Venue package deleted"));
});

export {
  getAllVenuePackages,
  createVenuePackage,
  updateVenuePackage,
  deleteVenuePackage,
};
