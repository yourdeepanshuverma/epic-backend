import { Router } from "express";
import { getVendorHeaders } from "../middlewares/authMiddleware.js";
import {
  getMarketplaceLeads,
  buyLead,
  getMyLeads,
  getLeadBundles,
  buyLeadBundle,
  getLeadFilterOptions
} from "../controllers/lead.js";

const router = Router();

router.use(getVendorHeaders);

// Filters
router.get("/filters", getLeadFilterOptions);

// Marketplace
router.get("/marketplace", getMarketplaceLeads); // Show masked leads
router.post("/buy/:leadId", buyLead); // Buy single lead

// My Data
router.get("/my-leads", getMyLeads); // Show purchased leads

// Bundles
router.get("/bundles", getLeadBundles); // List bundles
router.post("/buy-bundle", buyLeadBundle); // Buy bundle

export default router;
