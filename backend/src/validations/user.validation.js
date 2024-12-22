import Joi from "joi";

export const registerUserSchema = Joi.object({
  fullName: Joi.string().max(100).required(),
  phoneNumber: Joi.string()
    .pattern(/^9[0-9]{9}$/)
    .max(15)
    .required(),
  email: Joi.string()
    .pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    .required(),
  password: Joi.string()
    .pattern(/^[a-zA-Z0-9]{3,30}$/)
    .required(),
  avatar: Joi.any(),
});

export const loginUserSchema = Joi.object({
  email: Joi.string()
    .pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    .required(),
  password: Joi.string().required(),
});

export const updateUserSchema = Joi.object({
  fullName: Joi.string().max(100),
  phoneNumber: Joi.string()
    .pattern(/^9[0-9]{9}$/)
    .max(15),
  email: Joi.string().pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
});

export const changeUserPasswordSchema = Joi.object({
  oldPassword: Joi.string()
    .pattern(/^[a-zA-Z0-9]{3,30}$/)
    .required(),
  newPassword: Joi.string()
    .pattern(/^[a-zA-Z0-9]{3,30}$/)
    .required(),
});