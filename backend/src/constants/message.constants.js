export const STATUS_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  REQUEST_TIMEOUT: 408,
  DUPLICATE_ENTRY: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};

export const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: "Internal Server Error.",
  UNAUTHORIZED: "Access denied. Please login to continue.",
  USER_NOT_AUTHORIZED: "User not authorized to perform this action.",
  FORBIDDEN: "You don't have enough permission to perform this action.",
  USER_EMAIL_ALREADY_EXIST:
    "User with this email already exist. Please try with other email.",
  USER_PHONE_ALREADY_EXIST:
    "User with this phone already exist. Please try with other phone.",

  ERROR_CREATING_USER: "Error Registering User.",
  ERROR_UPDATING_USER: "Error Updating User.",
  ERROR_DELETING_USER: "Error deleting User.",

  INVALID_EMAIL_PASSWORD: "Invalid Email, Phone or password.",
  INCORRECT_EMAIL_PASSWORD: "Incorrect Email or password.",
  REQUIRED_EMAIL_PASSWORD: "Email and Password is Required",

  USER_NOT_FOUND: "User not found.",
  USER_NOT_FOUND_INVALID_TOKEN: "User not found or invalid token.",
  INVALID_OLD_PASSWORD: "Old Password doesn't match or invalid.",
  INVALID_TOKEN: "Invalid Token.",
  SAME_PASSWORD: "New password cannot be the same as old password.",

  CLOUDINARY_UPLOAD_FAILED: "Failed to upload to cloudinary",
  CLOUDINARY_AVATAR_UPLOAD_FAILED: "Failed to upload avatar to cloudinary",

  INVALID_FILE_TYPE: "Invalid file type, Please use JPEG, PNG or GIF ",

  TOKEN_GENEREATION: "Something went wrong while generating access token",

  INVALID_REQUEST_BODY: "Invalid request Body.",

  SESSION_EXPIRED: "Session expired. Please log in again.",
  EMAIL_REQUIRED: "Email is reqired",
  EMAIL_NOT_VERIFIED: "Email not verified, please verify your email !",
  REQUIRED_EMAIL_AND_OTP: "Required email and OTP !",
  INVALID_OR_EXPIRED_OTP: "OTP invalid or expired",
  INVALID_OTP: "Invalid OTP, check your OPT again !",
  TOKEN_AND_PASSWORD_REQUIRED: "Token and new password are required",
  NO_PENDING_EMAIL_FOUND: "No Pending email verification found!",
  EXPIRED_OTP: "OTP expired. Please request a new verification code",

  INVALID_USER_ID: "Invalid User ID !",
  PHOTO_REQUIRED: "Photo is required !",
  MEMBER_ALREADY_EXISTS: "Team member already exists",
  MEMBER_NOT_FOUND: "Team member not found",

  ALL_FIELDS_REQUIRED: "All fields required !",
  PUBLICATION_ALREADY_EXISTS: "Publication already exists !",
  NOT_FOUND: "Not found !",
  INVALID_ID: "Invalid ID",
};

export const SUCCESS_MESSAGES = {
  USER_REGISTERED: "User registered successfully.",
  USER_LOGGED_IN: "User logged in successfully.",
  USER_LOGGED_OUT: "User logged out successfully.",
  USER_FETCHED: "User details fetched successfully",
  USER_UPDATED: "User updated successfully.",
  USER_DELETED: "User deleted successfully.",

  PASSWORD_CHANGED: "Password changed successfully.",
  EMAIL_SENT_IF_REGISTERED:
    "If that email is registered, a reset link has been sent.",
  RESET_PASSWORD_EMAIL_SENT: "Password reset email send successfully",

  TEAM_MEMBER_ADDED: "Team member added successfully",
  ALL_USER_FETCHED_SUCCESSFULLY: "All user fetched successfully !",
  ALL_TEAM_FETCHED_SUCCESSFULLY: "All user fetched successfully !",

  PUBLICATION_CREATED: "Publication created successfully",
  FETCHED_SUCCESSFULLY: "Fetched successfully !",
  DELETED: "Deleted Successfully",
  UPDATED_SUCCESSFULLY: "Updated Successfully !",
};
