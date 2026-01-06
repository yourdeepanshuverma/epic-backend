import express from "express";
import {
  createBlog,
  getAllBlogs,
  getBlog,
  updateBlog,
  deleteBlog,
} from "../controllers/blog.js";
import { getVendorHeaders } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/mutler.js";

const router = express.Router();

router.route("/")
    .post(getVendorHeaders, upload.single("image"), createBlog)
    .get(getVendorHeaders, getAllBlogs);

router.route("/:slug")
    .get(getVendorHeaders, getBlog);

router.route("/:id")
    .put(getVendorHeaders, upload.single("image"), updateBlog)
    .delete(getVendorHeaders, deleteBlog);

export default router;
