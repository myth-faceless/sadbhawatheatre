import Joi from "joi";

export const loginAdminSchema = Joi.object({
  email: Joi.string()
    .pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    .required(),
  password: Joi.string().required(),
});

export const updateAdminSchema = Joi.object({
  fullName: Joi.string().max(100),
  phoneNumber: Joi.string()
    .pattern(/^9[0-9]{9}$/)
    .max(15),
  email: Joi.string().pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
});

export const changeAdminPasswordSchema = Joi.object({
  oldPassword: Joi.string()
    .pattern(/^[a-zA-Z0-9]{3,30}$/)
    .required(),
  newPassword: Joi.string()
    .pattern(/^[a-zA-Z0-9]{3,30}$/)
    .required(),
});

export const resetAdminPasswordSchema = Joi.object({
  newPassword: Joi.string()
    .pattern(/^[a-zA-Z0-9]{3,30}$/)
    .required(),
});
