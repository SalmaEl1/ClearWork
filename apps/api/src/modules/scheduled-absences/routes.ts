import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  createScheduledAbsenceHandler,
  deleteScheduledAbsenceHandler,
  listMyScheduledAbsencesHandler,
  listTeamMemberScheduledAbsencesHandler,
} from "./controller.js";

/** Autoservicio del trabajador sobre sus propias ausencias puntuales
 * (a diferencia de las bajas, aquí no hay decisión de nadie más), más una
 * consulta de solo lectura para el supervisor sobre alguien de su equipo
 * (issue #101). */
export const scheduledAbsencesRouter = Router();

scheduledAbsencesRouter.use(authenticate);

scheduledAbsencesRouter.post("/", authorize("worker"), createScheduledAbsenceHandler);
scheduledAbsencesRouter.get("/", authorize("worker"), listMyScheduledAbsencesHandler);
scheduledAbsencesRouter.delete("/:id", authorize("worker"), deleteScheduledAbsenceHandler);

scheduledAbsencesRouter.get(
  "/team/:userId",
  authorize("supervisor"),
  listTeamMemberScheduledAbsencesHandler,
);
