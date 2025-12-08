import { Router } from "express";
import {
  getAllVendors,
  getVendorById,
  updateVendorStatus,
  deleteVendor,
  updateAdminNotesForVendor,
  toggleAutoApprovePackages,
  toggleVerifyBadge,
  toggleFeaturedVendor,
} from "../controllers/vendor.js";
import {
  createService,
  deleteService,
  getAllServices,
  getServiceById,
  updateService,
} from "../controllers/service.js";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategory,
  updateCategory,
} from "../controllers/venueCategory.js";
import { upload } from "../middlewares/mutler.js";
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

// import adminAuth from "../middlewares/adminAuth.js"; // optional, if Admin-only

const router = Router();

//#region service routes
router.get("/services", getAllServices); // tested
router.post("/services", createService); // tested
router.get("/services/:id", getServiceById); // tested
router.put("/services/:id", updateService); // tested
router.delete("/services/:id", deleteService); // tested
//#endregion service routes

//#region venue category routes
router.post("/venue-categories", upload.single("image"), createCategory); // tested
router.get("/venue-categories", getCategories); // tested
router.get("/venue-categories/:id", getCategory); // tested
router.put("/venue-categories/:id", upload.single("image"), updateCategory); // tested
router.delete("/venue-categories/:id", deleteCategory); // tested
//#endregion venue category routes

//#region vendor management routes
router.get("/vendors", getAllVendors); // tested
router.get("/vendors/:id", getVendorById); // tested
router.put("/vendors/:id/status", updateVendorStatus); // tested
router.delete("/vendors/:id", deleteVendor); // tested

// Mark vendor as featured/unfeatured
router.put("/vendors/:id/toggle-featured", toggleFeaturedVendor); // tested

// Toggle verify badge
router.put("/vendors/:id/toggle-verify", toggleVerifyBadge); // tested

// Update admin notes
router.put("/vendors/:id/admin-notes", updateAdminNotesForVendor); // tested

// Update auto-approve packages setting
router.put("/vendors/:id/toggle-auto-approve", toggleAutoApprovePackages); // tested

//#endregion VENDOR MANAGEMENT ROUTES

//#region service category routes
router.post(
  "/service-categories",
  upload.single("image"),
  createServiceCategory
); // tested

router.get("/service-categories", getAllServiceCategories); // tested

router.get("/service-categories/:id", getServiceCategory);

router.put(
  "/service-categories/:id",
  upload.single("image"),
  updateServiceCategory
); // tested

router.delete("/service-categories/:id", deleteServiceCategory);

//#endregion service category routes

//#region service sub-category routes
router.post(
  "/service-sub-categories",
  upload.single("image"),
  createServiceSubCategory
); // tested

router.get("/service-sub-categories", getAllServiceSubCategories); // tested

router.get("/service-sub-categories/:id", getServiceSubCategory); // tested

router.put(
  "/service-sub-categories/:id",
  upload.single("image"),
  updateServiceSubCategory
); // tested

router.delete("/service-sub-categories/:id", deleteServiceSubCategory); // tested

//#endregion service sub-category routes

export default router;
