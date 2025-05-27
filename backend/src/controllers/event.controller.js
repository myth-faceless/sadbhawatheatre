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

  let photos = [
    {
      url: DEFAULT_ICON,
      public_id: null,
    },
  ];

  let castParsed = [];
  let showTimesParsed = [];

  try {
    castParsed = typeof cast === "string" ? JSON.parse(cast) : cast;
  } catch {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, "Invalid JSON in 'cast'");
  }

  try {
    showTimesParsed =
      typeof showTimes === "string" ? JSON.parse(showTimes) : showTimes;
  } catch {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, "Invalid JSON in 'showTimes'");
  }

  //upload files to cloudinary
  const uploadedFiles = req.files; // from multer
  try {
    if (uploadedFiles && uploadedFiles.length > 0) {
      // console.log("Uploaded Files:", uploadedFiles);
      const uploadedImages = await uploadFilesToCloudinary(uploadedFiles);

      // console.log("Cloudinary Response:", uploadedImages);

      // Replace default photos only if successful uploads exist
      if (uploadedImages.length > 0) {
        photos = uploadedImages.map((img) => ({
          url: img.url,
          public_id: img.public_id,
        }));
      }
    }
  } catch (error) {
    console.error("Cloudinary upload failed:", error.message);
    throw new ApiError(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.CLOUDINARY_UPLOAD_FAILED,
      [error.message]
    );
  }

  // Save event
  let newEvent;
  try {
    newEvent = await Event.create({
      type,
      title,
      description,
      director,
      cast: castParsed,
      startDate,
      endDate,
      venue,
      showTimes: showTimesParsed,
      adultTicketPrice,
      studentTicketPrice,
      photos,
    });
  } catch (err) {
    console.error("Error saving event:", err);
    throw new ApiError(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.FAILED,
      [err.message]
    );
  }
  return res
    .status(STATUS_CODES.CREATED)
    .json(
      new ApiResponse(
        STATUS_CODES.CREATED,
        newEvent,
        SUCCESS_MESSAGES.CREATED || "Event created successfully!"
      )
    );
});

const getAllEvents = asyncHandler(async (req, res) => {
  const allEvents = await Event.find();
  res
    .status(STATUS_CODES.SUCCESS)
    .json(
      new ApiResponse(
        STATUS_CODES.SUCCESS,
        allEvents,
        SUCCESS_MESSAGES.FETCHED_SUCCESSFULLY
      )
    );
});

const getEventById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(
      new ApiError(STATUS_CODES.BAD_REQUEST, ERROR_MESSAGES.INVALID_ID)
    );
  }

  const event = await Event.findById(id);

  if (!event) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND);
  }

  res
    .status(STATUS_CODES.SUCCESS)
    .json(
      new ApiResponse(
        STATUS_CODES.SUCCESS,
        event,
        SUCCESS_MESSAGES.FETCHED_SUCCESSFULLY
      )
    );
});

export { addEvent, getAllEvents, getEventById };
