import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import { loginHandler, meHandler, registerHandler } from "./controller.js";
import { loginSchema, registerSchema } from "./schemas.js";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), registerHandler);
authRouter.post("/login", validateBody(loginSchema), loginHandler);
authRouter.get("/me", authenticate, meHandler);
