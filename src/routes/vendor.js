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

router.use(getVendorHeaders);

router
  .route("/profile")
  // GET vendor profile
  .get(getVendorProfile) // tested
  // UPDATE vendor profile
  .put(
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

export default router;
