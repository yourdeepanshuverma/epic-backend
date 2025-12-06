import dotenv from "@dotenvx/dotenvx";
import { v2 as cloudinary } from "cloudinary";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import connectDB from "./db/index.js";
import errorMiddleware from "./middlewares/errorMiddleware.js";
import adminRoutes from "./routes/admin.js";
import locationRoutes from "./routes/location.js";
import vendorRoutes from "./routes/vendor.js";

const app = express();
const port = process.env.PORT || 3000;
const node_env = process.env.NODE_ENV || "development";

dotenv.config({
  path: node_env === "production" ? ".env.prod" : ".env.local",
});

connectDB();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(
  express.json({
    limit: "16kb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "16kb",
  })
);

app.use(
  cookieParser({
    limit: "16kb",
  })
);

const allowedOrigins = [
  process.env.SITE_URL,
  process.env.ADMIN_URL,
  node_env === "development" ? "http://localhost:5173" : null,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use("/api/v1/vendor", vendorRoutes);
app.use("/api/v1/location", locationRoutes);
app.use("/api/v1/admin", adminRoutes);

// Error Middleware
app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Server is running on port ${port} in ${node_env} Mode`);
});
