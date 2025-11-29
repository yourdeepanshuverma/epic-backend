import { v2 as cloudinary } from "cloudinary";
import { v4 as uuid } from "uuid";

const getBase64 = (file) =>
  `data:${file?.mimetype};base64,${file?.buffer.toString("base64")}`;

/**
 * Upload files to Cloudinary
 * @param {Array} files - Array of file paths or base64 strings
 * @returns {Array} - Array of uploaded file details (url, public_id)
 */

const uploadToCloudinary = async (files = []) => {
  try {
    const uploads = await Promise.all(
      files.map((file) =>
        cloudinary.uploader.upload(getBase64(file), {
          folder: process.env.CLOUDINARY_FOLDER || "Successsign",
          resource_type: "auto",
          public_id: uuid(),
        })
      )
    );

    return uploads.map((f) => ({ url: f.secure_url, public_id: f.public_id }));
  } catch (error) {
    throw new Error(`Failed to upload files to Cloudinary: ${error.message}`);
  }
};

/*
 * Delete files from Cloudinary
 * @param {Array} files - Array of file objects with public_id
 * @returns {Array} - Array of deletion results
 */
const deleteFromCloudinary = async (files = []) => {
  try {
    const deletePromises = files.map((file) =>
      cloudinary.uploader.destroy(file.public_id)
    );

    const results = await Promise.all(deletePromises);

    return results;
  } catch (error) {
    throw new Error("Failed to delete files from Cloudinary");
  }
};

export { deleteFromCloudinary, uploadToCloudinary, getBase64 };
