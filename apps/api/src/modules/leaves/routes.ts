import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { createLeaveHandler, deleteLeaveHandler, endLeaveHandler, listLeavesHandler } from "./controller.js";

/** Dar de alta o borrar una baja es cosa de admin y supervisor; el
 * alcance exacto (un supervisor solo sobre su propio equipo) lo
 * comprueba el servicio, no esta capa. Consultar está abierto a
 * cualquier rol autenticado porque un trabajador también puede ver las
 * suyas (issue #101) — ahí el servicio limita a "solo las propias". */
export const leavesRouter = Router();

leavesRouter.use(authenticate);

leavesRouter.post("/", authorize("admin", "supervisor"), createLeaveHandler);
leavesRouter.get("/", listLeavesHandler);
leavesRouter.post("/:id/end", authorize("admin", "supervisor"), endLeaveHandler);
leavesRouter.delete("/:id", authorize("admin", "supervisor"), deleteLeaveHandler);
