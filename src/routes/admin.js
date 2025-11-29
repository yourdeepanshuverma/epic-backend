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

router.get("/vendors", getAllVendors);

export default router;
