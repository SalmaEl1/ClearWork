import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import { createUserHandler, listUsersHandler, updateUserHandler } from "./controller.js";
import { createUserSchema, updateUserSchema } from "./schemas.js";

export const adminUsersRouter = Router();

adminUsersRouter.use(authenticate, authorize("admin"));

adminUsersRouter.post("/", validateBody(createUserSchema), createUserHandler);
adminUsersRouter.get("/", listUsersHandler);
adminUsersRouter.patch("/:id", validateBody(updateUserSchema), updateUserHandler);
