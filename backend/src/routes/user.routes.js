import { Router } from "express";

import { upload } from "../middlewares/multer.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import {
  verifyJWT,
  checkEmailVerified,
} from "../middlewares/auth.middleware.js";
import {
  changeUserPasswordSchema,
  loginUserSchema,
  registerUserSchema,
  updateUserSchema,
} from "../validations/user.validation.js";

import {
  registerUser,
  verifyEmail,
  loginUser,
  logoutUser,
  updateUser,
  changeUserPassword,
} from "../controllers/user.controller.js";

const router = Router();

//public user routes
router
  .route("/register")
  .post(upload.single("avatar"), validate(registerUserSchema), registerUser);

router.route("/verify-email").post(verifyEmail);

router.route("/login").post(validate(loginUserSchema), loginUser);

//protected user routes
router.route("/logout").post(verifyJWT, logoutUser);

router
  .route("/:userId")
  .put(
    verifyJWT,
    upload.single("avatar"),
    validate(updateUserSchema),
    updateUser
  );
router
  .route("/changepassword")
  .post(verifyJWT, validate(changeUserPasswordSchema), changeUserPassword);

export { router as userRoutes };
