import { Router } from "express";

import { uploadWithErrorHandling } from "../middlewares/multer.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";

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
  getAllUser,
  verifyPendingEmail,
} from "../controllers/admin.controller.js";

const router = Router();

//------------------------------public admin routes-------------------------------

router.route("/verify-email").post(verifyEmail);

router.route("/login").post(validate(loginAdminSchema), loginAdmin);
router.route("/forgot-password").post(forgotPassword);
router
  .route("/reset-password/:token")
  .post(validate(resetAdminPasswordSchema), resetPassword);

//---------------------------protected user routes--------------------------------

const protectedAdminRouter = Router();
protectedAdminRouter.use(verifyJWT, verifyRole("admin"));

protectedAdminRouter.route("/logout").post(logoutAdmin);

protectedAdminRouter
  .route("/updateprofile")
  .put(
    uploadWithErrorHandling("avatar"),
    validate(updateAdminSchema),
    updateAdmin
  );
protectedAdminRouter
  .route("/updatepassword")
  .put(validate(changeAdminPasswordSchema), changePassword);

protectedAdminRouter.route("/verify-pending-email").post(verifyPendingEmail);

//user manipulation from admin

protectedAdminRouter.route("/getallusers").get(getAllUser);

router.use("/", protectedAdminRouter);
export { router as adminRoutes };
