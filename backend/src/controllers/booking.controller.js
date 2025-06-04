import { Showtime } from "../models/showTime.model.js";
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

  const existingShowtime = await Showtime.findById(showtime);
  if (!existingShowtime) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, "Showtime not found");
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

  //validate online payment requirements
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
        ERROR_MESSAGES.REQUIRED_PAYMENT_PLATFORM ||
          "Payment platform is required for online payments"
      );
    }

    const existingBooking = await Booking.findOne({ paymentReference });
    if (existingBooking) {
      throw new ApiError(
        STATUS_CODES.DUPLICATE_ENTRY,
        "This payment reference has already been used"
      );
    }
  }

  //admin must provide customer detsils for booking by admin
  if (isAdmin && (!customerName || !customerPhone)) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.MISSING_NAME_AND_CONTACT ||
        "Customer name and phone are required for admin bookings"
    );
  }

  const totalTicketsRequested = (tickets.adult || 0) + (tickets.student || 0);

  // Calculate how many tickets already booked for this showtime
  const aggregationResult = await Booking.aggregate([
    { $match: { showtime: existingShowtime._id } },
    {
      $group: {
        _id: null,
        totalBooked: {
          $sum: {
            $add: [
              { $ifNull: ["$tickets.adult", 0] },
              { $ifNull: ["$tickets.student", 0] },
            ],
          },
        },
      },
    },
  ]);

  const totalBookedSoFar = aggregationResult[0]?.totalBooked || 0;
  const seatAvailable = existingShowtime.seatCapacity - totalBookedSoFar;

  if (seatAvailable < totalTicketsRequested) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      `Only ${seatAvailable} seats are available for this showtime`
    );
  }

  const booking = await Booking.create({
    event,
    showtime,
    user: isAdmin ? null : req.user?._id,
    bookedByAdmin: isAdmin,
    adminBookedBy: isAdmin ? req.user._id : null,
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

const getAllBookings = asyncHandler(async (req, res) => {
  const { user, event, showtime } = req.query;

  const filter = {};
  if (user) filter.user = user;
  if (event) filter.event = event;
  if (showtime) filter.showtime = showtime;

  const bookings = await Booking.find(filter)
    .populate("user", "fullName email")
    .populate("event", "title showTimes")
    .populate("showtime", "time date")
    .populate("adminBookedBy", "fullName email")
    .sort({ createdAt: -1 })
    .lean();

  const processedBooking = bookings.map((booking) => {
    // Remove admin details if not booked by admin
    if (!booking.bookedByAdmin) {
      delete booking.adminBookedBy;
    }

    // Add full showtime details by matching showtime._id
    if (booking.event && booking.event.showTimes && booking.showtime?._id) {
      const matchedShowtime = booking.event.showTimes.find(
        (st) => st._id.toString() === booking.showtime._id.toString()
      );

      if (matchedShowtime) {
        booking.showtime = matchedShowtime; // Replace ID with full object
      }
    }

    // Optional: remove full showTimes array to keep response small
    if (booking.event?.showTimes) {
      delete booking.event.showTimes;
    }

    return booking;
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        processedBooking,
        "Filtered bookings fetched successfully"
      )
    );
});

// const getAllBookings = asyncHandler(async (req, res) => {
//   const { user, event, showtime } = req.query;

//   const filter = {};
//   if (user) filter.user = user;
//   if (event) filter.event = event;
//   if (showtime) filter.showtime = showtime;

//   const bookings = await Booking.find(filter)
//     .populate("user", "fullName email")
//     .populate("event", "title")
//     .populate("adminBookedBy", "fullName email")
//     .sort({ createdAt: -1 })
//     .lean();

//   //remove admin details if not booked by admin
//   const processedBooking = bookings.map((booking) => {
//     if (!booking.bookedByAdmin) {
//       delete booking.adminBookedBy;
//     }
//     if (booking.event && booking.event.showTimes && booking.showtime?._id) {
//       const matchedShwotime = booking.event.showTimes.find(
//         (st) => st._id.toString() === booking.showtime._id.toString()
//       );

//       if (matchedShwotime) {
//         booking.showtime = matchedShwotime;
//       }
//     }

//     return booking;
//   });

//   //add showtime details by matchind id:

//   res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         processedBooking,
//         "Filtered bookings fetched successfully"
//       )
//     );
// });

const updateBookingById = asyncHandler(async (req, res) => {});

export { createBooking, getAllBookings, updateBookingById };
