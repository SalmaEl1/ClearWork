import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  cancelSeatReservationHandler,
  createSeatReservationHandler,
  getMySeatReservationsHandler,
  getSeatAvailabilityHandler,
} from "./controller.js";

/** Consultar la disponibilidad de un día está abierto a cualquier rol
 * autenticado; reservar o cancelar es cosa del propio trabajador, sobre
 * su propia reserva — no hay reserva "para otro". */
export const seatsRouter = Router();

seatsRouter.use(authenticate);

seatsRouter.get("/", getSeatAvailabilityHandler);
// Antes de cualquier ruta con :id — no aplica aquí (no hay GET /:id), pero
// mantiene el mismo criterio que el resto de módulos.
seatsRouter.get("/mine", authorize("worker"), getMySeatReservationsHandler);
seatsRouter.post("/", authorize("worker"), createSeatReservationHandler);
seatsRouter.delete("/:id", authorize("worker"), cancelSeatReservationHandler);
