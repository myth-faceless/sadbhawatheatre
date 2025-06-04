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
    defaultShowtimes, // array of showtime IDs
    customShowtimes, // array of { date, showtime: [showtimeIDs] }
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
    !adultTicketPrice ||
    !studentTicketPrice
  ) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.ALL_FIELDS_REQUIRED
    );
  }

  // Validate defaultShowtimes (must be non-empty array)
  let defaultShowtimesParsed = [];
  try {
    defaultShowtimesParsed =
      typeof defaultShowtimes === "string"
        ? JSON.parse(defaultShowtimes)
        : defaultShowtimes;

    if (
      !Array.isArray(defaultShowtimesParsed) ||
      defaultShowtimesParsed.length === 0
    ) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "'defaultShowtimes' must be a non-empty array of showtime IDs"
      );
    }

    // Validate each default showtime exists
    for (const showtimeId of defaultShowtimesParsed) {
      if (!(await Showtime.findById(showtimeId))) {
        throw new ApiError(
          STATUS_CODES.NOT_FOUND,
          `Default showtime ID ${showtimeId} does not exist`
        );
      }
    }
  } catch (err) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      `Invalid 'defaultShowtimes' format or validation failed: ${err.message}`
    );
  }

  // Validate customShowtimes (optional, can be empty array)
  let customShowtimesParsed = [];
  if (customShowtimes) {
    try {
      customShowtimesParsed =
        typeof customShowtimes === "string"
          ? JSON.parse(customShowtimes)
          : customShowtimes;

      if (!Array.isArray(customShowtimesParsed)) {
        throw new ApiError(
          STATUS_CODES.BAD_REQUEST,
          "'customShowtimes' must be an array"
        );
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      for (const custom of customShowtimesParsed) {
        if (!custom.date || !custom.showtime) {
          throw new ApiError(
            STATUS_CODES.BAD_REQUEST,
            "Each customShowtime must include 'date' and 'showtime' array"
          );
        }

        const customDate = new Date(custom.date);
        if (customDate < start || customDate > end) {
          throw new ApiError(
            STATUS_CODES.BAD_REQUEST,
            `Custom showtime date ${custom.date} is outside event range`
          );
        }

        if (!Array.isArray(custom.showtime) || custom.showtime.length === 0) {
          throw new ApiError(
            STATUS_CODES.BAD_REQUEST,
            "'showtime' inside customShowtime must be a non-empty array"
          );
        }

        // Validate each showtime ID in customShowtime exists
        for (const showtimeId of custom.showtime) {
          if (!(await Showtime.findById(showtimeId))) {
            throw new ApiError(
              STATUS_CODES.NOT_FOUND,
              `Custom showtime ID ${showtimeId} does not exist`
            );
          }
        }
      }
    } catch (err) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        `Invalid 'customShowtimes' format or validation failed: ${err.message}`
      );
    }
  }

  // Validate cast JSON
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
      defaultShowtimes: defaultShowtimesParsed,
      customShowtimes: customShowtimesParsed,
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
  const allEvents = await Event.find()
    .populate("defaultShowtimes")
    .populate("customShowtimes.showtime")
    .sort({ startDate: 1 }); // Optional: Sort by start date ascending
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

const getEventById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, ERROR_MESSAGES.INVALID_ID);
  }

  const event = await Event.findById(id)
    .populate("defaultShowtimes")
    .populate("customShowtimes.showtime");

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

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, ERROR_MESSAGES.INVALID_ID);
  }

  const event = await Event.findById(id);
  if (!event) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND);
  }

  const {
    type,
    title,
    description,
    director,
    cast,
    startDate,
    endDate,
    venue,
    defaultShowtimes,
    customShowtimes,
    adultTicketPrice,
    studentTicketPrice,
  } = req.body;

  console.log(req.body);

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

  // Parse and validate defaultShowtimes
  try {
    let parsedDefaultShowtimes =
      typeof defaultShowtimes === "string"
        ? JSON.parse(defaultShowtimes)
        : defaultShowtimes;

    if (!Array.isArray(parsedDefaultShowtimes)) {
      throw new Error("defaultShowtimes must be an array");
    }

    for (const st of parsedDefaultShowtimes) {
      const exists = await Showtime.findById(st);
      if (!exists) {
        throw new ApiError(
          STATUS_CODES.NOT_FOUND,
          `Showtime with ID ${st} does not exist`
        );
      }
    }

    event.defaultShowtimes = parsedDefaultShowtimes;
  } catch (err) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      `Invalid defaultShowtimes format or validation failed: ${err.message}`
    );
  }

  // Parse and validate customShowtimes
  if (customShowtimes) {
    let parsedCustomShowtimes;
    try {
      parsedCustomShowtimes =
        typeof customShowtimes === "string"
          ? JSON.parse(customShowtimes)
          : customShowtimes;

      if (!Array.isArray(parsedCustomShowtimes)) {
        throw new Error("customShowtimes must be an array");
      }

      for (const entry of parsedCustomShowtimes) {
        if (!entry.date || !Array.isArray(entry.showtime)) {
          throw new Error(
            "Each customShowtime must have date and showtime array"
          );
        }

        const stDate = new Date(entry.date);
        const start = new Date(startDate || event.startDate);
        const end = new Date(endDate || event.endDate);

        if (stDate < start || stDate > end) {
          throw new ApiError(
            STATUS_CODES.BAD_REQUEST,
            `Custom showtime date ${
              stDate.toISOString().split("T")[0]
            } is outside event range`
          );
        }

        for (const stId of entry.showtime) {
          const exists = await Showtime.findById(stId);
          if (!exists) {
            throw new ApiError(
              STATUS_CODES.NOT_FOUND,
              `Showtime with ID ${stId} does not exist`
            );
          }
        }
      }

      event.customShowtimes = parsedCustomShowtimes;
    } catch (err) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        `Invalid customShowtimes format or validation failed: ${err.message}`
      );
    }
  }

  // Handle file upload (photos)
  const uploadedFiles = req.files;
  if (uploadedFiles && uploadedFiles.length > 0) {
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
  event.adultTicketPrice = adultTicketPrice
    ? +adultTicketPrice
    : event.adultTicketPrice;
  event.studentTicketPrice = studentTicketPrice
    ? +studentTicketPrice
    : event.studentTicketPrice;

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
