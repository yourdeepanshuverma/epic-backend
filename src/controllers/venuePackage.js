import City from "../models/City.js";
import Country from "../models/Country.js";
import State from "../models/State.js";
import VenueCategory from "../models/VenueCategory.js";
import VenuePackage from "../models/VenuePackage.js";

import Review from "../models/Review.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";

/* ======================================================
   CREATE PACKAGE
====================================================== */
export const createVenuePackage = asyncHandler(async (req, res, next) => {
  let {
    venueCategory,
    title,
    description,
    featuredImage,
    startingPrice,
    location,
    services,
  } = req.body;

  // ---------------------------
  // VALIDATE REQUIRED FIELDS
  //----------------------------
  if (!venueCategory || !title || !description || !startingPrice) {
    return next(new ErrorResponse(400, "Missing required fields"));
  }

  // Validate Category
  if (!(await VenueCategory.exists({ _id: venueCategory }))) {
    return next(new ErrorResponse(404, "Venue category not found"));
  }

  const locationObj =
    typeof location === "string" ? JSON.parse(location) : location;
  location = locationObj;

  // Validate Location
  const invalidLocation =
    !location?.locality ||
    !location?.fullAddress ||
    !location?.city ||
    !location?.state ||
    !location?.country ||
    !location?.pincode;

  if (invalidLocation)
    return next(new ErrorResponse(400, "Location fields missing"));

  const countryExists = await Country.exists({
    name: new RegExp(`^${location.country}$`, "i"),
  });
  const stateExists = await State.exists({
    name: new RegExp(`^${location.state}$`, "i"),
    country: countryExists?._id,
  });
  const cityExists = await City.exists({
    name: new RegExp(`^${location.city}$`, "i"),
    state: stateExists?._id,
  });

  if (!countryExists) {
    const country = await Country.create({ name: location.country });
    location.country = country._id;
  } else location.country = countryExists._id;

  if (!stateExists) {
    const state = await State.create({
      name: location.state,
      country: location.country,
    });
    location.state = state._id;
  } else location.state = stateExists._id;

  if (!cityExists) {
    const city = await City.create({
      name: location.city,
      state: location.state,
      country: location.country,
    });
    location.city = city._id;
  } else location.city = cityExists._id;

  // --- SERVICES (Map from frontend) ---
  let serviceMap = {};
  if (services) {
    try {
      serviceMap = JSON.parse(services);
    } catch {
      serviceMap = {};
    }
  }

  if (!req.file) {
    return next(new ErrorResponse(400, "Featured image is required"));
  }

  // Upload featured image
  const uploadedImage = await uploadToCloudinary([req.file], "venue-packages");
  featuredImage = {
    public_id: uploadedImage[0].public_id,
    url: uploadedImage[0].url,
  };

  /* ======================================================
       CREATE PACKAGE
  ======================================================= */

  const pkg = await VenuePackage.create({
    vendor: req.vendor._id,
    venueCategory,
    title,
    description,
    featuredImage,
    startingPrice,
    location,
    services: serviceMap,
    approved: req.vendor?.autoApprovePackages,
  });

  return res
    .status(201)
    .json(new SuccessResponse(201, "Package created successfully", pkg));
});

/* ======================================================
   GET ALL PACKAGES (WITH FILTERS)
====================================================== */
export const getVenuePackages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, city, category } = req.query;

  const filters = {};

  if (city) filters["location.city"] = city;
  if (category) filters["venueCategory"] = category;

  const packages = await VenuePackage.find(filters)
    .populate("venueCategory", "name slug")
    .populate("location.city", "name")
    .populate("location.state", "name")
    .populate("location.country", "name")
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  packages.forEach((pkg) => {
    if (pkg.location?.city) {
      pkg.location.city = pkg.location.city.name;
    }
    if (pkg.location?.state) {
      pkg.location.state = pkg.location.state.name;
    }
    if (pkg.location?.country) {
      pkg.location.country = pkg.location.country.name;
    }
  });

  const total = await VenuePackage.countDocuments(filters);

  res.status(200).json(
    new SuccessResponse(200, "Packages fetched successfully", {
      total,
      page,
      limit,
      packages,
    })
  );
});

/* ======================================================
   GET SINGLE PACKAGE
====================================================== */
export const getVenuePackage = asyncHandler(async (req, res, next) => {
  const pkg = await VenuePackage.findById(req.params.id)
    .populate({ path: "venueCategory", select: "name slug" })
    .populate({ path: "location.city", select: "name" })
    .populate({ path: "location.state", select: "name" })
    .populate({ path: "location.country", select: "name" })
    .lean();

  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  pkg.location.city = pkg.location.city.name;
  pkg.location.state = pkg.location.state.name;
  pkg.location.country = pkg.location.country.name;

  res
    .status(200)
    .json(new SuccessResponse(200, "Package fetched successfully", pkg));
});

/* ======================================================
    UPDATE BASIC DETAILS OF PACKAGE
====================================================== */
export const updateBasicDetails = asyncHandler(async (req, res, next) => {
  const pkg = await VenuePackage.findById(req.params.id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  const isAdmin = req.vendor?.role === "admin";
  const isVendor = req.vendor?._id?.toString() === pkg.vendor.toString();

  if (!isAdmin && !isVendor) {
    return next(new ErrorResponse(403, "Not allowed to update this package"));
  }

  const updates = req.body;

  if (updates.location) {
    const locationObj =
      typeof updates.location === "string"
        ? JSON.parse(updates.location)
        : updates.location;
    updates.location = locationObj;

    // Validate Location
    const invalidLocation =
      !updates.location?.locality ||
      !updates.location?.fullAddress ||
      !updates.location?.city ||
      !updates.location?.state ||
      !updates.location?.country ||
      !updates.location?.pincode;

    if (invalidLocation)
      return next(new ErrorResponse(400, "Location fields missing"));

    const countryExists = await Country.exists({
      name: new RegExp(`^${updates.location.country}$`, "i"),
    });
    const stateExists = await State.exists({
      name: new RegExp(`^${updates.location.state}$`, "i"),
      country: countryExists?._id,
    });
    const cityExists = await City.exists({
      name: new RegExp(`^${updates.location.city}$`, "i"),
      state: stateExists?._id,
    });

    if (!countryExists) {
      const country = await Country.create({ name: updates.location.country });
      updates.location.country = country._id;
    } else updates.location.country = countryExists._id;

    if (!stateExists) {
      const state = await State.create({
        name: updates.location.state,
        country: updates.location.country,
      });
      updates.location.state = state._id;
    } else updates.location.state = stateExists._id;

    if (!cityExists) {
      const city = await City.create({
        name: updates.location.city,
        state: updates.location.state,
        country: updates.location.country,
      });
      updates.location.city = city._id;
    } else updates.location.city = cityExists._id;
  }

  const allowedFields = ["title", "description", "startingPrice", "location"];

  allowedFields.forEach((f) => {
    if (updates[f] !== undefined) pkg[f] = updates[f];
  });

  // Handle featuredImage
  if (req.file) {
    const uploaded = await uploadToCloudinary([req.file]);
    pkg.featuredImage = uploaded[0];
  }

  await pkg.save();

  res.status(200).json(new SuccessResponse(200, "Basic details updated", pkg));
});

/* ======================================================
    ADD FAQ TO PACKAGE
====================================================== */
export const addFaq = asyncHandler(async (req, res, next) => {
  const { question, answer } = req.body;

  if (!question || !answer)
    return next(new ErrorResponse(400, "Question & answer required"));

  const pkg = await VenuePackage.findById(req.params.id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  pkg.faqs.push({ question, answer });
  await pkg.save();

  res.status(201).json(new SuccessResponse(201, "FAQ added", pkg.faqs));
});

/* ======================================================
    UPDATE FAQ IN PACKAGE
====================================================== */
export const updateFaq = asyncHandler(async (req, res, next) => {
  const { index } = req.params;
  const { question, answer } = req.body;

  const pkg = await VenuePackage.findById(req.params.id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  if (!pkg.faqs[index]) return next(new ErrorResponse(404, "FAQ not found"));

  if (question !== undefined) pkg.faqs[index].question = question;
  if (answer !== undefined) pkg.faqs[index].answer = answer;

  await pkg.save();

  res.status(200).json(new SuccessResponse(200, "FAQ updated", pkg.faqs));
});

/* ======================================================
    DELETE FAQ FROM PACKAGE
====================================================== */
export const deleteFaq = asyncHandler(async (req, res, next) => {
  const { index } = req.params;

  const pkg = await VenuePackage.findById(req.params.id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  if (!pkg.faqs[index]) return next(new ErrorResponse(404, "FAQ not found"));

  pkg.faqs.splice(index, 1);
  await pkg.save();

  res.status(200).json(new SuccessResponse(200, "FAQ removed", pkg.faqs));
});

/* ======================================================
    ADD VIDEO TO PACKAGE
====================================================== */
export const addVideo = asyncHandler(async (req, res, next) => {
  const { title, url } = req.body;

  if (!url) return next(new ErrorResponse(400, "Video URL required"));

  const pkg = await VenuePackage.findById(req.params.id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  pkg.videos.push({ title, url });
  await pkg.save();

  res.status(201).json(new SuccessResponse(201, "Video added", pkg.videos));
});

/* ======================================================
    UPDATE VIDEO IN PACKAGE
====================================================== */
export const updateVideo = asyncHandler(async (req, res, next) => {
  const { index } = req.params;
  const { title, url } = req.body;

  const pkg = await VenuePackage.findById(req.params.id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  if (!pkg.videos[index])
    return next(new ErrorResponse(404, "Video not found"));

  if (title !== undefined) pkg.videos[index].title = title;
  if (url !== undefined) pkg.videos[index].url = url;

  await pkg.save();

  res.status(200).json(new SuccessResponse(200, "Video updated", pkg.videos));
});

/* ======================================================
    DELETE VIDEO FROM PACKAGE
====================================================== */
export const deleteVideo = asyncHandler(async (req, res, next) => {
  const { index } = req.params;

  const pkg = await VenuePackage.findById(req.params.id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  if (!pkg.videos[index])
    return next(new ErrorResponse(404, "Video not found"));

  pkg.videos.splice(index, 1);
  await pkg.save();

  res.status(200).json(new SuccessResponse(200, "Video removed", pkg.videos));
});

/* ======================================================
    ADD NEW ALBUMS TO PACKAGE
====================================================== */
export const addNewAlbums = asyncHandler(async (req, res, next) => {
  const pkg = await VenuePackage.findById(req.params.id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  if (!req.files || req.files.length === 0)
    return next(new ErrorResponse(400, "No photos uploaded"));

  const albumIndexes = [
    ...new Set(
      req.files
        .map((f) => f.fieldname)
        .filter((f) => f.includes("albums["))
        .map((f) => f.match(/albums\[(\d+)\]/)[1])
    ),
  ];

  for (const index of albumIndexes) {
    const title = req.body.albums?.[index]?.title || `Album ${index}`;

    const photos = req.files.filter(
      (f) => f.fieldname === `albums[${index}][photos]`
    );

    const uploaded = await uploadToCloudinary(photos);

    pkg.photoAlbums.push({
      title,
      thumbnail: uploaded[0],
      images: uploaded,
    });
  }

  await pkg.save();
  res.status(200).json(new SuccessResponse(200, "New albums added", pkg));
});

/* ======================================================
    UPDATE ALBUM TITLE
====================================================== */
export const updateAlbumTitles = asyncHandler(async (req, res, next) => {
  const pkg = await VenuePackage.findById(req.params.id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  const { title } = req.body;

  if (!title) return next(new ErrorResponse(400, "title field required"));

  const albumIndex = parseInt(req.params.albumIndex, 10);
  if (
    isNaN(albumIndex) ||
    albumIndex < 0 ||
    albumIndex >= pkg.photoAlbums.length
  ) {
    return next(new ErrorResponse(400, "Invalid album index"));
  }

  pkg.photoAlbums[albumIndex].title = title;

  await pkg.save();
  res
    .status(200)
    .json(new SuccessResponse(200, `Album title updated to '${title}'`, pkg));
});

/* ======================================================
      ADD PHOTOS TO ALBUM
====================================================== */
export const addPhotosToAlbum = asyncHandler(async (req, res, next) => {
  const { id, albumIndex } = req.params;

  const pkg = await VenuePackage.findById(id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  const index = parseInt(albumIndex, 10);
  if (isNaN(index) || index < 0 || index >= pkg.photoAlbums.length) {
    return next(new ErrorResponse(400, "Invalid album index"));
  }

  if (!req.files || req.files.length === 0) {
    return next(new ErrorResponse(400, "No photos uploaded"));
  }

  // Upload new photos
  const uploaded = await uploadToCloudinary(req.files);

  // Add to album
  pkg.photoAlbums[index].images.push(...uploaded);

  // If album has no thumbnail, set first image as thumbnail
  if (!pkg.photoAlbums[index].thumbnail?.url) {
    pkg.photoAlbums[index].thumbnail = uploaded[0];
  }

  await pkg.save();

  res
    .status(200)
    .json(
      new SuccessResponse(200, "Photos added to album", pkg.photoAlbums[index])
    );
});

/* ======================================================
       DELETE PHOTO FROM ALBUM
====================================================== */
export const deleteAlbumPhoto = asyncHandler(async (req, res, next) => {
  const { id, albumIndex, photoIndex } = req.params;

  const pkg = await VenuePackage.findById(id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  const album = pkg.photoAlbums[albumIndex];
  if (!album) return next(new ErrorResponse(400, "Album not found"));

  const photo = album.images[photoIndex];
  if (!photo) return next(new ErrorResponse(400, "Photo index does not exist"));

  // 1. Delete from Cloudinary
  await deleteFromCloudinary([photo]);

  // 2. Remove photo
  album.images.splice(photoIndex, 1);

  // 3. If album is now empty → delete album completely
  if (album.images.length === 0) {
    pkg.photoAlbums.splice(albumIndex, 1);
    await pkg.save();

    return res
      .status(200)
      .json(new SuccessResponse(200, "Photo deleted and album removed"));
  }

  // 4. If deleted photo was thumbnail → replace thumbnail
  if (album.thumbnail.public_id === photo.public_id) {
    album.thumbnail = album.images[0]; // first image becomes new thumbnail
  }

  await pkg.save();

  return res
    .status(200)
    .json(
      new SuccessResponse(200, "Photo deleted", pkg.photoAlbums[albumIndex])
    );
});

/* ======================================================
    DELETE ALBUM
====================================================== */
export const deleteAlbum = asyncHandler(async (req, res, next) => {
  const { id, albumIndex } = req.params;

  const pkg = await VenuePackage.findById(id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  if (!pkg.photoAlbums[albumIndex])
    return next(new ErrorResponse(400, "Album index does not exist"));

  const deleted = await deleteFromCloudinary([
    pkg?.thumbnail,
    ...pkg?.photoAlbums[albumIndex]?.images,
  ]);
  if (deleted) {
    pkg.photoAlbums.splice(albumIndex, 1);

    await pkg.save();
  }
  res.status(200).json(new SuccessResponse(200, "Album deleted", pkg));
});

/* ======================================================
    ADD REVIEW TO PACKAGE
====================================================== */
export const addReviewToPackage = asyncHandler(async (req, res, next) => {
  const pkg = await VenuePackage.findById(req.params.id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  const review = await Review.create({
    packageType: "venue",
    package: pkg._id,
    vendor: pkg.vendor,
    name: req.body.name,
    rating: req.body.rating,
    comment: req.body.comment,
  });

  if (!review) return next(new ErrorResponse(500, "Failed to create review"));

  pkg.reviews.push(review._id);
  await pkg.save();
  res
    .status(200)
    .json(new SuccessResponse(200, "Review added to package", pkg));
});

/* ======================================================
    GET REVIEWS FOR PACKAGE
====================================================== */
export const getReviewsForPackage = asyncHandler(async (req, res, next) => {
  const pkg = await VenuePackage.exists({ _id: req.params.id });

  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  const reviews = await Review.find({
    package: pkg._id,
    packageType: "venue",
  });

  res.status(200).json(new SuccessResponse(200, "Reviews fetched", reviews));
});

/* ======================================================
    UPDATE REVIEW FOR PACKAGE (ADMIN ONLY)
====================================================== */
export const updateReviewForPackage = asyncHandler(async (req, res, next) => {
  const { name, rating, comment } = req.body;

  if (req.vendor.role !== "admin") {
    return next(new ErrorResponse(403, "Only admins can update reviews"));
  }

  const review = await Review.findById(req.params.reviewId);
  if (!review) return next(new ErrorResponse(404, "Review not found"));

  if (name) review.name = name;
  if (rating) review.rating = rating;
  if (comment) review.comment = comment;

  await review.save();
  res.status(200).json(new SuccessResponse(200, "Review updated", review));
});

/* ======================================================
    DELETE REVIEW FOR PACKAGE (ADMIN ONLY)
====================================================== */
export const deleteReviewForPackage = asyncHandler(async (req, res, next) => {
  const { reviewId } = req.params;
  if (req.vendor.role !== "admin") {
    return next(new ErrorResponse(403, "Only admins can delete reviews"));
  }
  const review = await Review.findById(reviewId);
  if (!review) return next(new ErrorResponse(404, "Review not found"));
  await review.deleteOne();
  res.status(200).json(new SuccessResponse(200, "Review deleted"));
});

/* ======================================================
    UPDATE APPROVAL & VISIBILITY STATUS
====================================================== */
export const updateApprovalAndVisibility = asyncHandler(
  async (req, res, next) => {
    const pkg = await VenuePackage.findById(req.params.id);
    if (!pkg) return next(new ErrorResponse(404, "Package not found"));

    const isAdmin = req.vendor?.role === "admin";

    const isVendor = req.vendor?._id?.toString() === pkg.vendor.toString();

    // Not admin and not owner
    if (!isAdmin && !isVendor) {
      return next(new ErrorResponse(403, "Not allowed to update this package"));
    }

    const { approved, visibility } = req.body;

    /* ------------------------------------------------
     ADMIN CAN UPDATE BOTH "approved" & "visibility"
  ------------------------------------------------- */
    if (isAdmin) {
      if (approved !== undefined) pkg.approved = approved;
      if (visibility !== undefined) pkg.visibility = visibility;
    }

    /* ------------------------------------------------
     VENDOR CAN ONLY UPDATE "visibility"
  ------------------------------------------------- */
    if (isVendor && !isAdmin) {
      if (approved !== undefined) {
        return next(
          new ErrorResponse(403, "Vendors cannot change approval status")
        );
      }

      if (visibility !== undefined) pkg.visibility = visibility;
    }

    await pkg.save();

    res.status(200).json(
      new SuccessResponse(200, "Status updated successfully", {
        approved: pkg.approved,
        visibility: pkg.visibility,
      })
    );
  }
);

/* ======================================================
   DELETE PACKAGE
====================================================== */
export const deleteVenuePackage = asyncHandler(async (req, res, next) => {
  const pkg = await VenuePackage.findById(req.params.id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  await pkg.deleteOne();
  await deleteFromCloudinary([
    pkg?.featuredImage,
    ...pkg?.flatMap((thum) => thumbnail),
    ...pkg.photoAlbums.flatMap((album) => album.images),
  ]);

  res
    .status(200)
    .json(new SuccessResponse(200, "Package deleted successfully"));
});
