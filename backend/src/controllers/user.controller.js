import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { USER_ICON } from "../constants/app.constants.js";
import {
  STATUS_CODES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "../constants/message.constants.js";

import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

const generateToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
    }
    const accessToken = user.generateAccessToken();
    return { accessToken };
  } catch (error) {
    throw new ApiError(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.TOKEN_GENEREATION
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  try {
    const { fullName, phoneNumber, email, password } = req.validateBody;

    const existeUser = await User.findOne({ email });

    if (existeUser) {
      return res
        .status(STATUS_CODES.DUPLICATE_ENTRY)
        .json(ApiResponse.error(ERROR_MESSAGES.USER_EMAIL_ALREADY_EXIST));
    }

    const avatarLocalPath = req.file?.path;
    let avatarUrl = null;
    if (avatarLocalPath) {
      try {
        const response = await uploadOnCloudinary(avatarLocalPath);
        avatarUrl = response.secure_url;
      } catch (uploadError) {
        throw new ApiError(
          STATUS_CODES.INTERNAL_SERVER_ERROR,
          ERROR_MESSAGES.CLOUDINARY_AVATAR_UPLOAD_FAILED,
          [uploadError.message]
        );
      }
    } else {
      avatarUrl = USER_ICON;
    }

    const user = await User.create({
      fullName,
      phoneNumber,
      email,
      password,
      avatar: avatarUrl,
    });

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const saltRounds = 10;
    const hashedOtp = await bcrypt.hash(otp, saltRounds);

    user.otp = hashedOtp;
    user.otpExpiry = Date.now() + 15 * 60 * 1000; // Expires in 15 minutes
    await user.save();

    // Send OTP via email
    const subject = "Verify Your Email";
    const text = `Welcome to ${process.env.NAME}, ${user.fullName}! Your OTP for email verification is ${otp}. It expires in 15 minutes.`;

    await sendEmail(user.email, subject, text);

    const response = new ApiResponse(
      STATUS_CODES.CREATED,
      SUCCESS_MESSAGES.USER_REGISTERED,
      { userId: user._id, message: "Check your email for the OTP." }
    );
    res.status(201).json(response);
  } catch (err) {
    const error = new ApiError(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.ERROR_CREATING_USER,
      err.stack
    );
    res.status(500).json(error);
  }
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.REQUIRED_EMAIL_AND_OTP
    );
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
  }

  if (!user.otp || user.otpExpiry < Date.now()) {
    throw new ApiError(
      STATUS_CODES.UNAUTHORIZED,
      ERROR_MESSAGES.INVALID_OR_EXPIRED_OTP
    );
  }

  const isOtpValid = await bcrypt.compare(otp, user.otp);

  if (!isOtpValid) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, ERROR_MESSAGES.INVALID_OTP);
  }

  user.isEmailVerified = true;
  user.otp = null; // Clear the OTP after verification
  user.otpExpiry = null; // Clear the expiry after verification
  await user.save();

  res
    .status(STATUS_CODES.SUCCESS)
    .json(
      new ApiResponse(
        STATUS_CODES.SUCCESS,
        SUCCESS_MESSAGES.EMAIL_VERIFIED,
        "Your email has been successfully verified!"
      )
    );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.validateBody;

  if (!email && !password) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.REQUIRED_EMAIL_PASSWORD
    );
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
  }

  if (!user.isEmailVerified) {
    throw new ApiError(
      STATUS_CODES.FORBIDDEN,
      ERROR_MESSAGES.EMAIL_NOT_VERIFIED
    );
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(
      STATUS_CODES.UNAUTHORIZED,
      ERROR_MESSAGES.INCORRECT_EMAIL_PASSWORD
    );
  }

  const accessToken = await generateToken(user._id);

  const loggedInUser = await User.findById(user._id).select("-password");

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(STATUS_CODES.SUCCESS)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        STATUS_CODES.SUCCESS,
        { user: loggedInUser, accessToken },
        SUCCESS_MESSAGES.USER_LOGGED_IN
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(STATUS_CODES.SUCCESS)
    .clearCookie("accessToken", options)
    .json(
      new ApiResponse(STATUS_CODES.SUCCESS, SUCCESS_MESSAGES.USER_LOGGED_OUT)
    );
});

const updateUser = asyncHandler(async (req, res, next) => {
  try {
    const { fullName, phoneNumber, email } = req.validateBody;
    const { userId } = req.params;

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return next(
        new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
      );
    }

    let emailUpdated = false;

    // Handle email update
    if (email && email == user.email) {
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

      user.otp = hashedOtp;
      user.otpExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes expiry
      user.isEmailVerified = false; // Mark as unverified
      user.email = email; // Update the email

      // Send OTP to the new email
      const subject = "Verify Your Updated Email";
      const text = `Hello ${user.fullName},\n\nYour email was recently updated. Please verify your new email address with the OTP: ${otp}. It expires in 15 minutes.`;
      await sendEmail(email, subject, text);

      emailUpdated = true;
    }

    // Handle avatar update if a new file is uploaded
    const avatarLocalPath = req.file?.path;
    let avatarUrl = user.avatar;

    if (avatarLocalPath) {
      try {
        const response = await uploadOnCloudinary(avatarLocalPath);
        avatarUrl = response.secure_url;
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
    user.avatar = avatarUrl;

    await user.save();

    const responseMessage = emailUpdated
      ? "User updated successfully. Please verify your new email address."
      : "User updated successfully.";

    const response = new ApiResponse(
      STATUS_CODES.SUCCESS,
      user,
      responseMessage
    );
    res.status(200).json(response);
  } catch (err) {
    const error = new ApiError(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.ERROR_UPDATING_USER,
      err.stack
    );
    res.status(500).json(error);
  }
});

const changeUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.validateBody;

  const user = await User.findById(req.user?.id);
  if (!user) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
  }
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_OLD_PASSWORD
    );
  }

  user.password = newPassword;
  await user.save();

  return res
    .status(STATUS_CODES.SUCCESS)
    .json(
      new ApiResponse(STATUS_CODES.SUCCESS, SUCCESS_MESSAGES.PASSWORD_CHANGED)
    );
});

export {
  registerUser,
  verifyEmail,
  loginUser,
  logoutUser,
  updateUser,
  changeUserPassword,
};
