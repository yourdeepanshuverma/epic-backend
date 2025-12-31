import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";
import SystemSetting from "../models/SystemSetting.js";

// Default Costs
const DEFAULT_LEAD_COSTS = {
  standard: 10,
  premium: 25,
  elite: 50,
};

export const getSystemSettings = asyncHandler(async (req, res) => {
  const { key } = req.params;
  let setting = await SystemSetting.findOne({ key });

  // If asking for lead_costs and not found, return default
  if (key === "lead_costs" && !setting) {
    return res.status(200).json(
      new SuccessResponse(200, "Settings fetched (default)", DEFAULT_LEAD_COSTS)
    );
  }

  if (!setting) {
    return res.status(200).json(new SuccessResponse(200, "Setting not found", null));
  }

  res.status(200).json(new SuccessResponse(200, "Settings fetched", setting.value));
});

export const updateSystemSettings = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  let setting = await SystemSetting.findOne({ key });

  if (setting) {
    setting.value = value;
    await setting.save();
  } else {
    setting = await SystemSetting.create({ key, value });
  }

  res.status(200).json(new SuccessResponse(200, "Settings updated", setting.value));
});

export const checkAdmin = asyncHandler(async (req, res, next) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }

  return res
    .status(200)
    .cookies("isAdmin", isAdmin, { httpOnly: true })
    .json(new SuccessResponse(200, "Admin check successful", { isAdmin }));
});
