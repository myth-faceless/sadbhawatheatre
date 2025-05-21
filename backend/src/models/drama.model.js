import mongoose from "mongoose";

const showtimeSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  seatAvailable: {
    type: Number,
    required: true,
  },
});

const photoSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  public_id: {
    type: String,
    required: true,
  },
});

const dramaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    director: {
      type: String,
      required: true,
    },
    cast: {
      type: [String],
      default: [],
    },
    photos: [photoSchema],

    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    venue: {
      type: String,
      required: true,
    },

    showTimes: [showtimeSchema],

    adultTicketPrice: {
      type: Number,
      required: true,
    },
    studentTicketPrice: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export const Drama = mongoose.model("Drama", dramaSchema);
