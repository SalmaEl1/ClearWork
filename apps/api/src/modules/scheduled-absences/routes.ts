import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import {
  createScheduledAbsenceHandler,
  createTeamScheduledAbsenceHandler,
  deleteScheduledAbsenceHandler,
  listMyScheduledAbsencesHandler,
  listTeamMemberScheduledAbsencesHandler,
  listTeamScheduledAbsencesHandler,
  updateScheduledAbsenceHandler,
} from "./controller.js";
import {
  createScheduledAbsenceSchema,
  createTeamScheduledAbsenceSchema,
  updateScheduledAbsenceSchema,
} from "./schemas.js";

/**
 * Autoservicio del trabajador sobre sus propias ausencias puntuales
 * (crearlas solo hoy o más tarde, verlas, borrarlas), más la gestión
 * completa del supervisor sobre las de su equipo (verlas todas juntas,
 * programar una en su nombre sin restricción de fecha, editarlas y
 * borrarlas). Borrar es la única acción que comparten los dos roles: el
 * propio esquema de autorización vive en el servicio (assertCanManage),
 * no aquí, porque depende de si la ausencia es la suya o de su equipo.
 */
export const scheduledAbsencesRouter = Router();

scheduledAbsencesRouter.use(authenticate);

scheduledAbsencesRouter.post(
  "/",
  authorize("worker"),
  validateBody(createScheduledAbsenceSchema),
  createScheduledAbsenceHandler,
);
scheduledAbsencesRouter.get("/", authorize("worker"), listMyScheduledAbsencesHandler);
scheduledAbsencesRouter.delete("/:id", deleteScheduledAbsenceHandler);

scheduledAbsencesRouter.get("/team", authorize("supervisor"), listTeamScheduledAbsencesHandler);
scheduledAbsencesRouter.post(
  "/team",
  authorize("supervisor"),
  validateBody(createTeamScheduledAbsenceSchema),
  createTeamScheduledAbsenceHandler,
);
scheduledAbsencesRouter.get(
  "/team/:userId",
  authorize("supervisor"),
  listTeamMemberScheduledAbsencesHandler,
);
scheduledAbsencesRouter.patch(
  "/:id",
  authorize("supervisor"),
  validateBody(updateScheduledAbsenceSchema),
  updateScheduledAbsenceHandler,
);
