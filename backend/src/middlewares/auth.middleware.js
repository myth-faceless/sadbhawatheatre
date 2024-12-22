import {
    ERROR_MESSAGES,
    STATUS_CODES,
  } from "../constants/message.constants.js";
  import { ApiError } from "../utils/ApiErrors.js";
  import { asyncHandler } from "../utils/asyncHandler.js";
  import { getTokenFromRequest } from "../utils/auth.js";
  import jwt from "jsonwebtoken";
  import { Admin } from "../models/admin.model.js";
  
  const verifyJWT = asyncHandler(async (req, res, next) => {
    const token = getTokenFromRequest(req);
  
    if (!token) {
      return next(
        new ApiError(STATUS_CODES.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED)
      );
    }
  
    try {
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  
      const admin = await Admin.findById(decodedToken?._id).select("-password");
      if (!admin) {
        return next(
          new ApiError(STATUS_CODES.UNAUTHORIZED, ERROR_MESSAGES.INVALID_TOKEN)
        );
      }
  
      req.admin = admin;
      next();
    } catch (error) {
      console.error("JWT Verification Error:", error);
      return next(
        new ApiError(STATUS_CODES.UNAUTHORIZED, ERROR_MESSAGES.INVALID_TOKEN)
      );
    }
  });
  
  export { verifyJWT };