import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadFilesToCloudinary = async (files) => {
  const uploads = [];

  const fileArray = Array.isArray(files) ? files : [files];

  for (const file of fileArray) {
    const localPath = file.path;

    try {
      const response = await cloudinary.uploader.upload(localPath, {
        resource_type: "auto",
      });

      fs.unlinkSync(localPath); // remove temp file
      uploads.push({
        url: response.secure_url,
        public_id: response.public_id,
      });
    } catch (error) {
      console.error("Failed to upload to Cloudinary", error);
      fs.unlinkSync(localPath);
      throw new Error("Cloudinary upload failed");
    }
  }

  return uploads;
};

export const deleteFileFromCloudinary = async (publicId) => {
  try {
    const response = await cloudinary.uploader.destroy(publicId);
    return response;
  } catch (error) {
    console.error("Failed to delete from Cloudinary", error);
    throw new Error("Cloudinary delete failed !");
  }
};
