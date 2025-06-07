import Joi from "joi";
import { ApiError } from "../utils/ApiErrors.js";

export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const apiError = new ApiError(
        400,
        "Validation Error",
        error.details.map((err) => err.message)
      );
      return res.status(400).json(apiError);
    }
    req.validateBody = value;
    next();
  };
};
