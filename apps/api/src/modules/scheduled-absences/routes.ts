import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  createScheduledAbsenceHandler,
  deleteScheduledAbsenceHandler,
  listMyScheduledAbsencesHandler,
} from "./controller.js";

/** Autoservicio del trabajador sobre sus propias ausencias puntuales:
 * a diferencia de las bajas, aquí no hay decisión de nadie más. */
export const scheduledAbsencesRouter = Router();

scheduledAbsencesRouter.use(authenticate);
scheduledAbsencesRouter.use(authorize("worker"));

scheduledAbsencesRouter.post("/", createScheduledAbsenceHandler);
scheduledAbsencesRouter.get("/", listMyScheduledAbsencesHandler);
scheduledAbsencesRouter.delete("/:id", deleteScheduledAbsenceHandler);
