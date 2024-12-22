import { Admin } from "../models/admin.model.js";
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

const generateToken = async (adminId) => {
  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      throw new ApiError(
        STATUS_CODES.NOT_FOUND,
        ERROR_MESSAGES.ADMIN_NOT_FOUND
      );
    }
    const accessToken = admin.generateAccessToken();
    return { accessToken };
  } catch (error) {
    throw new ApiError(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.TOKEN_GENEREATION
    );
  }
};


const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.validateBody;

  if (!email && !password) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.REQUIRED_EMAIL_PASSWORD
    );
  }

  const admin = await Admin.findOne({ email });

  if (!admin) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
  }

  const isPasswordValid = await admin.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(
      STATUS_CODES.UNAUTHORIZED,
      ERROR_MESSAGES.INCORRECT_EMAIL_PASSWORD
    );
  }

  const accessToken = await generateToken(admin._id);

  const loggedInAdmin = await Admin.findById(admin._id).select("-password");

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
        { admin: loggedInAdmin, accessToken },
        SUCCESS_MESSAGES.ADMIN_LOGGED_IN
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
      new ApiResponse(STATUS_CODES.SUCCESS, SUCCESS_MESSAGES.ADMIN_LOGGED_OUT)
    );
});

const updateAdmin = asyncHandler(async (req, res, next) => {
  try {
    const { fullName, phoneNumber, email } = req.validateBody;
    const { adminId } = req.params;

    // Check if the admin exists
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return next(
        new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.ADMIN_NOT_FOUND)
      );
    }

    if (email && email == admin.email) {
      const existedAdmin = await Admin.findOne({ email });
      if (existedAdmin) {
        return res
          .status(STATUS_CODES.DUPLICATE_ENTRY)
          .json(ApiResponse.error(ERROR_MESSAGES.USER_EMAIL_ALREADY_EXIST));
      }
    }

    // Handle avatar update if a new file is uploaded
    const avatarLocalPath = req.file?.path;
    let avatarUrl = admin.avatar;

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

    admin.fullName = fullName || admin.fullName;
    admin.phoneNumber = phoneNumber || admin.phoneNumber;
    admin.email = email || admin.email;
    admin.avatar = avatarUrl;

    await admin.save();

    const response = new ApiResponse(
      STATUS_CODES.SUCCESS,
      admin,
      SUCCESS_MESSAGES.ADMIN_UPDATED
    );
    res.status(200).json(response);
  } catch (err) {
    const error = new ApiError(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.ERROR_UPDATING_ADMIN,
      err.stack
    );
    res.status(500).json(error);
  }
});

const changeAdminPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.validateBody;

  const admin = await Admin.findById(req.admin?.id);
  if (!admin) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
  }
  const isPasswordCorrect = await admin.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_OLD_PASSWORD
    );
  }

  admin.password = newPassword;
  await admin.save();

  return res
    .status(STATUS_CODES.SUCCESS)
    .json(
      new ApiResponse(STATUS_CODES.SUCCESS, SUCCESS_MESSAGES.PASSWORD_CHANGED)
    );
});



export {
  createAdmin,
  loginAdmin,
  logoutAdmin,
  updateAdmin,
  changeAdminPassword,
};