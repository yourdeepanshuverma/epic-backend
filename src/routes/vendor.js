import express from "express";
import {
  createVendor,
  //   getVendorById,
  updateVendor,
  deleteVendor,
  updateVendorStatus,
  //   toggleFeaturedVendor,
  //   toggleVerifyBadge,
  //   updateLastActive,
} from "../controllers/vendor.js";
import { upload } from "../middlewares/mutler.js";

// import adminAuth from "../middlewares/adminAuth.js"; // admin protected routes
// import vendorAuth from "../middlewares/vendorAuth.js"; // vendor protected routes

const router = express.Router();

/* ============================================================================
    VENDOR CRUD (Admin Only)
============================================================================= */

// CREATE vendor
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
);

// GET single vendor
// router.get("/:id", getVendorById);

// UPDATE vendor
router.put(
  "/:id",
  upload.fields([
    { name: "profile", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },

    { name: "documents[gst]", maxCount: 1 },
    { name: "documents[pan]", maxCount: 1 },
    { name: "documents[idProof]", maxCount: 1 },
    { name: "documents[registrationProof]", maxCount: 1 },
  ]),
  updateVendor
);

// DELETE vendor
router.delete("/:id", deleteVendor);

/* ============================================================================
    ADMIN CONTROLS
============================================================================= */

// Update status (pending/active/rejected/blocked)
router.put("/:id/status", updateVendorStatus);

// Mark vendor as featured/unfeatured
// router.put("/:id/toggle-featured", toggleFeaturedVendor);

// Toggle verify badge
// router.put("/:id/toggle-verify", toggleVerifyBadge);

/* ============================================================================
    VENDOR SELF ACTIONS (Vendor Auth Required)
============================================================================= */

// Update last active timestamp
// router.put("/:id/last-active", vendorAuth, updateLastActive);

export default router;
