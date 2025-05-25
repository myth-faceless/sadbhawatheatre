import { DEFAULT_ICON } from "../constants/app.constants";
import {
  ERROR_MESSAGES,
  STATUS_CODES,
  SUCCESS_MESSAGES,
} from "../constants/message.constants";
import { Publication } from "../models/publication.model";
import { ApiError } from "../utils/ApiErrors";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadFilesToCloudinary } from "../utils/cloudinary";

const createPublication = asyncHandler(async (req, res) => {
  const { title, description, author, publicationDate } = req.body;

  if (!title || !description || !author || !publicationDate) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.ALL_FIELDS_REQUIRED
    );
  }

  const existingPublication = await Publication.findOne({ title, author });
  if (existingPublication) {
    throw new ApiError(
      STATUS_CODES.DUPLICATE_ENTRY,
      ERROR_MESSAGES.PUBLICATION_ALREADY_EXISTS
    );
  }

  let photoUrl = DEFAULT_ICON;
  let photoPublicId = null;

  const uploadedFile = req.file;
  if (uploadedFile) {
    try {
      const [uploadedImage] = await uploadFilesToCloudinary(uploadedFile);
      photoUrl = uploadedImage.url;
      photoPublicId = uploadedImage.public_id;
    } catch (error) {
      throw new ApiError(
        STATUS_CODES.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.CLOUDINARY_UPLOAD_FAILED,
        [error.message]
      );
    }
  }
  const newPublication = await Publication.create({
    title,
    description,
    author,
    publicationDate,
    photo: photoUrl,
    public_id: photoPublicId,
  });
  return res
    .status(STATUS_CODES.CREATED)
    .json(
      new ApiResponse(
        STATUS_CODES.CREATED,
        newPublication,
        SUCCESS_MESSAGES.PUBLICATION_CREATED
      )
    );
});

export { createPublication };
