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
} from "../controllers/public.js";

const router = Router();

// Public Routes
router.get("/venue-categories", getAllVenueCategories);
router.get("/service-categories", getAllServiceCategories);
router.get("/service-categories/:categoryId/sub-categories", getServiceSubCategoriesByCategory);

router.get("/venue-packages/popular", getPopularVenuePackages); // Specific route before generic
router.get("/service-packages/popular", getPopularServicePackages); // Specific route before generic

router.get("/venue-packages", getAllVenuePackages);
router.get("/service-packages", getAllServicePackages);
router.get("/venue-packages/:slug", getVenuePackage);
router.get("/service-packages/:slug", getServicePackage);
router.post("/inquiry", createLead);

// Blog Routes (Public)
router.get("/blogs", getPublicBlogs);
router.get("/blogs/:slug", getPublicBlog);

export default router;
