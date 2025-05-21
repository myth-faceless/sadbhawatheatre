import { Router } from "express";

import { uploadWithErrorHandling } from "../middlewares/multer.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import {
  verifyJWT,
  checkEmailVerified,
} from "../middlewares/auth.middleware.js";

import {
  changeUserPasswordSchema,
  loginUserSchema,
  registerUserSchema,
  resetUserPasswordSchema,
  updateUserSchema,
} from "../validations/user.validation.js";

import {
  registerUser,
  verifyEmail,
  loginUser,
  logoutUser,
  updateUser,
  changeUserPassword,
  forgotPassword,
  resetPassword,
} from "../controllers/user.controller.js";

const router = Router();

//------------------------public user routes-------------------------------

router
  .route("/register")
  .post(
    uploadWithErrorHandling("avatar"),
    validate(registerUserSchema),
    registerUser
  );

router.route("/verify-email").post(verifyEmail);

router.route("/login").post(validate(loginUserSchema), loginUser);
router.route("/forgot-password").post(forgotPassword);
router
  .route("/reset-password/:token")
  .post(validate(resetUserPasswordSchema), resetPassword);

//-------------------------protected user routes-------------------------------

router.route("/logout").post(verifyJWT, logoutUser);

router
  .route("/updateprofile")
  .put(
    verifyJWT,
    uploadWithErrorHandling("avatar"),
    validate(updateUserSchema),
    checkEmailVerified,
    updateUser
  );
router
  .route("/updatepassword")
  .put(verifyJWT, validate(changeUserPasswordSchema), changeUserPassword);

export { router as userRoutes };
