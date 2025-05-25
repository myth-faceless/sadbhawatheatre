import { Router } from "express";
const router = Router();

//router import
import { userRoutes } from "./user.routes.js";
import { adminRoutes } from "./admin.routes.js";
import { globalRoutes } from "./global.routes.js";

//----------------global routes----------------
router.use("/", globalRoutes);

//--------------user route----------------

router.use("/user", userRoutes);

//---------------admin route-------------
router.use("/admin", adminRoutes);

export { router as mainRoutes };
