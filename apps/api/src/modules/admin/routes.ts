import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import {
  createUserHandler,
  deleteUserHandler,
  exportActivityHandler,
  exportTeamActivityHandler,
  exportUsersHandler,
  getUserHandler,
  listActivityHandler,
  listTeamActivityHandler,
  listUsersHandler,
  resendWelcomeHandler,
  updateUserHandler,
} from "./controller.js";
import { createUserSchema, updateUserSchema } from "./schemas.js";

export const adminUsersRouter = Router();

adminUsersRouter.use(authenticate, authorize("admin"));

adminUsersRouter.post("/", validateBody(createUserSchema), createUserHandler);
adminUsersRouter.get("/", listUsersHandler);
// Antes de "/:id": si no, Express trataría "export" como un id.
adminUsersRouter.get("/export", exportUsersHandler);
adminUsersRouter.get("/:id", getUserHandler);
adminUsersRouter.patch("/:id", validateBody(updateUserSchema), updateUserHandler);
adminUsersRouter.delete("/:id", deleteUserHandler);
adminUsersRouter.post("/:id/resend-welcome", resendWelcomeHandler);

export const adminActivityRouter = Router();

adminActivityRouter.use(authenticate, authorize("admin"));
// Antes de "/:id" no aplica aquí (no hay ninguna), pero se mantiene el
// mismo criterio que adminUsersRouter para las rutas fijas.
adminActivityRouter.get("/export", exportActivityHandler);
adminActivityRouter.get("/", listActivityHandler);

/** Mismo feed que adminActivityRouter, pero acotado al equipo de quien
 * pregunta (issue #134) — vive en este módulo, no en uno de
 * "supervisor" aparte, igual que supervisorProjectsRouter vive en
 * modules/projects/routes.ts: el router cruzado de rol vive junto al
 * recurso al que pertenece. */
export const supervisorActivityRouter = Router();

supervisorActivityRouter.use(authenticate, authorize("supervisor"));
supervisorActivityRouter.get("/export", exportTeamActivityHandler);
supervisorActivityRouter.get("/", listTeamActivityHandler);
