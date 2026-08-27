import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { createLeaveHandler, deleteLeaveHandler, listLeavesHandler } from "./controller.js";

/** Solo admin y supervisor dan de alta o consultan bajas; el alcance
 * exacto (un supervisor solo sobre su propio equipo) lo comprueba el
 * servicio, no esta capa. */
export const leavesRouter = Router();

leavesRouter.use(authenticate);
leavesRouter.use(authorize("admin", "supervisor"));

leavesRouter.post("/", createLeaveHandler);
leavesRouter.get("/", listLeavesHandler);
leavesRouter.delete("/:id", deleteLeaveHandler);
