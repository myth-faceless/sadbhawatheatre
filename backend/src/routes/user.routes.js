import { Router } from "express";

import { uploadWithErrorHandling } from "../middlewares/multer.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
  changePasswordSchema,
  updateSchema,
} from "../validations/global.validation.js";
import {
  logout,
  changePassword,
  updateProfile,
  verifyPendingEmail,
} from "../controllers/auth.controller.js";

const router = Router();

//-------------------------protected user routes-------------------------------

router.route("/logout").post(verifyJWT, logout);

router
  .route("/updateprofile")
  .put(
    verifyJWT,
    uploadWithErrorHandling("avatar"),
    validate(updateSchema),
    updateProfile
  );
router.route("/verify-pending-email").post(verifyJWT, verifyPendingEmail);
router
  .route("/updatepassword")
  .put(verifyJWT, validate(changePasswordSchema), changePassword);

export { router as userRoutes };
