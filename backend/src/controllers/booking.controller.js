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
    paymentPlatform,
    paymentReference,
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
    throw new ApiError(
      STATUS_CODES.NOT_FOUND,
      ERROR_MESSAGES.NOT_FOUND || "Event not found"
    );
  }

  const isAdmin = req.user?.role === "admin";

  //user booking must be online.

  if (!isAdmin && paymentMethod !== "online") {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.REQUIRE_ONLINE_PAYMENT ||
        "Users must pay using online method"
    );
  }

  //if payment method is online, payment ref, is required
  if (paymentMethod === "online") {
    if (!paymentReference) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        ERROR_MESSAGES.PAYMENT_REFERENCE_REQUIRED ||
          "Payment reference is required for online payments"
      );
    }
    if (!paymentStatus || paymentStatus !== "completed") {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        ERROR_MESSAGES.REQUIRE_ONLINE_PAYMENT ||
          "Online payments must be completed"
      );
    }
    if (!paymentPlatform) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Payment platform is required for online payments"
      );
    }
  }

  if (isAdmin && (!customerName || !customerPhone)) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.MISSING_NAME_AND_CONTACT ||
        "Customer name and phone are required for admin bookings"
    );
  }

  if (paymentMethod === "online" && !paymentReference) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.PAYMENT_REFERENCE_REQUIRED ||
        "Payment reference is required for online payments"
    );
  }

  if (paymentReference) {
    const existingBooking = await Booking.findOne({ paymentReference });
    if (existingBooking) {
      throw new ApiError(
        STATUS_CODES.DUPLICATE_ENTRY,
        "This payment reference has already been used for a booking."
      );
    }
  }

  const showtimeObj = existingEvent.showTimes.id(showtime);

  if (!showtimeObj) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, "Showtime not found");
  }

  const totalTicketsRequested = (tickets.adult || 0) + (tickets.student || 0);

  if (showtimeObj.seatAvailable < totalTicketsRequested) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      `Only ${showtimeObj.seatAvailable} seats are available`
    );
  }

  showtimeObj.seatAvailable -= totalTicketsRequested;

  await existingEvent.save();

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
    paymentPlatform: paymentMethod === "online" ? paymentPlatform : null,
    paymentReference: paymentMethod === "online" ? paymentReference : null,
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
