import { Router } from "express";

import { uploadWithErrorHandling } from "../middlewares/multer.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import {
  verifyJWT,
  checkEmailVerified,
  verifyRole,
} from "../middlewares/auth.middleware.js";

import {
  loginAdminSchema,
  updateAdminSchema,
  changeAdminPasswordSchema,
  resetAdminPasswordSchema,
} from "../validations/admin.validation.js";

import {
  verifyEmail,
  loginAdmin,
  logoutAdmin,
  updateAdmin,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/admin.controller.js";

const router = Router();

//public admin routes

router.route("/verify-email").post(verifyEmail);

router
  .route("/login")
  .post(validate(loginAdminSchema), verifyRole("admin"), loginAdmin);
router.route("/forgot-password").post(forgotPassword);
router
  .route("/reset-password/:token")
  .post(validate(resetAdminPasswordSchema), resetPassword);

//protected user routes
router.route("/logout").post(verifyJWT, logoutAdmin);

router
  .route("/updateprofile")
  .put(
    verifyJWT,
    uploadWithErrorHandling("avatar"),
    validate(updateAdminSchema),
    updateAdmin
  );
router
  .route("/updatepassword")
  .put(verifyJWT, validate(changeAdminPasswordSchema), changePassword);

export { router as adminRoutes };
