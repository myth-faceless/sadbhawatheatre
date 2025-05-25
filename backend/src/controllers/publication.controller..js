import { DEFAULT_ICON } from "../constants/app.constants.js";
import {
  ERROR_MESSAGES,
  STATUS_CODES,
  SUCCESS_MESSAGES,
} from "../constants/message.constants.js";
import { Publication } from "../models/publication.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFilesToCloudinary } from "../utils/cloudinary.js";

const addPublication = asyncHandler(async (req, res) => {
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
    photo: {
      url: photoUrl,
      public_id: photoPublicId,
    },
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

const getAllPublications = asyncHandler(async (req, res) => {
  const allPublications = await Publication.find();
  res
    .status(STATUS_CODES.SUCCESS)
    .json(
      new ApiResponse(
        STATUS_CODES.SUCCESS,
        allPublications,
        SUCCESS_MESSAGES.FETCHED_SUCCESSFULLY
      )
    );
});

const getPublicationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(
      new ApiError(STATUS_CODES.BAD_REQUEST, ERROR_MESSAGES.INVALID_USER_ID)
    );
  }

  const publication = await Publication.findById(id);

  if (!publication) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND);
  }

  res
    .status(STATUS_CODES.SUCCESS)
    .json(
      new ApiResponse(
        STATUS_CODES.SUCCESS,
        publication,
        SUCCESS_MESSAGES.FETCHED_SUCCESSFULLY
      )
    );
});

const updatePublicationById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { title, description, author, publicationDate } = req.body;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(
      new ApiError(STATUS_CODES.BAD_REQUEST, ERROR_MESSAGES.INVALID_ID)
    );
  }

  const publication = await Publication.findById(id);

  if (!publication) {
    return next(new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND));
  }

  const photoFile = req.file;

  if (photoFile) {
    if (publication.photo.public_id) {
      await deleteFileFromCloudinary(publication.photo.public_id);
    }
    try {
      const [uploadedPhoto] = await uploadFilesToCloudinary(photoFile);
      publication.photo.url = uploadedPhoto.url;
      publication.photo.public_id = uploadedPhoto.public_id;
    } catch (uploadError) {
      throw new ApiError(
        STATUS_CODES.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.CLOUDINARY_AVATAR_UPLOAD_FAILED,
        [uploadError.message]
      );
    }
  }

  publication.title = title || publication.title;
  publication.description = description || publication.description;
  publication.author = author || publication.author;
  publication.publicationDate = publicationDate || publication.publicationDate;

  await publication.save();

  res
    .status(STATUS_CODES.SUCCESS)
    .json(
      new ApiResponse(
        STATUS_CODES.SUCCESS,
        publication,
        SUCCESS_MESSAGES.UPDATED_SUCCESSFULLY
      )
    );
});

const deletePublicationById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(
      new ApiError(STATUS_CODES.BAD_REQUEST, ERROR_MESSAGES.INVALID_USER_ID)
    );
  }

  const publication = await Publication.findById(id);

  if (!publication) {
    return next(new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND));
  }

  if (publication.photo?.public_id) {
    await deleteFileFromCloudinary(publication.photo.public_id);
  }

  await publication.deleteOne();

  res
    .status(STATUS_CODES.SUCCESS)
    .json(
      new ApiResponse(STATUS_CODES.SUCCESS, null, SUCCESS_MESSAGES.DELETED)
    );
});

export {
  addPublication,
  getAllPublications,
  getPublicationById,
  updatePublicationById,
  deletePublicationById,
};
