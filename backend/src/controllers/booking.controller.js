// import asyncHandler from "../utils/asyncHandler.js";
import { Booking } from "../models/booking.model.js";
import { Event } from "../models/event.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  STATUS_CODES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "../constants/message.constants.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createBooking = asyncHandler(async (req, res) => {
  const {
    event,
    showtime,
    customerName,
    customerPhone,
    tickets,
    totalAmount,
    paymentStatus,
    paymentMethod,
  } = req.body;

  if (
    !event ||
    !showtime ||
    !tickets ||
    typeof totalAmount !== "number" ||
    !paymentMethod
  ) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      "Missing required booking fields"
    );
  }

  const existingEvent = await Event.findById(event);

  if (!existingEvent) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, "Event not found");
  }

  const isAdmin = req.user?.role === "admin";

  if (isAdmin && (!customerName || !customerPhone)) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      "Customer name and phone are required for admin bookings"
    );
  }

  const booking = await Booking.create({
    event,
    showtime,
    user: isAdmin ? null : req.user?._id,
    bookedByAdmin: isAdmin || false,
    customerName: isAdmin ? customerName : req.user?.fullName,
    customerPhone: isAdmin ? customerPhone : req.user?.phoneNumber,
    tickets,
    totalAmount,
    paymentStatus,
    paymentMethod,
  });

  return res
    .status(STATUS_CODES.CREATED)
    .json(
      new ApiResponse(
        STATUS_CODES.CREATED,
        booking,
        SUCCESS_MESSAGES.CREATED || "Booking created successfully"
      )
    );
});

export { createBooking };
