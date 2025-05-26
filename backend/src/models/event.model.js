import mongoose from "mongoose";

const showtimeSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  seatAvailable: {
    type: Number,
    required: true,
    min: 0,
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

const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },
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
      type: [
        {
          name: {
            type: String,
            required: true,
          },
          role: {
            type: String,
            default: null,
          },
        },
      ],
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

export const Event = mongoose.model("Event", eventSchema);
