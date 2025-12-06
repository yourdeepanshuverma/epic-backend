import express from "express";
import {
  createVendor,
  updateVendor,
  vendorLogin,
  getVendorProfile,
  googleAuth,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPassword,
  getVendorWalletBalance,
  getVendorWalletTransactions,
} from "../controllers/vendor.js";
import { upload } from "../middlewares/mutler.js";
import { getVendorHeaders } from "../middlewares/authMiddleware.js";
import {
  addFaq,
  addNewAlbums,
  addReviewToPackage,
  addVideo,
  createVenuePackage,
  deleteAlbum,
  deleteAlbumPhoto,
  deleteFaq,
  deleteReviewForPackage,
  deleteVenuePackage,
  deleteVideo,
  getReviewsForPackage,
  getVenuePackage,
  getVenuePackages,
  updateAlbumTitles,
  updateApprovalAndVisibility,
  updateBasicDetails,
  updateFaq,
  updateReviewForPackage,
  updateVideo,
} from "../controllers/venuePackage.js";

const router = express.Router();

/* ============================================================================
    GOOGLE OAUTH ROUTES
============================================================================= */
router.post("/auth/google", googleAuth); // tested

/* ============================================================================
    NORMAL LOGIN ROUTE
============================================================================= */
router.post("/login", vendorLogin); // tested

/* ============================================================================
    CREATE VENDOR ROUTE
============================================================================= */
router.post(
  "/",
  upload.fields([
    { name: "profile", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },

    { name: "documents[gst]", maxCount: 1 },
    { name: "documents[pan]", maxCount: 1 },
    { name: "documents[idProof]", maxCount: 1 },
    { name: "documents[registrationProof]", maxCount: 1 },
  ]),
  createVendor
); // tested

/* ============================================================================
    FORGOT PASSWORD ROUTES
============================================================================= */
router.post("/send-forget-otp", sendForgotPasswordOtp); // tested
router.post("/verify-forget-otp", verifyForgotPasswordOtp); // tested
router.post("/reset-password", resetPassword); // tested

/* ============================================================================
    PROTECTED ROUTES BELOW
============================================================================= */

router
  .route("/profile")
  // GET vendor profile
  .get(getVendorHeaders, getVendorProfile) // tested
  // UPDATE vendor profile
  .put(
    getVendorHeaders,
    upload.fields([
      { name: "profile", maxCount: 1 },
      { name: "coverImage", maxCount: 1 },

      { name: "documents[gst]", maxCount: 1 },
      { name: "documents[pan]", maxCount: 1 },
      { name: "documents[idProof]", maxCount: 1 },
      { name: "documents[registrationProof]", maxCount: 1 },
    ]),
    updateVendor
  ); // tested

router.get("/balance", getVendorWalletBalance); // tested
router.get("/transactions", getVendorWalletTransactions); // tested

/*============================================================================
    VENUE PACKAGE ROUTES
=============================================================================*/
//#region VENUE PACKAGE MANAGEMENT ROUTES

router.get("/venue-packages", getVenuePackages); // tested
router.get("/venue-packages/:id", getVenuePackage); // tested

// CREATE venue package
router.post(
  "/venue-packages",
  getVendorHeaders,
  upload.single("featuredImage"),
  createVenuePackage
); // tested

// UPDATE basic details of venue package
router.put(
  "/venue-packages/:id/basic",
  getVendorHeaders,
  upload.single("featuredImage"),
  updateBasicDetails
); // tested

// FAQs for venue package
router.post("/venue-packages/:id/faqs", getVendorHeaders, addFaq); // tested
router.put("/venue-packages/:id/faqs/:index", getVendorHeaders, updateFaq); // tested
router.delete("/venue-packages/:id/faqs/:index", getVendorHeaders, deleteFaq); // tested

// Videos for venue package
router.post("/venue-packages/:id/videos", getVendorHeaders, addVideo); // tested
router.put("/venue-packages/:id/videos/:index", getVendorHeaders, updateVideo); // tested
router.delete(
  "/venue-packages/:id/videos/:index",
  getVendorHeaders,
  deleteVideo
); // tested

// Add new albums to venue package
router.patch(
  "/venue-packages/:id/albums",
  getVendorHeaders,
  upload.any(),
  addNewAlbums
); // tested

// Update album titles
router.patch(
  "/venue-packages/:id/albums/:albumIndex/titles",
  getVendorHeaders,
  updateAlbumTitles
); // tested

// Delete album photo
router.delete(
  "/venue-packages/:id/albums/:albumIndex",
  getVendorHeaders,
  deleteAlbum
); // tested

// Delete photo from album
router.delete(
  "/venue-packages/:id/albums/:albumIndex/photos/:photoIndex",
  getVendorHeaders,
  deleteAlbumPhoto
); // tested

/*============================================================================
    VENUE PACKAGE REVIEWS ROUTES
=============================================================================*/

// Reviews for package
router.get(
  "/venue-packages/:id/reviews",
  getVendorHeaders,
  getReviewsForPackage
); // tested

router.post(
  "/venue-packages/:id/reviews",
  getVendorHeaders,
  addReviewToPackage
); // tested

router.put(
  "/venue-packages/:id/reviews/:reviewId",
  getVendorHeaders,
  updateReviewForPackage
); //  tested

// Delete review for package (admin only)
router.delete(
  "/venue-packages/:id/reviews/:reviewId",
  getVendorHeaders,
  deleteReviewForPackage
); // tested

router.put(
  "/venue-packages/:id/status",
  getVendorHeaders,
  updateApprovalAndVisibility
); // tested

// DELETE venue package
router.delete("/venue-packages/:id", getVendorHeaders, deleteVenuePackage); // tested

//#endregion VENUE PACKAGE MANAGEMENT ROUTES

export default router;
