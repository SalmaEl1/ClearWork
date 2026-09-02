import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import {
  clockInHandler,
  clockOutHandler,
  endBreakHandler,
  getActiveSessionHandler,
  getHistoryHandler,
  getTeamMemberHistoryHandler,
  startBreakHandler,
} from "./controller.js";
import { startBreakSchema } from "./schemas.js";

export const workSessionsRouter = Router();

workSessionsRouter.use(authenticate);

// Fichar es exclusivo del trabajador: un supervisor no ficha.
workSessionsRouter.get("/active", authorize("worker"), getActiveSessionHandler);
workSessionsRouter.get("/", authorize("worker"), getHistoryHandler);
workSessionsRouter.post("/clock-in", authorize("worker"), clockInHandler);
workSessionsRouter.post("/clock-out", authorize("worker"), clockOutHandler);
workSessionsRouter.post(
  "/breaks/start",
  authorize("worker"),
  validateBody(startBreakSchema),
  startBreakHandler,
);
workSessionsRouter.post("/breaks/end", authorize("worker"), endBreakHandler);

// El historial de un miembro del equipo, para el supervisor (issue #101):
// mismo formato que el propio del trabajador, ver work-sessions/service.ts.
workSessionsRouter.get("/team/:userId", authorize("supervisor"), getTeamMemberHistoryHandler);
