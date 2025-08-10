import { Booking } from "../models/booking.model.js";
import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import {
  STATUS_CODES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "../constants/message.constants.js";
import mongoose from "mongoose";

// function verifyTicketToken(ticketId, hash) {
//   const secret = process.env.QR_SECRET_KEY;
//   const expectedHash = crypto
//     .createHmac("sha256", secret)
//     .update(ticketId)
//     .digest("hex");
//   return expectedHash === hash;
// }
function verifyTicketToken(ticketId, hash) {
  const secret = process.env.QR_SECRET_KEY;
  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(ticketId)
    .digest("hex");
  if (expectedHash !== hash) {
    console.log("Token mismatch:", {
      expectedHash,
      providedHash: hash,
      ticketId,
    });
  }
  return expectedHash === hash;
}

const verifyTicket = asyncHandler(async (req, res) => {
  const { ticketId, hash } = req.body;
  console.log("ticketId received:", JSON.stringify(ticketId));
  if (!ticketId || !hash) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, "Missing ticketId or hash");
  }

  // Verify the token first using ticketId as string
  if (!verifyTicketToken(ticketId, hash)) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, "Invalid QR code token");
  }

  // Find booking that contains the ticket with matching ObjectId
  const booking = await Booking.findOne({
    "issuedTickets.ticketId": ticketId,
  });
  if (!booking) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, "Ticket not found");
  }

  // Find the exact ticket in issuedTickets array by matching ObjectId string
  const ticket = booking.issuedTickets.find(
    (t) => t.ticketId.toString() === ticketId
  );

  if (!ticket) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, "Ticket not found");
  }

  if (ticket.attendance) {
    throw new ApiError(STATUS_CODES.CONFLICT, "Ticket already scanned");
  }

  // Mark attendance and save
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
