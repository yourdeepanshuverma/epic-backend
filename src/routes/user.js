import { Router } from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  googleAuth,
} from "../controllers/user.js";
import { getUserHeaders } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/multer.js";

const router = Router();

// Public
router.post("/register", upload.single("profile"), registerUser);
router.post("/login", loginUser);
router.post("/google-auth", googleAuth);

// Private
router.get("/profile", getUserHeaders, getUserProfile);
router.put(
  "/profile",
  getUserHeaders,
  upload.single("profile"),
  updateUserProfile
);

export default router;
