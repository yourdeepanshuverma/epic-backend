import asyncHandler from "../utils/asyncHandler.js";
import SuccessResponse from "../utils/SuccessResponse.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import Lead from "../models/Lead.js";
import LeadBundle from "../models/LeadBundle.js";
import Transaction from "../models/Transaction.js";
import Vendor from "../models/Vendor.js";
import SystemSetting from "../models/SystemSetting.js";

// Constant: Default price per lead if bought via Wallet directly
const PRICE_PER_LEAD = 50; 

/* ======================================================
    VENDOR: GET MARKETPLACE LEADS (Available to buy)
====================================================== */
export const getMarketplaceLeads = asyncHandler(async (req, res) => {
  const vendorId = req.vendor._id;
  const { page = 1, limit = 20, city } = req.query;

  const filter = {
    // Exclude leads already purchased by this vendor
    "purchasedBy.vendor": { $ne: vendorId }
  };
  
  if (city) filter["location.city"] = new RegExp(city, "i");

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
    // Extract Business Category Name
    let businessCategory = "General Inquiry";
    if (lead.interestedInPackage) {
        businessCategory = lead.interestedInPackage.venueCategory?.name || 
                           lead.interestedInPackage.serviceSubCategory?.name || 
                           "General Inquiry";
    }

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
      businessCategory,
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
  const leadCategory = lead.category.toLowerCase(); // standard, premium, elite

  // LOGIC: Use Credits or Wallet
  if (useCredits) {
    // 1. Fetch Dynamic Cost
    const settings = await SystemSetting.findOne({ key: "lead_costs" });
    const costs = settings ? settings.value : { standard: 10, premium: 25, elite: 50 }; // Default fallback
    
    const cost = costs[leadCategory] || 10; // Default to standard cost if category unknown

    // 2. Check Balance (Universal Credits)
    // Handle migration edge case: if vendor.leadCredits is an object, try to convert or fail gracefully
    let availableCredits = 0;
    if (typeof vendor.leadCredits === 'number') {
        availableCredits = vendor.leadCredits;
    } else if (typeof vendor.leadCredits === 'object') {
        // Simple on-the-fly migration for this request only (doesn't save to DB yet)
        availableCredits = (vendor.leadCredits.standard || 0) * 10 + 
                           (vendor.leadCredits.premium || 0) * 25 + 
                           (vendor.leadCredits.elite || 0) * 50;
    }

    if (availableCredits < cost) {
      return next(
        new ErrorResponse(
          400,
          `Insufficient credits. This lead costs ${cost} credits. You have ${availableCredits}.`
        )
      );
    }

    // 3. Deduct Credits
    // If schema is still object in DB but we want to save number, we might need a migration script.
    // For now, let's assume we are forcefully updating to Number.
    // Since we changed the schema, Mongoose might cast this automatically if we just set it.
    vendor.leadCredits = availableCredits - cost;
    await vendor.save();

    // Record Purchase on Lead
    lead.purchasedBy.push({
      vendor: vendorId,
      pricePaid: 0, // 0 cash, Paid via Credit
      method: "credit",
      meta: { creditCost: cost }
    });
  } else {
    // Pay with Wallet (Dynamic Price)
    if (vendor.wallet.balance < lead.price) {
      return next(new ErrorResponse(400, "Insufficient wallet balance"));
    }

    // Deduct Wallet
    vendor.wallet.balance -= lead.price;

    // Create Transaction Record
    const transaction = await Transaction.create({
      vendor: vendorId,
      type: "debit",
      gateway: "internal",
      amount: lead.price,
      currency: "INR",
      status: "success",
      method: "wallet",
      meta: { description: `Purchased ${lead.category} Lead ${leadId}` },
    });

    vendor.wallet.transactions.push(transaction._id);
    await vendor.save();

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
    // Extract Business Category Name
    let businessCategory = "General Inquiry";
    if (lead.interestedInPackage) {
        businessCategory = lead.interestedInPackage.venueCategory?.name || 
                           lead.interestedInPackage.serviceSubCategory?.name || 
                           "General Inquiry";
    }

    return {
      ...lead,
      isPurchased: true, // Explicitly set for UI to show "Unlocked" state
      businessCategory
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

  // Deduct Wallet
  vendor.wallet.balance -= bundle.price;

  // Add Universal Credits (handle legacy object if present)
  let currentCredits = 0;
  if (typeof vendor.leadCredits === 'number') {
      currentCredits = vendor.leadCredits;
  } else if (typeof vendor.leadCredits === 'object') {
      // Lazy migration
      currentCredits = (vendor.leadCredits.standard || 0) * 10 + 
                       (vendor.leadCredits.premium || 0) * 25 + 
                       (vendor.leadCredits.elite || 0) * 50;
  }

  vendor.leadCredits = currentCredits + bundle.credits;

  // Create Transaction
  const transaction = await Transaction.create({
    vendor: vendorId,
    type: "debit",
    gateway: "internal",
    amount: bundle.price,
    currency: "INR",
    status: "success",
    method: "wallet",
    meta: {
      description: `Purchased Bundle: ${bundle.name} (${bundle.credits} Credits)`,
    },
  });

  vendor.wallet.transactions.push(transaction._id);
  await vendor.save();

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
    const bundle = await LeadBundle.create(req.body);
    res.status(201).json(new SuccessResponse(201, "Bundle created", bundle));
});
