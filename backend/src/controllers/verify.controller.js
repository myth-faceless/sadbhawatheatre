import { Booking } from "../models/booking.model.js";
import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import {
  STATUS_CODES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "../constants/message.constants.js";

function verifyTicketToken(ticketId, hash) {
  const secret = process.env.QR_SECRET_KEY;
  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(ticketId)
    .digest("hex");
  return expectedHash === hash;
}

const verifyTicket = asyncHandler(async (req, res) => {
  const { ticketId, hash } = req.body;

  if (!ticketId || !hash) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, "Missing ticketId or hash");
  }

  if (!verifyTicketToken(ticketId, hash)) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, "Invalid QR code token");
  }

  // Find the booking containing this ticket
  const booking = await Booking.findOne({ "issuedTickets.ticketId": ticketId });
  if (!booking) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, "Ticket not found");
  }

  // Find the ticket inside the booking
  const ticket = booking.issuedTickets.find(
    (t) => t.ticketId.toString() === ticketId
  );

  if (!ticket) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, "Ticket not found");
  }

  if (ticket.attendance) {
    throw new ApiError(STATUS_CODES.CONFLICT, "Ticket already scanned");
  }

  // Mark attendance
  ticket.attendance = true;
  ticket.scannedAt = new Date();

  await booking.save();

  return res.status(200).json({
    status: "success",
    message: "Ticket verified and attendance marked",
    ticketId,
    bookingId: booking._id,
  });
});

export { verifyTicket };
