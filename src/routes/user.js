import { Router } from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  googleAuth,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPassword,
} from "../controllers/user.js";
import { getUserHeaders } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/multer.js";

const router = Router();


// Public
router.post("/register", upload.single("profile"), registerUser);
router.post("/login", loginUser);
router.post("/google-auth", googleAuth);


/* ============================================================================
    FORGOT PASSWORD ROUTES
============================================================================= */
router.post("/send-forget-otp", sendForgotPasswordOtp); // tested
router.post("/verify-forget-otp", verifyForgotPasswordOtp); // tested
router.post("/reset-password", resetPassword); // tested



// Private
router.get("/profile", getUserHeaders, getUserProfile);
router.put(
  "/profile/:id",
  getUserHeaders,
  upload.single("profile"),
  updateUserProfile
);

export default router;
