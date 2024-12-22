import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  STATUS_CODES,
  ERROR_MESSAGES,
} from "../constants/message.constants.js";

export const notFound = (req, res, next) => {
  const error = new ApiError(
    STATUS_CODES.NOT_FOUND,
    `Not Found - ${req.originalUrl}`
  );
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const statusCode =
    err instanceof ApiError
      ? err.statusCode
      : STATUS_CODES.INTERNAL_SERVER_ERROR;
  const message =
    err instanceof ApiError
      ? err.message
      : ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

  const response = new ApiResponse(statusCode, message, false);

  res.status(statusCode).json(response);
};