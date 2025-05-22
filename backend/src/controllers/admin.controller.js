import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  uploadFilesToCloudinary,
  deleteFileFromCloudinary,
} from "../utils/cloudinary.js";

import {
  STATUS_CODES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "../constants/message.constants.js";

import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

const getAllUser = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password -otp -otpExpiry");
  res
    .status(STATUS_CODES.SUCCESS)
    .json(
      new ApiResponse(
        STATUS_CODES.SUCCESS,
        users,
        SUCCESS_MESSAGES.ALL_USER_FETCHED_SUCCESSFULLY
      )
    );
});

const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  //validate mongoDB ObjectId:
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(
      new ApiError(STATUS_CODES.BAD_REQUEST, ERROR_MESSAGES.INVALID_USER_ID)
    );
  }

  const user = await User.findById(id).select(
    "-password -otp -otpExpiry -resetPasswordToken -resetPasswordExpiry"
  );

  if (!user) {
    return next(
      new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
    );
  }
  const response = new ApiResponse(
    STATUS_CODES.SUCCESS,
    user,
    SUCCESS_MESSAGES.USER_FETCHED
  );

  res.status(STATUS_CODES.SUCCESS).json(response);
});

const updateUserById = asyncHandler(async (req, res) => {});

export { getAllUser, getUserById };
