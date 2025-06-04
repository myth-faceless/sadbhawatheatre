import { Showtime } from "../models/showTime.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createShowtime = asyncHandler(async (req, res) => {
  const { time, seatCapacity } = req.body;
  console.log(time, seatCapacity);

  if (!time || typeof seatCapacity !== "number") {
    throw new ApiError(400, "Time and seat capacity are required !");
  }

  const existingShowtime = await Showtime.findOne({ time, seatCapacity });
  if (existingShowtime) {
    throw new ApiError(409, "Showtime already exists !");
  }

  const showtime = await Showtime.create({ time, seatCapacity });

  res
    .status(201)
    .json(new ApiResponse(201, showtime, "Showtime created successfully !"));
});

export const getAllShowtimes = asyncHandler(async (req, res) => {
  const showtimes = await Showtime.find().sort({ time: 1 });

  res
    .status(200)
    .json(
      new ApiResponse(200, showtimes, "All showtimes fetched successfully !")
    );
});

export const getShowtimeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(400, "Invalid MongoDB ID !");
  }

  const showtime = await Showtime.findById(id);
  if (!showtime) {
    throw new ApiError(404, "Showtime not found !");
  }

  res
    .status(200)
    .json(new ApiResponse(200, showtime, "Showtime fetched successfully !"));
});

export const updateShowtimeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { time, seatCapacity } = req.body;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(400, "Invalid MongoDB ID !");
  }

  const updated = await Showtime.findByIdAndUpdate(
    id,
    { time, seatCapacity },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new ApiError(404, "Showtime not found !");
  }

  res.status(200).json(new ApiResponse(200, updated, "Showeime updated !"));
});

export const deleteShowtime = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(400, "Invalid MongoDB ID !");
  }

  const deleted = await Showtime.findByIdAndDelete(id);

  if (!deleted) {
    throw new ApiError(404, "Showtime not found");
  }

  res.status(200).json(new ApiResponse(200, null, "Showtime deleted"));
});
