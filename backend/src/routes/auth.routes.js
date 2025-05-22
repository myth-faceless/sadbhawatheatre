import { Router } from "express";

import { uploadWithErrorHandling } from "../middlewares/multer.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import {
  verifyJWT,
  checkEmailVerified,
} from "../middlewares/auth.middleware.js";

import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateSchema,
} from "../validations/global.validation.js";

import {
  register,
  verifyEmail,
  login,
  logout,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyPendingEmail,
} from "../controllers/auth.controller.js";
import { getAllTeamMembers } from "../controllers/team.controller.js";

const router = Router();

//------------------------global routes-------------------------------

router
  .route("/register")
  .post(uploadWithErrorHandling("avatar"), validate(registerSchema), register);
router.route("/verify-email").post(verifyEmail);
router.route("/login").post(validate(loginSchema), login);
router.route("/forgot-password").post(forgotPassword);
router
  .route("/reset-password/:token")
  .post(validate(resetPasswordSchema), resetPassword);

router.route("/getallmember").get(getAllTeamMembers);

//-------------------------protected global routes-------------------------------

router.route("/logout").post(verifyJWT, logout);
router.route("/verify-pending-email").post(verifyJWT, verifyPendingEmail);

export { router as authRoutes };
