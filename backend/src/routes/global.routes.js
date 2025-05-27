import { Router } from "express";

import { uploadWithErrorHandling } from "../middlewares/multer.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../validations/global.validation.js";

import {
  register,
  verifyEmail,
  login,
  logout,
  forgotPassword,
  resetPassword,
  verifyPendingEmail,
} from "../controllers/global.controller.js";
import { getAllTeamMembers } from "../controllers/team.controller.js";
import { getAllPublications } from "../controllers/publication.controller..js";
import { getAllEvents } from "../controllers/event.controller.js";

const router = Router();

//------------------------global auth routes-----------------------------------------

router
  .route("/register")
  .post(uploadWithErrorHandling("avatar"), validate(registerSchema), register);
router.route("/verify-email").post(verifyEmail);
router.route("/login").post(validate(loginSchema), login);
router.route("/forgot-password").post(forgotPassword);
router
  .route("/reset-password/:token")
  .post(validate(resetPasswordSchema), resetPassword);

//-------------------------global routes--------------------------------------------

router.route("/getallmembers").get(getAllTeamMembers);
router.route("/getallpublications").get(getAllPublications);
router.route("/getallevents").get(getAllEvents);

//-------------------------protected global routes-------------------------------

router.route("/logout").post(verifyJWT, logout);
router.route("/verify-pending-email").post(verifyJWT, verifyPendingEmail);

export { router as globalRoutes };
