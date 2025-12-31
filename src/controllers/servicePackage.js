import City from "../models/City.js";
import Country from "../models/Country.js";
import State from "../models/State.js";
import ServiceSubCategory from "../models/ServiceSubCategory.js";
import ServicePackage from "../models/ServicePackage.js";
import Review from "../models/Review.js";

import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";

import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

/* ======================================================
    CREATE NEW SERVICE PACKAGE
====================================================== */
export const createServicePackage = asyncHandler(async (req, res, next) => {
  let {
    serviceSubCategory,
    title,
    description,
    startingPrice,
    location,
    services,
  } = req.body;

  if (!serviceSubCategory || !title || !description || !startingPrice) {
    return next(new ErrorResponse(400, "Missing required fields"));
  }

  // Validate SubCategory
  if (!(await ServiceSubCategory.exists({ _id: serviceSubCategory }))) {
    return next(new ErrorResponse(404, "Sub category not found"));
  }

  // Parse Location
  const parsedLocation =
    typeof location === "string" ? JSON.parse(location) : location;

  const invalidLocation =
    !parsedLocation?.locality ||
    !parsedLocation?.fullAddress ||
    !parsedLocation?.city ||
    !parsedLocation?.state ||
    !parsedLocation?.country ||
    !parsedLocation?.pincode;

  if (invalidLocation) {
    return next(new ErrorResponse(400, "Location fields missing"));
  }

  // Create / Fetch Country
  const countryDoc =
    (await Country.findOne({
      name: new RegExp(parsedLocation.country, "i"),
    })) || (await Country.create({ name: parsedLocation.country }));

  // State
  const stateDoc =
    (await State.findOne({
      name: new RegExp(parsedLocation.state, "i"),
      country: countryDoc._id,
    })) ||
    (await State.create({
      name: parsedLocation.state,
      country: countryDoc._id,
    }));

  // City
  const cityDoc =
    (await City.findOne({
      name: new RegExp(parsedLocation.city, "i"),
      state: stateDoc._id,
    })) ||
    (await City.create({
      name: parsedLocation.city,
      state: stateDoc._id,
      country: countryDoc._id,
    }));

  parsedLocation.country = countryDoc._id;
  parsedLocation.state = stateDoc._id;
  parsedLocation.city = cityDoc._id;

  // Parse Services
  let serviceMap = {};
  if (services) {
    try {
      serviceMap = JSON.parse(services);
    } catch {}
  }

  // Featured Image
  if (!req.file) {
    return next(new ErrorResponse(400, "Featured image is required"));
  }

  const uploaded = await uploadToCloudinary([req.file], "service-packages");
  const featuredImage = uploaded[0];

  // Create Package
  const pkg = await ServicePackage.create({
    vendor: req.vendor._id,
    serviceSubCategory,
    title,
    description,
    featuredImage,
    startingPrice,
    location: parsedLocation,
    services: serviceMap,
    approved: req.vendor?.autoApprovePackages,
  });

  res.status(201).json(new SuccessResponse(201, "Package created", pkg));
});

/* ======================================================
    GET ALL SERVICE PACKAGES
====================================================== */
export const getServicePackages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, city, subcategory } = req.query;

  const filters = {
    vendor: req.vendor._id,
  };

  if (city) filters["location.city"] = city;
  if (subcategory) filters["serviceSubCategory"] = subcategory;

  const data = await ServicePackage.find(filters)
    .populate({
      path: "serviceSubCategory",
      select: "name slug serviceCategory",
      populate: {
        path: "serviceCategory",
        select: "name slug",
      },
    })
    .populate("location.city", "name")
    .populate("location.state", "name")
    .populate("location.country", "name")
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  const total = await ServicePackage.countDocuments(filters);

  data.forEach((pkg) => {
    pkg.location.city = pkg.location.city.name;
    pkg.location.state = pkg.location.state.name;
    pkg.location.country = pkg.location.country.name;
  });

  res.status(200).json(
    new SuccessResponse(200, "Packages fetched", {
      total,
      page,
      limit,
      packages: data,
    })
  );
});

/* ======================================================
    GET SINGLE PACKAGE DETAILS
====================================================== */
export const getServicePackage = asyncHandler(async (req, res, next) => {
  const pkg = await ServicePackage.findById(req.params.id)
    .populate({
      path: "serviceSubCategory",
      select: "name slug serviceCategory services",
      populate: [
        {
          path: "serviceCategory",
          select: "name slug",
        },
        {
          path: "services", // Populate services array in subcategory
          select: "name icon type",
        }
      ]
    })
    .populate("location.city", "name")
    .populate("location.state", "name")
    .populate("location.country", "name")
    .lean();

  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  pkg.location.city = pkg.location.city.name;
  pkg.location.state = pkg.location.state.name;
  pkg.location.country = pkg.location.country.name;

  res.status(200).json(new SuccessResponse(200, "Package fetched", pkg));
});

/* ======================================================
    UPDATE BASIC DETAILS OF PACKAGE
====================================================== */
export const updateServiceBasicDetails = asyncHandler(
  async (req, res, next) => {
    const pkg = await ServicePackage.findById(req.params.id);
    if (!pkg) return next(new ErrorResponse(404, "Package not found"));

    const isAdmin = req.vendor?.role === "admin";
    const isVendor = req.vendor?._id?.toString() === pkg.vendor.toString();

    if (!isAdmin && !isVendor)
      return next(new ErrorResponse(403, "Not allowed"));

    const updates = req.body;

    const allowed = ["title", "description", "startingPrice"];

    if (isVendor) {
      Object.keys(updates).forEach((key) => {
        if (!allowed.includes(key)) delete updates[key];
      });
    }

    // Update location same as create
    if (updates.location) {
      const loc =
        typeof updates.location === "string"
          ? JSON.parse(updates.location)
          : updates.location;

      const country =
        (await Country.findOne({ name: loc.country })) ||
        (await Country.create({ name: loc.country }));

      const state =
        (await State.findOne({ name: loc.state })) ||
        (await State.create({ name: loc.state, country: country._id }));

      const city =
        (await City.findOne({ name: loc.city })) ||
        (await City.create({
          name: loc.city,
          state: state._id,
          country: country._id,
        }));

      loc.country = country._id;
      loc.state = state._id;
      loc.city = city._id;

      pkg.location = loc;
    }

    // Featured image update
    if (req.file) {
      const uploaded = await uploadToCloudinary([req.file]);
      pkg.featuredImage = uploaded[0];
    }

    allowed.forEach((f) => {
      if (updates[f] !== undefined) pkg[f] = updates[f];
    });

    await pkg.save();

    res.status(200).json(new SuccessResponse(200, "Updated", pkg));
  }
);

/* ======================================================
    ADD FAQ TO PACKAGE
====================================================== */
export const addServiceFaq = asyncHandler(async (req, res, next) => {
  const { question, answer } = req.body;
  if (!question || !answer)
    return next(new ErrorResponse(400, "Question & Answer required"));

  const pkg = await ServicePackage.findById(req.params.id);
  pkg.faqs.push({ question, answer });
  await pkg.save();

  res.status(201).json(new SuccessResponse(201, "FAQ added", pkg.faqs));
});

/* ======================================================
    UPDATE FAQ IN PACKAGE
====================================================== */
export const updateServiceFaq = asyncHandler(async (req, res, next) => {
  const pkg = await ServicePackage.findById(req.params.id);

  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  if (!Array.isArray(req.body.faqs))
    return next(new ErrorResponse(400, "FAQs must be an array"));

  pkg.faqs = req.body.faqs;

  await pkg.save();
  res.status(200).json(new SuccessResponse(200, "FAQ updated", pkg.faqs));
});

/* ======================================================
    DELETE FAQ FROM PACKAGE
====================================================== */
export const deleteServiceFaq = asyncHandler(async (req, res, next) => {
  const { index } = req.params;

  const pkg = await ServicePackage.findById(req.params.id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  if (!pkg.faqs[index]) return next(new ErrorResponse(404, "FAQ not found"));

  pkg.faqs.splice(index, 1);
  await pkg.save();

  res.status(200).json(new SuccessResponse(200, "FAQ removed", pkg.faqs));
});

/* ======================================================
    ADD VIDEO TO PACKAGE
====================================================== */
export const addServiceVideo = asyncHandler(async (req, res, next) => {
  const { title, url } = req.body;

  if (!url) return next(new ErrorResponse(400, "Video URL required"));

  const pkg = await ServicePackage.findById(req.params.id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  pkg.videos.push({ title, url });
  await pkg.save();

  res.status(201).json(new SuccessResponse(201, "Video added", pkg.videos));
});

/* ======================================================
    UPDATE VIDEO IN PACKAGE
====================================================== */
export const updateServiceVideo = asyncHandler(async (req, res, next) => {
  const pkg = await ServicePackage.findById(req.params.id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  if (!Array.isArray(req.body.videos))
    return next(new ErrorResponse(400, "Videos must be an array"));

  pkg.videos = req.body.videos;

  await pkg.save();

  res.status(200).json(new SuccessResponse(200, "Video updated", pkg.videos));
});

/* ======================================================
    DELETE VIDEO FROM PACKAGE
====================================================== */
export const deleteServiceVideo = asyncHandler(async (req, res, next) => {
  const { index } = req.params;

  const pkg = await ServicePackage.findById(req.params.id);
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
export const addNewServiceAlbums = asyncHandler(async (req, res, next) => {
  const pkg = await ServicePackage.findById(req.params.id);
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
export const updateServiceAlbumTitles = asyncHandler(async (req, res, next) => {
  const pkg = await ServicePackage.findById(req.params.id);
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
      ADD PHOTOS + UPDATE TITLE IN SERVICE ALBUM
====================================================== */
export const addPhotosToServiceAlbum = asyncHandler(async (req, res, next) => {
  const { id, albumIndex } = req.params;
  const { title } = req.body; // 👈 optional album title

  const pkg = await ServicePackage.findById(id);
  if (!pkg) return next(new ErrorResponse(404, "Package not found"));

  const index = parseInt(albumIndex, 10);
  if (isNaN(index) || index < 0 || index >= pkg.photoAlbums.length) {
    return next(new ErrorResponse(400, "Invalid album index"));
  }

  if (!req.files || req.files.length === 0) {
    return next(new ErrorResponse(400, "No photos uploaded"));
  }

  const album = pkg.photoAlbums[index];

  /* -----------------------------------------
     UPDATE TITLE (if provided)
  ----------------------------------------- */
  if (title && title.trim()) {
    album.title = title.trim();
  }

  /* -----------------------------------------
     UPLOAD PHOTOS
  ----------------------------------------- */
  const uploaded = await uploadToCloudinary(req.files);

  album.images.push(...uploaded);

  /* -----------------------------------------
     ENSURE THUMBNAIL EXISTS
  ----------------------------------------- */
  if (!album.thumbnail || !album.thumbnail.url) {
    album.thumbnail = uploaded[0]; // 👈 required by schema
  }

  await pkg.save();

  res
    .status(200)
    .json(new SuccessResponse(200, "Photos added to album", album));
});

/* ======================================================
       DELETE PHOTO FROM ALBUM
====================================================== */
export const deleteServiceAlbumPhoto = asyncHandler(async (req, res, next) => {
  const { id, albumIndex, photoIndex } = req.params;

  const pkg = await ServicePackage.findById(id);
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
export const deleteServiceAlbum = asyncHandler(async (req, res, next) => {
  const { id, albumIndex } = req.params;

  const pkg = await ServicePackage.findById(id);
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
export const addServiceReviewToPackage = asyncHandler(
  async (req, res, next) => {
    const pkg = await ServicePackage.findById(req.params.id);
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
  }
);

/* ======================================================
    GET REVIEWS FOR PACKAGE
====================================================== */
export const getServiceReviewsForPackage = asyncHandler(
  async (req, res, next) => {
    const pkg = await ServicePackage.exists({ _id: req.params.id });

    if (!pkg) return next(new ErrorResponse(404, "Package not found"));

    const reviews = await Review.find({
      package: pkg._id,
      packageType: "venue",
    });

    res.status(200).json(new SuccessResponse(200, "Reviews fetched", reviews));
  }
);

/* ======================================================
    UPDATE REVIEW FOR PACKAGE (ADMIN ONLY)
====================================================== */
export const updateServiceReviewForPackage = asyncHandler(
  async (req, res, next) => {
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
  }
);

/* ======================================================
    DELETE REVIEW FOR PACKAGE (ADMIN ONLY)
====================================================== */
export const deleteServiceReviewForPackage = asyncHandler(
  async (req, res, next) => {
    const { reviewId } = req.params;
    if (req.vendor.role !== "admin") {
      return next(new ErrorResponse(403, "Only admins can delete reviews"));
    }
    const review = await Review.findById(reviewId);
    if (!review) return next(new ErrorResponse(404, "Review not found"));
    await review.deleteOne();
    res.status(200).json(new SuccessResponse(200, "Review deleted"));
  }
);

/* ======================================================
    UPDATE APPROVAL & VISIBILITY STATUS
====================================================== */
export const updateServiceApprovalAndVisibility = asyncHandler(
  async (req, res, next) => {
    const pkg = await ServicePackage.findById(req.params.id);
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
export const deleteServicePackage = asyncHandler(async (req, res, next) => {
  const pkg = await ServicePackage.findById(req.params.id);
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
