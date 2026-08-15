import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import {
  createUserHandler,
  deleteUserHandler,
  getUserHandler,
  listActivityHandler,
  listUsersHandler,
  resendWelcomeHandler,
  updateUserHandler,
} from "./controller.js";
import { createUserSchema, updateUserSchema } from "./schemas.js";

export const adminUsersRouter = Router();

adminUsersRouter.use(authenticate, authorize("admin"));

adminUsersRouter.post("/", validateBody(createUserSchema), createUserHandler);
adminUsersRouter.get("/", listUsersHandler);
adminUsersRouter.get("/:id", getUserHandler);
adminUsersRouter.patch("/:id", validateBody(updateUserSchema), updateUserHandler);
adminUsersRouter.delete("/:id", deleteUserHandler);
adminUsersRouter.post("/:id/resend-welcome", resendWelcomeHandler);

export const adminActivityRouter = Router();

adminActivityRouter.use(authenticate, authorize("admin"));
adminActivityRouter.get("/", listActivityHandler);
