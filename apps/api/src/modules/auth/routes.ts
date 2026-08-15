import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import {
  changePasswordHandler,
  loginHandler,
  meHandler,
  updateProfileHandler,
} from "./controller.js";
import { changePasswordSchema, loginSchema, updateProfileSchema } from "./schemas.js";

export const authRouter = Router();

authRouter.post("/login", validateBody(loginSchema), loginHandler);
authRouter.get("/me", authenticate, meHandler);
authRouter.patch("/me", authenticate, validateBody(updateProfileSchema), updateProfileHandler);
authRouter.patch(
  "/password",
  authenticate,
  validateBody(changePasswordSchema),
  changePasswordHandler,
);
