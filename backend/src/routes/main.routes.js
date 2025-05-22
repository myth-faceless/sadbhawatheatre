import { Router } from "express";
const router = Router();

//router import
import { authRoutes } from "./auth.routes.js";
import { userRoutes } from "./user.routes.js";
import { adminRoutes } from "./admin.routes.js";

//----------------global route ----------------
router.use("/", authRoutes);

//--------------user route----------------

router.use("/user", userRoutes);

//---------------admin route-------------
router.use("/admin", adminRoutes);

export { router as mainRoutes };
