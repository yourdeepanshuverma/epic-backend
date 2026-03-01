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
  sendPhoneUpdateOtp,
  verifyPhoneUpdateOtp,
} from "../controllers/vendor.js";
import { createArrayUpload, upload } from "../middlewares/multer.js";
import { getVendorHeaders } from "../middlewares/authMiddleware.js";
import {
  addFaq,
  addNewAlbums,
  addPhotosToAlbum,
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
import {
  addNewServiceAlbums,
  addPhotosToServiceAlbum,
  addServiceFaq,
  addServiceReviewToPackage,
  addServiceVideo,
  createServicePackage,
  deleteServiceAlbum,
  deleteServiceAlbumPhoto,
  deleteServiceFaq,
  deleteServicePackage,
  deleteServiceReviewForPackage,
  deleteServiceVideo,
  getServicePackage,
  getServicePackages,
  getServiceReviewsForPackage,
  updateServiceAlbumTitles,
  updateServiceApprovalAndVisibility,
  updateServiceBasicDetails,
  updateServiceFaq,
  updateServiceReviewForPackage,
  updateServiceVideo,
} from "../controllers/servicePackage.js";
import { getCategoriesForVenuePackage } from "../controllers/venueCategory.js";
import { getCategoriesForServicePackage } from "../controllers/serviceCategory.js";
import { getServiceSubCategoriesForPackage } from "../controllers/serviceSubCategory.js";
import { refreshAccessToken } from "../controllers/authController.js";


const router = express.Router();

router.post("/refresh", refreshAccessToken);

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
  "/create",
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

router.get("/balance", getVendorHeaders, getVendorWalletBalance); // tested
router.get("/transactions", getVendorHeaders, getVendorWalletTransactions); // tested

// Phone Update OTP Flow
router.post("/send-phone-update-otp", getVendorHeaders, sendPhoneUpdateOtp);
router.post("/verify-phone-update-otp", getVendorHeaders, verifyPhoneUpdateOtp);

/*============================================================================
    VENUE PACKAGE ROUTES
=============================================================================*/
//#region VENUE PACKAGE MANAGEMENT ROUTES
router.get("/venue-categories", getVendorHeaders, getCategoriesForVenuePackage); // tested

router.get("/venue-packages", getVendorHeaders, getVenuePackages); // tested
router.get("/venue-packages/:id", getVendorHeaders, getVenuePackage); // tested

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
router.put("/venue-packages/:id/faqs", getVendorHeaders, updateFaq); // tested
router.delete("/venue-packages/:id/faqs/:index", getVendorHeaders, deleteFaq); // tested

// Videos for venue package
router.post("/venue-packages/:id/videos", getVendorHeaders, addVideo); // tested
router.put("/venue-packages/:id/videos", getVendorHeaders, updateVideo); // tested
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

// Add photos to album
router.patch(
  "/venue-packages/:id/albums/:albumIndex/photos",
  getVendorHeaders,
  createArrayUpload("photos", 5, 20),
  addPhotosToAlbum
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

/*============================================================================
    SERVICE PACKAGE ROUTES
=============================================================================*/
//#region SERVICE PACKAGE MANAGEMENT ROUTES

router.get(
  "/service-categories",
  getVendorHeaders,
  getCategoriesForServicePackage
); // tested

router.get(
  "/service-categories/:serviceCategory/service-sub-categories",
  getVendorHeaders,
  getServiceSubCategoriesForPackage
); // tested

router.get("/service-packages", getVendorHeaders, getServicePackages); // tested
router.get("/service-packages/:id", getVendorHeaders, getServicePackage); // tested

// CREATE service package
router.post(
  "/service-packages",
  getVendorHeaders,
  upload.single("featuredImage"),
  createServicePackage
); // tested

// UPDATE basic details of service package
router.put(
  "/service-packages/:id/basic",
  getVendorHeaders,
  upload.single("featuredImage"),
  updateServiceBasicDetails
); // tested

// FAQs for service package
router.post("/service-packages/:id/faqs", getVendorHeaders, addServiceFaq); // tested
router.put("/service-packages/:id/faqs", getVendorHeaders, updateServiceFaq); // tested
router.delete(
  "/service-packages/:id/faqs/:index",
  getVendorHeaders,
  deleteServiceFaq
); // tested

// Videos for service package
router.post("/service-packages/:id/videos", getVendorHeaders, addServiceVideo); // tested
router.put(
  "/service-packages/:id/videos",
  getVendorHeaders,
  updateServiceVideo
); // tested
router.delete(
  "/service-packages/:id/videos/:index",
  getVendorHeaders,
  deleteServiceVideo
); // tested

// Add new albums to service package
router.patch(
  "/service-packages/:id/albums",
  getVendorHeaders,
  upload.any(),
  addNewServiceAlbums
); // tested

// Update album titles
router.patch(
  "/service-packages/:id/albums/:albumIndex/titles",
  getVendorHeaders,
  updateServiceAlbumTitles
); // tested

// Add photos to album
router.patch(
  "/service-packages/:id/albums/:albumIndex/photos",
  getVendorHeaders,
  createArrayUpload("photos", 5, 20),
  addPhotosToServiceAlbum
); // tested

// Delete album photo
router.delete(
  "/service-packages/:id/albums/:albumIndex",
  getVendorHeaders,
  deleteServiceAlbum
); // tested

// Delete photo from album
router.delete(
  "/service-packages/:id/albums/:albumIndex/photos/:photoIndex",
  getVendorHeaders,
  deleteServiceAlbumPhoto
); // tested

/*============================================================================
    SERVICE PACKAGE REVIEWS ROUTES
=============================================================================*/

// Reviews for package
router.get(
  "/service-packages/:id/reviews",
  getVendorHeaders,
  getServiceReviewsForPackage
); // tested

router.post(
  "/service-packages/:id/reviews",
  getVendorHeaders,
  addServiceReviewToPackage
); // tested

router.put(
  "/service-packages/:id/reviews/:reviewId",
  getVendorHeaders,
  updateServiceReviewForPackage
); //  tested

// Delete review for package (admin only)
router.delete(
  "/service-packages/:id/reviews/:reviewId",
  getVendorHeaders,
  deleteServiceReviewForPackage
); // tested

router.put(
  "/service-packages/:id/status",
  getVendorHeaders,
  updateServiceApprovalAndVisibility
); // tested

// DELETE service package
router.delete("/service-packages/:id", getVendorHeaders, deleteServicePackage); // tested

//#endregion SERVICE PACKAGE MANAGEMENT ROUTES

export default router;
