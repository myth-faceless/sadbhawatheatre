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
} from "../controllers/global.controller.js";

import {
  deleteUserById,
  getAllUser,
  getUserById,
  updateUserById,
} from "../controllers/admin.controller.js";
import {
  addTeamMember,
  deleteTeamMemberById,
  getAllTeamMembers,
  getTeamMemberById,
  updateTeamMemberById,
} from "../controllers/team.controller.js";
import {
  addPublication,
  deletePublicationById,
  getAllPublications,
  getPublicationById,
  updatePublicationById,
} from "../controllers/publication.controller..js";
import {
  addEvent,
  deleteEventById,
  getAllEvents,
  getEventById,
  updateEventById,
} from "../controllers/event.controller.js";
import { createBooking } from "../controllers/booking.controller.js";

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

protectedAdminRouter
  .route("/addmember")
  .post(uploadWithErrorHandling("photo"), addTeamMember);
protectedAdminRouter.route("/getallmember").get(getAllTeamMembers);

protectedAdminRouter.route("/getmember/:id").get(getTeamMemberById);
protectedAdminRouter
  .route("/updatemember/:id")
  .put(uploadWithErrorHandling("photo"), updateTeamMemberById);

protectedAdminRouter.route("/deletemember/:id").delete(deleteTeamMemberById);

//------------------------ publications manipulation --------------------------------

protectedAdminRouter
  .route("/addpublication")
  .post(uploadWithErrorHandling("photo"), addPublication);
protectedAdminRouter.route("/getallpublication").get(getAllPublications);

protectedAdminRouter.route("/getpublication/:id").get(getPublicationById);

protectedAdminRouter
  .route("/updatepublication/:id")
  .put(uploadWithErrorHandling("photo"), updatePublicationById);

protectedAdminRouter
  .route("/deletepublication/:id")
  .delete(deletePublicationById);

//----------------------------event manipulation--------------------------------------

protectedAdminRouter
  .route("/addevent")
  .post(uploadWithErrorHandling("photos", true), addEvent);
protectedAdminRouter.route("/getallevents").get(getAllEvents);
protectedAdminRouter.route("/getevent/:id").get(getEventById);
protectedAdminRouter
  .route("/updateevent/:id")
  .put(uploadWithErrorHandling("photos", true), updateEventById);

protectedAdminRouter.route("/deleteevent/:id").delete(deleteEventById);

//---------------------------------booking manipulation------------------------------------
protectedAdminRouter.route("/createbooking").post(createBooking);

router.use("/", protectedAdminRouter);
export { router as adminRoutes };
