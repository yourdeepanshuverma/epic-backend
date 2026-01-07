import { Router } from "express";
import {
  getAllVenuePackages,
  getAllServicePackages,
  getServicePackage,
  getAllVenueCategories,
  getAllServiceCategories,
  getServiceSubCategoriesByCategory,
  getVenuePackage,
  createLead,
  getPublicBlogs,
  getPublicBlog,
  getPopularVenuePackages,
  getPopularServicePackages,
  getPremiumVenuePackages,
  getPremiumServicePackages,
} from "../controllers/public.js";

const router = Router();

// Public Routes
router.get("/venue-categories", getAllVenueCategories);
router.get("/service-categories", getAllServiceCategories);
router.get("/service-categories/:categoryId/sub-categories", getServiceSubCategoriesByCategory);

router.get("/venue-packages/popular", getPopularVenuePackages);
router.get("/service-packages/popular", getPopularServicePackages);

router.get("/venue-packages/premium", getPremiumVenuePackages); // Specific route
router.get("/service-packages/premium", getPremiumServicePackages); // Specific route

router.get("/venue-packages", getAllVenuePackages);
router.get("/service-packages", getAllServicePackages);
router.get("/venue-packages/:slug", getVenuePackage);
router.get("/service-packages/:slug", getServicePackage);
router.post("/inquiry", createLead);

// Blog Routes (Public)
router.get("/blogs", getPublicBlogs);
router.get("/blogs/:slug", getPublicBlog);

export default router;
