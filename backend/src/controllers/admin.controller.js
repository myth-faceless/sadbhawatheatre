import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  uploadFilesToCloudinary,
  deleteFileFromCloudinary,
} from "../utils/cloudinary.js";
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

const loginAdmin = asyncHandler(async (req, res) => {
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

const logoutAdmin = asyncHandler(async (req, res) => {
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

const updateAdmin = asyncHandler(async (req, res, next) => {
  try {
    const { fullName, phoneNumber, email } = req.validateBody;
    const userId = req.user.id;

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return next(
        new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
      );
    }

    let emailUpdated = false;

    // Handle email update
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

      // Mark email as unverified and set expiry time for OTP
      user.isEmailVerified = false; // Set email verification to false
      user.otp = hashedOtp; // Save hashed OTP
      user.otpExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes expiry
      user.email = email; // Update the email

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

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.validateBody;

  // Find the user by the authenticated user's ID
  const user = await User.findById(req.user?.id);
  if (!user) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
  }

  // Check if the old password is correct
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_OLD_PASSWORD
    );
  }

  // Hash the new password before saving it
  user.password = await bcrypt.hash(newPassword, 10); // 10 salt rounds for hashing
  await user.save();

  // Return a successful response
  return res
    .status(STATUS_CODES.SUCCESS)
    .json(
      new ApiResponse(STATUS_CODES.SUCCESS, SUCCESS_MESSAGES.PASSWORD_CHANGED)
    );
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, ERROR_MESSAGES.EMAIL_REQUIRED);
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res
      .status(STATUS_CODES.SUCCESS)
      .json(
        new ApiResponse(
          STATUS_CODES.SUCCESS,
          SUCCESS_MESSAGES.EMAIL_SENT_IF_REGISTERED
        )
      );
  }

  //generate random password reset token
  const resetToken = crypto.randomBytes(32).toString("hex");

  //hash token before saving to DB for security reasons.
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  //set token and expiry
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpiry = Date.now() + 15 * 60 * 1000; // for 15 min
  await user.save();

  //make reset link
  const resetLink = `${process.env.BASE_URL}/reset-password/${resetToken}`;

  // email structure
  const subject = "Password Reset Request";
  const text = `Hi ${user.fullName}, \n\nYou requested a password reset. Please use this link below to reset your password. This link if valid for 15 minutes from now:\n\n ${resetLink} \n\nIf you didn't request this, please ignore this email. \n\n Thanks !`;

  //send email
  await sendEmail(user.email, subject, text);

  res
    .status(STATUS_CODES.SUCCESS)
    .json(
      new ApiResponse(
        STATUS_CODES.SUCCESS,
        SUCCESS_MESSAGES.RESET_PASSWORD_EMAIL_SENT
      )
    );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.TOKEN_AND_PASSWORD_REQUIRED
    );
  }

  // hash the token to match db
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  //find user with valid token which is not expired
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_OR_EXPIRED_OTP
    );
  }

  //set new password
  user.password = newPassword;

  //clear reset tokens
  user.resetPasswordToken = null;
  user.resetPasswordExpiry = null;

  await user.save();

  res
    .status(STATUS_CODES.SUCCESS)
    .json(
      new ApiResponse(STATUS_CODES.SUCCESS, SUCCESS_MESSAGES.PASSWORD_CHANGED)
    );
});

const getAllUser = asyncHandler(async (req, res) => {});

export {
  verifyEmail,
  loginAdmin,
  logoutAdmin,
  updateAdmin,
  changePassword,
  forgotPassword,
  resetPassword,
};
