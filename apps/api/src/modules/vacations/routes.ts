import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  approveVacationRequestHandler,
  cancelVacationRequestHandler,
  createVacationRequestHandler,
  listMyVacationRequestsHandler,
  listTeamVacationRequestsHandler,
  rejectVacationRequestHandler,
} from "./controller.js";

/** Mezcla rutas de trabajador (solicitar/cancelar lo propio) y de
 * supervisor (ver y decidir las de su equipo): cada una autoriza su
 * propio rol en vez de un authorize() a nivel de router. */
export const vacationsRouter = Router();

vacationsRouter.use(authenticate);

vacationsRouter.post("/", authorize("worker"), createVacationRequestHandler);
vacationsRouter.get("/mine", authorize("worker"), listMyVacationRequestsHandler);
vacationsRouter.post("/:id/cancel", authorize("worker"), cancelVacationRequestHandler);

vacationsRouter.get("/team", authorize("supervisor"), listTeamVacationRequestsHandler);
vacationsRouter.post("/:id/approve", authorize("supervisor"), approveVacationRequestHandler);
vacationsRouter.post("/:id/reject", authorize("supervisor"), rejectVacationRequestHandler);
