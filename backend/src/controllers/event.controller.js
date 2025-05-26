import { Event } from "../models/event.model.js";
import { DEFAULT_ICON } from "../constants/app.constants.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import {
  ERROR_MESSAGES,
  STATUS_CODES,
  SUCCESS_MESSAGES,
} from "../constants/message.constants.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  uploadFilesToCloudinary,
  deleteFileFromCloudinary,
} from "../utils/cloudinary.js";

const addEvent = asyncHandler(async (req, res) => {
  const {
    type,
    title,
    description,
    director,
    cast,
    startDate,
    endDate,
    venue,
    showTimes = [],
    adultTicketPrice,
    studentTicketPrice,
  } = req.body;

  if (
    !type ||
    !title ||
    !director ||
    !description ||
    !startDate ||
    !endDate ||
    !venue ||
    !adultTicketPrice ||
    !studentTicketPrice
  ) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.ALL_FIELDS_REQUIRED
    );
  }

  const existingEvent = await Event.findOne({ title, director });

  if (existingEvent) {
    throw new ApiError(
      STATUS_CODES.DUPLICATE_ENTRY,
      ERROR_MESSAGES.EVENT_ALREADY_EXISTS
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

  const newEvent = await Event.create({
    type,
    title,
    description,
    director,
    cast,
    startDate,
    endDate,
    venue,
    showTimes,
    adultTicketPrice,
    studentTicketPrice,
    photos: [
      {
        url: photoUrl,
        public_id: photoPublicId,
      },
    ],
  });

  return res
    .status(STATUS_CODES.CREATED)
    .json(
      new ApiResponse(
        STATUS_CODES.CREATED,
        newEvent,
        SUCCESS_MESSAGES.CREATED || "Event created successfully !"
      )
    );
});

export { addEvent };
