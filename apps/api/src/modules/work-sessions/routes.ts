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
  startBreakHandler,
} from "./controller.js";
import { startBreakSchema } from "./schemas.js";

export const workSessionsRouter = Router();

// Fichar es exclusivo del trabajador: un supervisor no ficha, y esto
// se aplica a nivel de ruta, no como una comprobación aparte en cada handler.
workSessionsRouter.use(authenticate, authorize("worker"));

workSessionsRouter.get("/active", getActiveSessionHandler);
workSessionsRouter.get("/", getHistoryHandler);
workSessionsRouter.post("/clock-in", clockInHandler);
workSessionsRouter.post("/clock-out", clockOutHandler);
workSessionsRouter.post("/breaks/start", validateBody(startBreakSchema), startBreakHandler);
workSessionsRouter.post("/breaks/end", endBreakHandler);
