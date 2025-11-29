import multer from "multer";

export const upload = multer({
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB
  storage: multer.memoryStorage(),
});

export const createArrayUpload = (fileName, maxSizeMB = 5, maxCount = 10) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const upload = multer({
    limits: { fileSize: maxSizeBytes },
  });

  return (req, res, next) => {
    // store limit on req for error middleware to read later
    req.fileSizeLimit = maxSizeBytes;

    upload.array(fileName, maxCount)(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  };
};
