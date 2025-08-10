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

import mongoose from "mongoose";
import QRCode from "qrcode";
import crypto from "crypto";

function generateTicketToken(ticketId) {
  return crypto
    .createHmac("sha256", process.env.QR_SECRET_KEY)
    .update(ticketId.toString())
    .digest("hex");
}

async function generateTicketQR(ticketId) {
  const token = generateTicketToken(ticketId);
  const url = `${process.env.BASE_URL}/tickets/verify/${ticketId}?token=${token}`;
  return await QRCode.toDataURL(url);
}

const createBooking = asyncHandler(async (req, res, next) => {
  try {
    const {
      event,
      showtime,
      date,
      customerName,
      customerPhone,
      tickets,
      paymentStatus,
      paymentMethod,
      paymentPlatform,
      paymentReference,
    } = req.body;

    // Basic required field validation
    if (!event || !showtime || !date || !tickets || !paymentMethod) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Missing required booking fields"
      );
    }

    // Validate event existence
    const existingEvent = await Event.findById(event);
    if (!existingEvent)
      throw new ApiError(STATUS_CODES.NOT_FOUND, "Event not found");

    // Validate showtime existence
    const existingShowtime = await Showtime.findById(showtime);
    if (!existingShowtime)
      throw new ApiError(STATUS_CODES.NOT_FOUND, "Showtime not found");

    // Check user role
    const isAdmin = req.user?.role === "admin";

    // Enforce online payment for non-admin users
    if (!isAdmin && paymentMethod !== "online") {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Users must pay using online method"
      );
    }

    // Validate online payment details if paymentMethod is online
    if (paymentMethod === "online") {
      if (!paymentReference)
        throw new ApiError(
          STATUS_CODES.BAD_REQUEST,
          "Payment reference required"
        );
      if (paymentStatus !== "completed")
        throw new ApiError(
          STATUS_CODES.BAD_REQUEST,
          "Online payments must be completed"
        );
      if (!paymentPlatform)
        throw new ApiError(
          STATUS_CODES.BAD_REQUEST,
          "Payment platform required"
        );

      // Prevent duplicate payment references
      const existingBooking = await Booking.findOne({ paymentReference });
      if (existingBooking)
        throw new ApiError(
          STATUS_CODES.DUPLICATE_ENTRY,
          "This payment reference has already been used"
        );
    }

    // Admin booking requires customer info
    if (isAdmin && (!customerName || !customerPhone)) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Customer name and phone are required for admin bookings"
      );
    }

    // Calculate total tickets requested
    const adultTickets = tickets?.adult || 0;
    const studentTickets = tickets?.student || 0;
    const totalTicketsRequested = adultTickets + studentTickets;

    if (totalTicketsRequested <= 0) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "At least one ticket must be booked"
      );
    }

    const updatedShowtime = await Showtime.findOneAndUpdate(
      {
        _id: showtime,
        seatAvailable: { $gte: totalTicketsRequested },
      },
      {
        $inc: { seatAvailable: -totalTicketsRequested },
      },
      { new: true }
    );

    if (!updatedShowtime) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        `Not enough seats available for this showtime`
      );
    }

    const totalAmount =
      adultTickets * existingEvent.adultTicketPrice +
      studentTickets * existingEvent.studentTicketPrice;

    // Generate tickets with QR codes
    const issuedTickets = [];
    for (let i = 0; i < adultTickets; i++) {
      const ticketId = new mongoose.Types.ObjectId();
      const qrCode = await generateTicketQR(ticketId);
      issuedTickets.push({ ticketId, type: "adult", qrCode });
    }
    for (let i = 0; i < studentTickets; i++) {
      const ticketId = new mongoose.Types.ObjectId();
      const qrCode = await generateTicketQR(ticketId);
      issuedTickets.push({ ticketId, type: "student", qrCode });
    }

    // Create booking document
    const booking = await Booking.create({
      event,
      showtime,
      date: new Date(date),
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
      issuedTickets,
    });

    // Prepare response data
    const bookingData = booking.toObject();
    bookingData.availableSeats = updatedShowtime.seatAvailable;

    return res
      .status(STATUS_CODES.CREATED)
      .json(
        new ApiResponse(
          STATUS_CODES.CREATED,
          bookingData,
          "Booking created successfully with tickets"
        )
      );
  } catch (error) {
    console.error("Create Booking Error:", error);
    next(error);
  }
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

const updateBookingById = asyncHandler(async (req, res) => {});

export { createBooking, getAllBookings, updateBookingById };
