import { MulterError } from "multer";

const errorMiddleware = (err, req, res, next) => {
  err.message ||= "Internal Server Error";
  err.statusCode ||= 500;

  // Handle Multer file upload errors
  if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
    const uploadedSize =
      req?.file?.size ||
      req?.files?.[0]?.size ||
      parseInt(req.headers["content-length"] || 0);
    const uploadedSizeMB = uploadedSize
      ? (uploadedSize / (1024 * 1024)).toFixed(2)
      : "?";

    const limitMB = req.fileSizeLimit
      ? (req.fileSizeLimit / (1024 * 1024)).toFixed(2)
      : 5; // fallback if not set

    err.message = `File size too large (${uploadedSizeMB}MB). Maximum allowed is ${limitMB}MB.`;
    err.statusCode = 400;
  }

  // Handle MongoDB duplicate key error
  if (err.code === 11000 && err.keyPattern) {
    const fields = Object.keys(err.keyPattern).join(", ");
    err.message = `Duplicate field(s): ${fields}`;
    err.statusCode = 400;
  }

  // Handle Mongoose CastError (invalid MongoDB ObjectId)
  if (err.name === "CastError") {
    err.message = `Invalid value for ${err.path}`;
    err.statusCode = 400;
  }

  if (err.name === "ValidationError") {
    const messages = Object.keys(err.errors).map((key) => key);

    err.message = `Required fields are missing: ${messages.join(", ")}`;
    err.statusCode = 400;
  }

  // Ensure response consistency
  return res.status(err.statusCode).json({
    statusCode: err.statusCode,
    success: false,
    message: process.env.NODE_ENV === "development" ? err.stack : err.message, // Show stack only in development
    errors: err.errors && Array.isArray(err.errors) ? err.errors : [], // Ensure errors is always an array
  });
};

export default errorMiddleware;
