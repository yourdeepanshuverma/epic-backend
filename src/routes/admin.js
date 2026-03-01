import { Router } from "express";
import {
  bulkCreateVendors,
  checkAdmin,
  getSystemSettings,
  updateSystemSettings,
  getAdminVenuePackages,
  getAdminServicePackages,
  updateVenuePackageStatus,
  updateServicePackageStatus,
} from "../controllers/admin.js";
import {
  createService,
  deleteService,
  getAllServices,
  getServiceById,
  updateService,
} from "../controllers/service.js";
import {
  createServiceCategory,
  deleteServiceCategory,
  getAllServiceCategories,
  getServiceCategory,
  updateServiceCategory,
} from "../controllers/serviceCategory.js";
import {
  createServiceSubCategory,
  deleteServiceSubCategory,
  getAllServiceSubCategories,
  getServiceSubCategory,
  updateServiceSubCategory,
} from "../controllers/serviceSubCategory.js";
import {
  deleteVendor,
  getAllVendors,
  getVendorById,
  toggleAutoApprovePackages,
  toggleFeaturedVendor,
  toggleVerifyBadge,
  updateAdminNotesForVendor,
  updateVendorStatus,
  updateVendorDetailsByAdmin, // Import new controller
} from "../controllers/vendor.js";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategory,
  updateCategory,
} from "../controllers/venueCategory.js";
import { getAdminHeaders } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/multer.js";
import { updateUserProfile } from "../controllers/user.js";
import { createLeadBundle } from "../controllers/lead.js";
import { migrateVendorCredits } from "../controllers/migration.js";
import { refreshAccessToken } from "../controllers/authController.js";

// import adminAuth from "../middlewares/adminAuth.js"; // optional, if Admin-only

const router = Router();

router.get("/check", getAdminHeaders, checkAdmin); // tested

//access token refresh route
router.post("/refresh", refreshAccessToken);


// System Settings
router.get("/settings/:key",getAdminHeaders, getSystemSettings);
router.put("/settings/:key", getAdminHeaders,updateSystemSettings);
router.post("/migrate-credits",getAdminHeaders, migrateVendorCredits);

// Admin Lead Bundle Management
router.post("/lead-bundles",getAdminHeaders, createLeadBundle);

// --- ADMIN PACKAGE MANAGEMENT ---
router.get("/venue-packages", getAdminHeaders,getAdminVenuePackages); //-----------------------------------------------
router.put("/venue-packages/:id/status", getAdminHeaders,updateVenuePackageStatus);

router.get("/service-packages", getAdminHeaders,getAdminServicePackages); //------------------------------------------------
router.put("/service-packages/:id/status",getAdminHeaders, updateServicePackageStatus);

//#region service routes
router.get("/services",getAdminHeaders, getAllServices); // tested ------------------------------------------------
router.post("/services", getAdminHeaders,createService); // tested
router.get("/services/:id",getAdminHeaders, getServiceById); // tested---------------------------------------------
router.put("/services/:id", getAdminHeaders, updateService); // tested-----------------------------------------------
router.delete("/services/:id", getAdminHeaders, deleteService); // tested
//#endregion service routes

//#region venue category routes
router.post("/venue-categories", getAdminHeaders,upload.single("image"), createCategory); // tested
router.get("/venue-categories", getAdminHeaders,getCategories); // tested------------------------------------------------
router.get("/venue-categories/:id", getAdminHeaders,getCategory); // tested----------------------------------------------
router.put("/venue-categories/:id",getAdminHeaders, upload.single("image"), updateCategory); // tested
router.delete("/venue-categories/:id", getAdminHeaders,deleteCategory); // tested
//#endregion venue category routes

//#region vendor management routes
router.get("/vendors", getAdminHeaders,getAllVendors); // tested ------------------------------------------------
router.post("/vendors/bulk-create", getAdminHeaders,bulkCreateVendors); // new route
router.get("/vendors/:id", getAdminHeaders,getVendorById); // tested ------------------------------------------------
router.put("/vendors/:id/status", getAdminHeaders,updateVendorStatus); // tested
router.delete("/vendors/:id", getAdminHeaders, deleteVendor); // tested   ########

router.put(
  "/vendors/:id",getAdminHeaders,
  upload.fields([
    { name: 'profile', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
    { name: 'documents[gst]', maxCount: 1 },
    { name: 'documents[pan]', maxCount: 1 },
    { name: 'documents[idProof]', maxCount: 1 },
    { name: 'documents[registrationProof]', maxCount: 1 },
  ]),
  updateVendorDetailsByAdmin
); // New route for admin to update full vendor details

// Mark vendor as featured/unfeatured
router.put("/vendors/:id/toggle-featured", getAdminHeaders,toggleFeaturedVendor); // tested

// Toggle verify badge
router.put("/vendors/:id/toggle-verify",getAdminHeaders, toggleVerifyBadge); // tested

// Update admin notes
router.put("/vendors/:id/admin-notes", getAdminHeaders, updateAdminNotesForVendor); // tested

// Update auto-approve packages setting
router.put("/vendors/:id/toggle-auto-approve", getAdminHeaders,toggleAutoApprovePackages); // tested

//#endregion VENDOR MANAGEMENT ROUTES

//#region service category routes
router.post(
  "/service-categories",getAdminHeaders,
  upload.single("image"),
  createServiceCategory
); // tested

router.get("/service-categories",getAdminHeaders, getAllServiceCategories); // tested -------------------------------------

router.get("/service-categories/:id", getAdminHeaders,getServiceCategory);// tested -------------------------------------

router.put(
  "/service-categories/:id",
  getAdminHeaders,
  upload.single("image"),
  updateServiceCategory
); // tested

router.delete("/service-categories/:id",getAdminHeaders, deleteServiceCategory);

//#endregion service category routes

//#region service sub-category routes
router.post(
  "/service-sub-categories",getAdminHeaders,
  upload.single("image"),
  createServiceSubCategory
); // tested

router.get("/service-sub-categories",getAdminHeaders, getAllServiceSubCategories); // tested---------------------------------

router.get("/service-sub-categories/:id", getAdminHeaders,getServiceSubCategory); // tested----------------------------------

router.put(
  "/service-sub-categories/:id",getAdminHeaders,
  upload.single("image"),
  updateServiceSubCategory
); // tested

router.delete("/service-sub-categories/:id",getAdminHeaders, deleteServiceSubCategory); // tested

//#endregion service sub-category routes


router.put("/user-status/:id", getAdminHeaders,updateUserProfile); // tested

export default router;
