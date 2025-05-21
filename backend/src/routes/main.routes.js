import { Router } from "express";
const router = Router();

//router import
import { userRoutes } from "./user.routes.js";
import { adminRoutes } from "./admin.routes.js";

//routes declaration
router.use("/", userRoutes);

router.use("/admin", adminRoutes);

export { router as mainRoutes };
