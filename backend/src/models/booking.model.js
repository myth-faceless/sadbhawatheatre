import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    ticketId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ["adult", "student"], required: true },
    qrCode: { type: String, required: true },
    attendance: { type: Boolean, default: false },
    scannedAt: { type: Date, default: null },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    showtime: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showtime",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    adminBookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    bookedByAdmin: {
      type: Boolean,
      default: false,
    },
    customerName: {
      type: String,
    },
    customerPhone: {
      type: String,
    },
    tickets: {
      adult: {
        type: Number,
        required: true,
        default: 0,
      },
      student: {
        type: Number,
        required: true,
        default: 0,
      },
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "cash"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["online", "cash", "QR"],
      required: true,
    },
    paymentPlatform: {
      type: String,
      enum: ["fonepay", "khalti", "esewa", null],
      default: null,
    },
    paymentReference: {
      type: String,
      default: null,
      unique: true,
    },
    issuedTickets: [ticketSchema],
  },
  { timestamps: true }
);

bookingSchema.index({ "issuedTickets.ticketId": 1 });

export const Booking = mongoose.model("Booking", bookingSchema);
