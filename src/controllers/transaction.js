import crypto from "crypto";
import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";
import Transaction from "../models/Transaction.js";
import sendEmail from "../utils/sendEmail.js";
import { razorpay } from "../config/razorpay.js";
import { normalizePaymentStatus } from "../utils/paymentNormalizer.js";
import Vendor from "../models/Vendor.js";

// Get Razorpay Key
const getRazorpayKey = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(
      new SuccessResponse(
        200,
        "Razorpay Key fetched",
        process.env.RAZORPAY_KEY_ID
      )
    );
});

// Create Razorpay Order
const createRazorpayOrder = asyncHandler(async (req, res, next) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return next(new ErrorResponse(400, "Invalid amount"));
  }

  try {
    const options = {
      amount: amount * 100, // amount in paise
      currency: "INR",
      receipt: "order_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);
    if (!order) return next(new ErrorResponse(500, "Some error occurred"));

    return res
      .status(200)
      .json(new SuccessResponse(200, "Order created", order));
  } catch (err) {
    console.error(err);
    return next(new ErrorResponse(500, "Failed to create order"));
  }
});

// Verify Razorpay Payment
const verifyRazorpayPayment = asyncHandler(async (req, res, next) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return next(new ErrorResponse(400, "Missing required fields"));
    }

    const vendor = await Vendor.findById(req.vendor._id);
    if (!vendor) {
      return next(new ErrorResponse(404, "Vendor not found"));
    }

    // ✅ Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return next(new ErrorResponse(400, "Invalid signature"));
    }

    // Fetch full payment details
    const razorpayPaymentDetails = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    const normalized = normalizePaymentStatus(
      "razorpay",
      razorpayPaymentDetails
    );

    // Create Transaction entry
    const transaction = await Transaction.create({
      vendor: vendor._id,
      type: "credit",
      gateway: "razorpay",
      orderId: normalized.orderId,
      paymentId: normalized.paymentId,
      amount: normalized.raw.amount / 100, // convert paise to rupees
      currency: normalized.raw.currency,
      status: normalized.status,
      method: normalized.method,
      raw_response: normalized.raw,
      meta: {
        ip: req.ip,
        device: req.headers["user-agent"],
      },
    });

    if (!transaction) {
      return next(new ErrorResponse(500, "Failed to record transaction"));
    }

    // Update vendor wallet
    vendor.wallet.balance += transaction.amount;
    vendor.wallet.transactions.push(transaction._id);
    await vendor.save();

    res.status(200).json(
      new SuccessResponse(200, "Payment verified successfully", {
        transaction,
        updatedBalance: vendor.wallet.balance,
      })
    );

    // Send email notification
    await sendEmail(
      req.vendor.email,
      "Wallet Top-up Successful",
      `<h2>Payment Successful</h2>
       <p>Dear ${vendor.vendorName},</p>
       <p>You have successfully added <strong>${
         transaction.currency
       } ${transaction.amount}</strong> to your wallet.</p>
       <p>Transaction ID: ${transaction.paymentId}</p>
       <p>Current Balance: ${transaction.currency} ${vendor.wallet.balance}</p>
       <br>
       <p>Thank you,</p>
       <p>Team Cabnex</p>`
    );
  } catch (err) {
    console.error(err);
    next(new ErrorResponse(500, "Payment verification failed"));
  }
});

export { createRazorpayOrder, getRazorpayKey, verifyRazorpayPayment };
