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
import {
  getAllEvents,
  getOnGoingEvents,
  getPastEvents,
  getUpcomingEvents,
} from "../controllers/event.controller.js";
import { createBooking } from "../controllers/booking.controller.js";
import { getAllShowtimes } from "../controllers/showtime.controller.js";

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

//-----------------------publication routes-------------------------------------
router.route("/getallpublications").get(getAllPublications);

//-------------------------events routes -----------------------------------------
router.route("/getallevents").get(getAllEvents);
router.route("/get-upcoming-events").get(getUpcomingEvents);
router.route("/get-ongoing-events").get(getOnGoingEvents);
router.route("/get-past-events").get(getPastEvents);

//-----------------------showtime routes---------------------------------------------
router.route("/getallshowtimes").get(getAllShowtimes);

//-------------------------protected global routes-------------------------------

router.route("/logout").post(verifyJWT, logout);
router.route("/verify-pending-email").post(verifyJWT, verifyPendingEmail);

//--------------------------booking---------------------------------------------
router.route("/createbooking").post(verifyJWT, createBooking);

export { router as globalRoutes };
