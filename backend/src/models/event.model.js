import mongoose from "mongoose";

const photoSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  public_id: {
    type: String,
    required: false,
    default: null,
  },
});

const customShowtimeSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  showtime: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showtime",
      required: true,
    },
  ],
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

    defaultShowtimes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Showtime",
        required: true,
      },
    ],
    customShowtimes: [customShowtimeSchema],

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
