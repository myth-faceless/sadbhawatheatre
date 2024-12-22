import { STATUS_CODES, ERROR_MESSAGES } from "../constants/message.constants.js";
import { ApiError } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getTokenFromRequest } from "../utils/auth.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// Verify if the user is authenticated
const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return next(
      new ApiError(STATUS_CODES.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED)
    );
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select("-password");
    if (!user) {
      return next(
        new ApiError(STATUS_CODES.UNAUTHORIZED, ERROR_MESSAGES.INVALID_TOKEN)
      );
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(
        STATUS_CODES.UNAUTHORIZED,
        ERROR_MESSAGES.SESSION_EXPIRED
      );
    }
    throw new ApiError(
      STATUS_CODES.UNAUTHORIZED,
      ERROR_MESSAGES.INVALID_TOKEN
    );
  }
});

// role verification ( admin or user )
const verifyRole = (requiredRole) =>
  asyncHandler((req, res, next) => {
    if (req.user.role !== requiredRole) {
      throw new ApiError(
        STATUS_CODES.FORBIDDEN,
        `Access denied: Requires ${requiredRole} role`
      );
    }
    next();
  });

// Check if email is verified
const checkEmailVerified = asyncHandler((req, res, next) => {
  if (!req.user?.isEmailVerified) {
    throw new ApiError(
      STATUS_CODES.FORBIDDEN,
      ERROR_MESSAGES.EMAIL_NOT_VERIFIED
    );
  }
  next();
});

export { verifyJWT, verifyRole, checkEmailVerified };
