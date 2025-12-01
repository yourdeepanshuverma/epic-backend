import { Router } from "express";
import {
  createVenueCategory,
  getAllVenueCategories,
  getVenueCategory,
  updateVenueCategory,
  deleteVenueCategory,
  addSection,
  deleteSection,
  addField,
  updateField,
  deleteField,
  getAllVendors,
  getVendorById,
  updateVendorStatus,
  deleteVendor,
  updateAdminNotesForVendor,
  toggleAutoApprovePackages,
  toggleVerifyBadge,
  toggleFeaturedVendor,
} from "../controllers/admin.js";
import { upload } from "../middlewares/mutler.js";

// import adminAuth from "../middlewares/adminAuth.js"; // optional, if Admin-only

const router = Router();

//#region VENUE CATEGORY CRUD

// Create Category
router.post("/venue-category", upload.single("image"), createVenueCategory); // tested

// Get All Categories
router.get("/venue-category", getAllVenueCategories); // tested

// Get Single Category
router
  .route("/venue-category/:id")
  .get(getVenueCategory) // tested
  // Update Category
  .put(upload.single("image"), updateVenueCategory) // tested
  // Delete Category
  .delete(deleteVenueCategory); // tested

/* VENUE CATEGORY SECTION CRUD */

// Add Section
router.post("/venue-category/:id/sections", addSection); // tested

// Delete Section
router.delete("/venue-category/:id/sections/:sectionKey", deleteSection); // tested

/* VENUE CATEGORY FIELD CRUD */

// Add Field
router.post("/venue-category/:id/fields", addField); // tested

router
  .route("/venue-category/:id/fields/:fieldKey")
  // Update Field
  .put(updateField) // tested
  // Delete Field
  .delete(deleteField); // tested

//#endregion VENUE PACKAGE CRUD

//#region VENDOR MANAGEMENT ROUTES

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

export default router;
