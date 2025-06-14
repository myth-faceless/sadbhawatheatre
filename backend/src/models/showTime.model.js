import mongoose from "mongoose";

const showtimeSchema = new mongoose.Schema(
  {
    time: {
      type: String,
      required: true,
      unique: true,
    },
    seatCapacity: {
      type: Number,
      required: true,
      min: 1,
    },
    totalBookingsSoFar: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Showtime = mongoose.model("Showtime", showtimeSchema);
