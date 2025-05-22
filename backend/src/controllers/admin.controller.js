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

const updateUserById = asyncHandler(async (req, res) => {
  console.log("Body received:", req.validateBody);
  const { id } = req.params;
  const { fullName, phoneNumber, email } = req.validateBody;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_USER_ID
    );
  }

  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
  }

  let emailUpdated = false;

  // If email is changed
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(STATUS_CODES.DUPLICATE_ENTRY)
        .json(ApiResponse.error(ERROR_MESSAGES.USER_EMAIL_ALREADY_EXIST));
    }
    // Generate OTP and hash it
    const otp = crypto.randomInt(100000, 999999).toString();
    const saltRounds = 10;
    const hashedOtp = await bcrypt.hash(otp, saltRounds);

    // Mark email as verified as it was making issue and set expiry time for OTP
    user.isEmailVerified = true; // Set email verification to false
    user.otp = hashedOtp; // Save hashed OTP
    user.otpExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes expiry
    user.pendingEmail = email; // Update the email

    // Send OTP to the new email
    const subject = "Verify Your Updated Email";
    const text = `Hello ${user.fullName},\n\nYour email was recently updated. Please verify your new email address with the OTP: ${otp}. It expires in 15 minutes.`;
    await sendEmail(email, subject, text);

    emailUpdated = true;
  }
  // Handle avatar update if a new file is uploaded
  const avatarLocalPath = req.file;
  let avatarUrl = user.avatar;

  if (avatarLocalPath) {
    if (user.cloudinaryPublicId) {
      await deleteFileFromCloudinary(user.cloudinaryPublicId);
    }
    try {
      const [uploadedAvatar] = await uploadFilesToCloudinary(avatarLocalPath);
      user.avatar = uploadedAvatar.url;
      user.cloudinaryPublicId = uploadedAvatar.public_id;
    } catch (uploadError) {
      throw new ApiError(
        STATUS_CODES.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.CLOUDINARY_AVATAR_UPLOAD_FAILED,
        [uploadError.message]
      );
    }
  }

  // Update user details
  user.fullName = fullName || user.fullName;
  user.phoneNumber = phoneNumber || user.phoneNumber;

  await user.save();

  return res
    .status(STATUS_CODES.SUCCESS)
    .json(
      new ApiResponse(
        STATUS_CODES.SUCCESS,
        user,
        emailUpdated
          ? "User updated. Please ask them to verify new email."
          : "User updated successfully."
      )
    );
});

const deleteUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Validate ObjectId
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_USER_ID
    );
  }

  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
  }

  // delete user's avatar from Cloudinary if exists
  if (user.cloudinaryPublicId) {
    await deleteFileFromCloudinary(user.cloudinaryPublicId);
  }

  // Delete user from DB
  await User.findByIdAndDelete(id);

  res
    .status(STATUS_CODES.SUCCESS)
    .json(
      new ApiResponse(STATUS_CODES.SUCCESS, null, SUCCESS_MESSAGES.USER_DELETED)
    );
});

export { getAllUser, getUserById, updateUserById, deleteUserById };
