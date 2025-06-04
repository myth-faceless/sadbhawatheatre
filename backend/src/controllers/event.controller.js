import { Event } from "../models/event.model.js";
import { Showtime } from "../models/showTime.model.js";
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
import { updateProfile } from "./global.controller.js";

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

  console.log("Incoming form-data:", req.body);

  if (
    !type ||
    !title ||
    !director ||
    !description ||
    !startDate ||
    !endDate ||
    !venue ||
    !showTimes ||
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
  try {
    castParsed = typeof cast === "string" ? JSON.parse(cast) : cast;
    for (const member of castParsed) {
      if (!member.name) {
        throw new ApiError(
          STATUS_CODES.BAD_REQUEST,
          "Each cast member must include a 'name'"
        );
      }
    }
  } catch {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, "Invalid JSON in 'cast'");
  }

  let showTimesParsed = [];
  try {
    console.log("Raw showTimes string before parsing:", showTimes);

    const cleanShowTimesStr =
      typeof showTimes === "string" ? showTimes.trim() : showTimes;
    showTimesParsed =
      typeof cleanShowTimesStr === "string"
        ? JSON.parse(cleanShowTimesStr)
        : cleanShowTimesStr;

    console.log("Parsed showTimes array:", showTimesParsed);

    if (!Array.isArray(showTimesParsed) || showTimesParsed.length === 0) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "showTimes must be a non-empty array"
      );
    }

    // Validate each showtime object
    for (const st of showTimesParsed) {
      if (!st.showtime || !st.date) {
        throw new ApiError(
          STATUS_CODES.BAD_REQUEST,
          "Each showtime must include 'showtime' and 'date'"
        );
      }

      const showtimeExists = await Showtime.findById(st.showtime);
      if (!showtimeExists) {
        throw new ApiError(
          STATUS_CODES.NOT_FOUND,
          `Showtime with ID ${st.showtime} does not exist`
        );
      }

      const stDate = new Date(st.date);
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (stDate < start || stDate > end) {
        throw new ApiError(
          STATUS_CODES.BAD_REQUEST,
          `Showtime date ${
            stDate.toISOString().split("T")[0]
          } is outside the event range`
        );
      }
    }
  } catch (err) {
    console.error("Error parsing showTimes or validating showTimes:", err);
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      `Invalid JSON in 'showTimes' or validation failed: ${err.message}`
    );
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

    return res
      .status(STATUS_CODES.CREATED)
      .json(
        new ApiResponse(
          STATUS_CODES.CREATED,
          newEvent,
          SUCCESS_MESSAGES.CREATED || "Event created successfully!"
        )
      );
  } catch (err) {
    console.error("Error saving event:", err);
    throw new ApiError(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.FAILED,
      [err.message]
    );
  }
});

const getAllEvents = asyncHandler(async (req, res) => {
  const allEvents = await Event.find().populate("showTimes.showtime");
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

  const event = await Event.findById(id).populate("showTimes.showtime");

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

const updateEventById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

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

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, ERROR_MESSAGES.INVALID_ID);
  }

  const event = await Event.findById(id);
  if (!event) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND);
  }

  const existingEvent = await Event.findOne({ title, director });

  if (existingEvent && existingEvent._id.toString() !== id) {
    throw new ApiError(
      STATUS_CODES.DUPLICATE_ENTRY,
      ERROR_MESSAGES.EVENT_ALREADY_EXISTS
    );
  }

  // Parse cast
  let castParsed = [];
  try {
    castParsed = typeof cast === "string" ? JSON.parse(cast.trim()) : cast;
    for (const member of castParsed) {
      if (!member.name) {
        throw new ApiError(
          STATUS_CODES.BAD_REQUEST,
          "Each cast member must include a 'name'"
        );
      }
    }
  } catch {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, "Invalid JSON in 'cast'");
  }

  // Parse and validate showTimes
  let showTimesParsed = [];
  try {
    showTimesParsed =
      typeof showTimes === "string" ? JSON.parse(showTimes.trim()) : showTimes;

    if (!Array.isArray(showTimesParsed)) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "'showTimes' must be an array"
      );
    }

    const validShowtimes = [];

    for (const st of showTimesParsed) {
      if (!st.showtime || !st.date) {
        throw new ApiError(
          STATUS_CODES.BAD_REQUEST,
          "Each showtime must include 'showtime' and 'date'"
        );
      }

      const showtimeExists = await Showtime.findById(st.showtime);
      if (!showtimeExists) {
        throw new ApiError(
          STATUS_CODES.NOT_FOUND,
          `Showtime with ID ${st.showtime} does not exist`
        );
      }

      const stDate = new Date(st.date);
      const start = new Date(startDate || event.startDate);
      const end = new Date(endDate || event.endDate);

      if (stDate < start || stDate > end) {
        throw new ApiError(
          STATUS_CODES.BAD_REQUEST,
          `Showtime date ${
            stDate.toISOString().split("T")[0]
          } is outside the event range`
        );
      }

      validShowtimes.push({
        showtime: st.showtime,
        date: stDate,
      });
    }

    showTimesParsed = validShowtimes;
  } catch (err) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      `Invalid JSON in 'showTimes' or validation failed: ${err.message}`
    );
  }

  // Handle file upload (photos)
  const uploadedFiles = req.files;
  if (uploadedFiles && uploadedFiles.length > 0) {
    // Delete previous photos
    if (event.photos && event.photos.length > 0) {
      for (const photo of event.photos) {
        if (photo.public_id) {
          try {
            await deleteFileFromCloudinary(photo.public_id);
          } catch (err) {
            console.error("Cloudinary deletion failed:", err.message);
          }
        }
      }
    }

    try {
      const uploadedImages = await uploadFilesToCloudinary(uploadedFiles);
      if (uploadedImages.length > 0) {
        event.photos = uploadedImages.map((img) => ({
          url: img.url,
          public_id: img.public_id,
        }));
      }
    } catch (err) {
      throw new ApiError(
        STATUS_CODES.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.CLOUDINARY_UPLOAD_FAILED,
        [err.message]
      );
    }
  }

  // Update event fields
  event.type = type || event.type;
  event.title = title || event.title;
  event.description = description || event.description;
  event.director = director || event.director;
  event.cast = castParsed || event.cast;
  event.startDate = startDate || event.startDate;
  event.endDate = endDate || event.endDate;
  event.venue = venue || event.venue;
  event.showTimes = showTimesParsed || event.showTimes;
  event.adultTicketPrice = adultTicketPrice || event.adultTicketPrice;
  event.studentTicketPrice = studentTicketPrice || event.studentTicketPrice;

  try {
    await event.save();
    return res
      .status(STATUS_CODES.SUCCESS)
      .json(
        new ApiResponse(
          STATUS_CODES.SUCCESS,
          event,
          SUCCESS_MESSAGES.UPDATED || "Event updated successfully!"
        )
      );
  } catch (err) {
    console.error("Error saving event:", err);
    throw new ApiError(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.FAILED,
      [err.message]
    );
  }
});

const deleteEventById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(
      new ApiError(STATUS_CODES.BAD_REQUEST, ERROR_MESSAGES.INVALID_ID)
    );
  }

  const event = await Event.findById(id);
  if (!event) {
    throw new ApiError(
      STATUS_CODES.NOT_FOUND,
      ERROR_MESSAGES.EVENT_NOT_FOUND || "Event not found"
    );
  }

  if (Array.isArray(event.photos)) {
    for (const photo of event.photos) {
      if (photo?.public_id) {
        try {
          await deleteFileFromCloudinary(photo.public_id);
        } catch (cloudErr) {
          console.error(
            "Failed to delete photo from Cloudinary:",
            cloudErr.message
          );
        }
      }
    }
  }

  try {
    await event.deleteOne();
  } catch (dbErr) {
    console.error("Failed to delete event from DB:", dbErr);
    return next(
      new ApiError(
        STATUS_CODES.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.FAILED || "Failed to delete event",
        [dbErr.message]
      )
    );
  }

  try {
    return res
      .status(STATUS_CODES.SUCCESS)
      .json(
        new ApiResponse(
          STATUS_CODES.SUCCESS,
          null,
          SUCCESS_MESSAGES.DELETED || "Event deleted successfully!"
        )
      );
  } catch (resErr) {
    console.error("Failed to send success response:", resErr);
    return next(
      new ApiError(
        STATUS_CODES.INTERNAL_SERVER_ERROR,
        "Event deleted but response failed",
        [resErr.message]
      )
    );
  }
});

export {
  addEvent,
  getAllEvents,
  getEventById,
  updateEventById,
  deleteEventById,
};
