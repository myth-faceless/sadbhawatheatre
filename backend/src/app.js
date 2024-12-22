import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { allowedOrigins } from "./constants/app.constants.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.middleware.js";

const app = express();

//middlewares
app.use(
    cors({
        origin: allowedOrigins,
        credentials: true
    })
)
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(morgan("dev"));
app.use(cookieParser());

//routes import
// import { mainRoutes } from "./routes/main.routes.js";

//routes declaration
// app.use("/api/v1", mainRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;