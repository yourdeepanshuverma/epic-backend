import { Router } from "express";
import {
  createRazorpayOrder,
  getRazorpayKey,
  verifyRazorpayPayment,
} from "../controllers/transaction.js";
import { getVendorHeaders } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(getVendorHeaders);
router.get("/get-razorpay-key", getRazorpayKey);
router.post("/create-order", createRazorpayOrder);
router.post("/verify-payment", verifyRazorpayPayment);

export default router;
