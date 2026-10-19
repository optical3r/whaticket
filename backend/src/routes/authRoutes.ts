import { Router } from "express";
import * as SessionController from "../controllers/SessionController";
import * as UserController from "../controllers/UserController";
import isAuth from "../middleware/isAuth";
import authRateLimit from "../middleware/authRateLimit";

const authRoutes = Router();

authRoutes.post("/signup", authRateLimit, UserController.store);

authRoutes.post("/login", authRateLimit, SessionController.store);

authRoutes.post("/refresh_token", SessionController.update);

authRoutes.delete("/logout", isAuth, SessionController.remove);

export default authRoutes;
