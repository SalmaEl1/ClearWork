import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { forgotPasswordRateLimit, loginRateLimit } from "../../middleware/rateLimit.js";
import { validateBody } from "../../middleware/validate.js";
import {
  changePasswordHandler,
  forgotPasswordHandler,
  loginHandler,
  meHandler,
  resetPasswordHandler,
  updateProfileHandler,
} from "./controller.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "./schemas.js";

export const authRouter = Router();

authRouter.post("/login", loginRateLimit, validateBody(loginSchema), loginHandler);
authRouter.post(
  "/forgot-password",
  forgotPasswordRateLimit,
  validateBody(forgotPasswordSchema),
  forgotPasswordHandler,
);
authRouter.post("/reset-password", validateBody(resetPasswordSchema), resetPasswordHandler);
authRouter.get("/me", authenticate, meHandler);
authRouter.patch("/me", authenticate, validateBody(updateProfileSchema), updateProfileHandler);
authRouter.patch(
  "/password",
  authenticate,
  validateBody(changePasswordSchema),
  changePasswordHandler,
);
