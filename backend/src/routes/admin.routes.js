import { Router } from "express";

import { uploadWithErrorHandling } from "../middlewares/multer.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";

import {
  loginSchema,
  updateSchema,
  changePasswordSchema,
  resetPasswordSchema,
} from "../validations/global.validation.js";

import {
  login,
  logout,
  updateProfile,
  verifyPendingEmail,
  changePassword,
} from "../controllers/auth.controller.js";

import {
  deleteUserById,
  getAllUser,
  getUserById,
  updateUserById,
} from "../controllers/admin.controller.js";
import { getAllTeamMembers } from "../controllers/team.controller.js";

const router = Router();
//-------------------------- public admin route-----------------------------------

router.route("/login").post(
  (req, res, next) => {
    req.expectedRole = "admin";
    next();
  },
  validate(loginSchema),
  login
);

//---------------------------protected admin routes--------------------------------

const protectedAdminRouter = Router();
protectedAdminRouter.use(verifyJWT, verifyRole("admin"));

protectedAdminRouter.route("/logout").post(logout);

protectedAdminRouter
  .route("/updateprofile")
  .put(
    uploadWithErrorHandling("avatar"),
    validate(updateSchema),
    updateProfile
  );
protectedAdminRouter
  .route("/updatepassword")
  .put(validate(changePasswordSchema), changePassword);

protectedAdminRouter.route("/verify-pending-email").post(verifyPendingEmail);

//------------------user manipulation from admin--------------------------------

protectedAdminRouter.route("/getallusers").get(getAllUser);
protectedAdminRouter.route("/getuser/:id").get(getUserById);
protectedAdminRouter
  .route("/updateuser/:id")
  .put(
    uploadWithErrorHandling("avatar"),
    validate(updateSchema),
    updateUserById
  );

protectedAdminRouter.route("/deleteuser/:id").delete(deleteUserById);

//-----------------------------team member manipuulation----------------------------

protectedAdminRouter.route("/getallmember").get(getAllTeamMembers);

router.use("/", protectedAdminRouter);
export { router as adminRoutes };
