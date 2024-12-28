import multer from "multer";
import { ApiError } from "../utils/ApiErrors.js";
import {
  ERROR_MESSAGES,
  STATUS_CODES,
} from "../constants/message.constants.js";

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true); // Accept file
  } else {
    cb(
      new ApiError(STATUS_CODES.BAD_REQUEST, ERROR_MESSAGES.INVALID_FILE_TYPE),
      false
    ); // Reject file
  }
};

// Multer instance with file filter
const upload = multer({ storage, fileFilter });

// Middleware to handle file upload with error handling
export const uploadWithErrorHandling = (fieldName) => (req, res, next) => {
  const uploadHandler = upload.single(fieldName);

  uploadHandler(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        next(
          new ApiError(STATUS_CODES.BAD_REQUEST, `Multer error: ${err.message}`)
        );
      } else if (err) {
        next(
          new ApiError(
            STATUS_CODES.BAD_REQUEST,
            `File upload failed: ${err.message}`
          )
        );
      } else {
        next();
      }
    } else {
      next();
    }
  });
};
