import asyncHandler from "../utils/asyncHandler.js";
import SuccessResponse from "../utils/SuccessResponse.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import Lead from "../models/Lead.js";
import LeadBundle from "../models/LeadBundle.js";
import Transaction from "../models/Transaction.js";
import Vendor from "../models/Vendor.js";
import SystemSetting from "../models/SystemSetting.js";
import VenuePackage from "../models/VenuePackage.js"; // Added for population
import ServicePackage from "../models/ServicePackage.js"; // Added for population
import VenueCategory from "../models/VenueCategory.js"; // Added for population
import ServiceSubCategory from "../models/ServiceSubCategory.js"; // Added for population
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

// Constant: Default price per lead if bought via Wallet directly
const PRICE_PER_LEAD = 50; 

/* ======================================================
    VENDOR: GET MARKETPLACE LEADS (Available to buy)
====================================================== */
export const getMarketplaceLeads = asyncHandler(async (req, res) => {
  const vendorId = req.vendor._id;
  const { page = 1, limit = 20, city, businessCategory } = req.query;

  const filter = {
    // Exclude leads already purchased by this vendor
    "purchasedBy.vendor": { $ne: vendorId }
  };
  
  if (city) filter["location.city"] = new RegExp(city, "i");
  if (businessCategory) filter.businessCategory = businessCategory;

  const leads = await Lead.find(filter)
    .populate({
      path: "interestedInPackage",
      select: "venueCategory serviceSubCategory",
      populate: [
        { path: "venueCategory", select: "name", strictPopulate: false },
        { path: "serviceSubCategory", select: "name", strictPopulate: false }
      ]
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  // Mask details (They will always be unpurchased here due to filter)
  const processedLeads = leads.map((lead) => {
    return {
      _id: lead._id,
      name: lead.name,
      location: lead.location,
      eventDate: lead.eventDate,
      guestCount: lead.guestCount,
      budget: lead.budget,
      message: lead.message,
      createdAt: lead.createdAt,
      isPurchased: false, // Always false in Marketplace now
      businessCategory: lead.businessCategory || "General Inquiry",
      category: lead.category,
      price: lead.price,
      // Masked Info
      phone: "**********",
      email: "****@****.com",
    };
  });

  const total = await Lead.countDocuments(filter);

  res.status(200).json(
    new SuccessResponse(200, "Leads fetched", {
      total,
      page,
      limit,
      leads: processedLeads,
      pricePerLead: PRICE_PER_LEAD
    })
  );
});

/* ======================================================
    VENDOR: BUY SINGLE LEAD
====================================================== */
export const buyLead = asyncHandler(async (req, res, next) => {
  const { leadId } = req.params;
  const { useCredits } = req.body; // boolean: true = use credits, false = use wallet balance
  const vendorId = req.vendor._id;

  const lead = await Lead.findById(leadId);
  if (!lead) return next(new ErrorResponse(404, "Lead not found"));

  // Check if already purchased
  const alreadyPurchased = lead.purchasedBy.some(
    (p) => p.vendor.toString() === vendorId.toString()
  );
  if (alreadyPurchased) {
    return res
      .status(200)
      .json(new SuccessResponse(200, "Lead already purchased", lead));
  }

  const vendor = await Vendor.findById(vendorId);
  const leadCategory = (lead.category || "standard").toLowerCase(); // standard, premium, elite

  // LOGIC: Use Credits or Wallet
  if (useCredits) {
    // 1. Fetch Dynamic Cost
    const settings = await SystemSetting.findOne({ key: "lead_costs" });
    const costs = settings ? settings.value : {};
    
    // Extract Cost from Tier Object
    // Structure: { standard: { credits: 10, amount: 50, ... }, ... }
    const tierData = costs[leadCategory] || costs["standard"];
    // If legacy format (direct number), handle it, otherwise extracting .credits
    let rawCost = (typeof tierData === 'object') ? tierData.credits : tierData;
    
    let cost = Number(rawCost);
    if (isNaN(cost)) cost = 10;

    // 2. Check Balance (Universal Credits - Simple Number)
    const availableCredits = Number(vendor.leadCredits) || 0;

    if (availableCredits < cost) {
      return next(
        new ErrorResponse(
          400,
          `Insufficient credits. This lead costs ${cost} credits. You have ${availableCredits}.`
        )
      );
    }

    // 3. Deduct Credits
    // Use $inc for atomic update - most robust way
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { $inc: { leadCredits: -cost } },
      { new: true }
    );
    
    // Update local variable for response
    vendor.leadCredits = updatedVendor.leadCredits;

    // Record Purchase on Lead
    lead.purchasedBy.push({
      vendor: vendorId,
      pricePaid: 0, // 0 cash, Paid via Credit
      method: "credit",
      meta: { creditCost: cost }
    });
  } else {
    // Pay with Wallet (Dynamic Price)
    // 1. Check Balance locally first (optimization)
    if (vendor.wallet.balance < lead.price) {
      return next(new ErrorResponse(400, "Insufficient wallet balance"));
    }

    // 2. Create Transaction Record
    const transaction = await Transaction.create({
      vendor: vendorId,
      type: "debit",
      gateway: "internal",
      orderId: `order_${uuidv4().replace(/-/g, "").substring(0, 14)}`,
      amount: lead.price,
      currency: "INR",
      status: "success",
      method: "wallet",
      meta: { description: `Purchased ${lead.category} Lead ${leadId}` },
    });

    // 3. Atomic Update: Deduct Balance & Push Transaction
    const updatedVendor = await Vendor.findByIdAndUpdate(
        vendorId,
        { 
            $inc: { "wallet.balance": -lead.price },
            $push: { "wallet.transactions": transaction._id }
        },
        { new: true }
    );

    // Double check if balance went negative (race condition check)
    if (updatedVendor.wallet.balance < 0) {
        // Rollback (Critical failure safety)
        await Vendor.findByIdAndUpdate(vendorId, { 
            $inc: { "wallet.balance": lead.price },
            $pull: { "wallet.transactions": transaction._id }
        });
        await Transaction.findByIdAndDelete(transaction._id);
        return next(new ErrorResponse(400, "Insufficient wallet balance (transaction failed)"));
    }

    // Update local variable for response
    vendor.wallet.balance = updatedVendor.wallet.balance;

    // Record Purchase on Lead
    lead.purchasedBy.push({
      vendor: vendorId,
      pricePaid: lead.price,
      method: "wallet",
    });
  }

  await lead.save();

  res
    .status(200)
    .json(new SuccessResponse(200, "Lead purchased successfully", {
        lead,
        leadCredits: vendor.leadCredits,
        walletBalance: vendor.wallet.balance
    }));
});

/* ======================================================
    VENDOR: GET ALL PURCHASED LEADS
====================================================== */
export const getMyLeads = asyncHandler(async (req, res) => {
  const vendorId = req.vendor._id;
  const { page = 1, limit = 20 } = req.query;

  const leads = await Lead.find({ "purchasedBy.vendor": vendorId })
    .populate({
      path: "interestedInPackage",
      select: "venueCategory serviceSubCategory",
      populate: [
        { path: "venueCategory", select: "name", strictPopulate: false },
        { path: "serviceSubCategory", select: "name", strictPopulate: false }
      ]
    })
    .sort({ "purchasedBy.purchasedAt": -1 }) // Sort by purchase time
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  // Process leads to match frontend structure
  const processedLeads = leads.map((lead) => {
    return {
      ...lead,
      isPurchased: true, // Explicitly set for UI to show "Unlocked" state
      businessCategory: lead.businessCategory || "General Inquiry"
    };
  });

  const total = await Lead.countDocuments({ "purchasedBy.vendor": vendorId });

  res.status(200).json(
    new SuccessResponse(200, "My purchased leads", {
      total,
      page,
      limit,
      leads: processedLeads,
    })
  );
});

/* ======================================================
    VENDOR: BUY LEAD BUNDLE (Bulk Credits)
====================================================== */
export const getLeadBundles = asyncHandler(async (req, res) => {
  const bundles = await LeadBundle.find({ isActive: true });
  res.status(200).json(new SuccessResponse(200, "Lead bundles", bundles));
});

export const buyLeadBundle = asyncHandler(async (req, res, next) => {
  const { bundleId } = req.body;
  const vendorId = req.vendor._id;

  const bundle = await LeadBundle.findById(bundleId);
  if (!bundle) return next(new ErrorResponse(404, "Bundle not found"));

  const vendor = await Vendor.findById(vendorId);

  // Check Balance
  if (vendor.wallet.balance < bundle.price) {
    return next(new ErrorResponse(400, "Insufficient wallet balance"));
  }

  // Deduct Wallet & Add Credits Atomically
  const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { 
          $inc: { 
              "wallet.balance": -bundle.price,
              "leadCredits": bundle.credits 
          }
      },
      { new: true }
  );

  vendor.leadCredits = updatedVendor.leadCredits;
  vendor.wallet.balance = updatedVendor.wallet.balance;

  // Create Transaction
  const transaction = await Transaction.create({
    vendor: vendorId,
    type: "debit",
    gateway: "internal",
    orderId: `order_${uuidv4().replace(/-/g, "").substring(0, 14)}`,
    amount: bundle.price,
    currency: "INR",
    status: "success",
    method: "wallet",
    meta: {
      description: `Purchased Bundle: ${bundle.name} (${bundle.credits} Credits)`,
    },
  });

  vendor.wallet.transactions.push(transaction._id);
  await vendor.save(); // Just to save transaction ref, balance is already updated

  res.status(200).json(
    new SuccessResponse(200, "Bundle purchased successfully", {
      leadCredits: vendor.leadCredits,
      walletBalance: vendor.wallet.balance,
    })
  );
});

/* ======================================================
    ADMIN: CREATE LEAD BUNDLE
====================================================== */
export const createLeadBundle = asyncHandler(async(req, res) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }
    const bundle = await LeadBundle.create(req.body);
    res.status(201).json(new SuccessResponse(201, "Bundle created", bundle));
});

/* ======================================================
    COMMON: GET FILTER OPTIONS (Business Categories)
====================================================== */
export const getLeadFilterOptions = asyncHandler(async (req, res) => {
  const categories = await Lead.distinct("businessCategory");
  res.status(200).json(new SuccessResponse(200, "Filter options", { categories }));
});
