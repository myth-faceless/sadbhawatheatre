import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    drama: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drama",
      required: true,
    },
    showtime: {
      type: Object,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
      adults: {
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
      enum: ["online", "cash"],
    },
    attendance: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Booking = mongoose.model("Booking", bookingSchema);
