import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  cancelSeatReservationHandler,
  createSeatReservationHandler,
  getSeatAvailabilityHandler,
} from "./controller.js";

/** Consultar la disponibilidad de un día está abierto a cualquier rol
 * autenticado; reservar o cancelar es cosa del propio trabajador, sobre
 * su propia reserva — no hay reserva "para otro". */
export const seatsRouter = Router();

seatsRouter.use(authenticate);

seatsRouter.get("/", getSeatAvailabilityHandler);
seatsRouter.post("/", authorize("worker"), createSeatReservationHandler);
seatsRouter.delete("/:id", authorize("worker"), cancelSeatReservationHandler);
