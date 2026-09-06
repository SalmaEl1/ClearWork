import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import { createHolidayHandler, deleteHolidayHandler, listHolidaysHandler } from "./controller.js";
import { createHolidaySchema } from "./schemas.js";

/** Consultar los festivos (para el calendario y el selector de
 * vacaciones) está abierto a cualquier rol autenticado; añadir o
 * quitar un festivo personalizado es solo del admin. */
export const holidaysRouter = Router();

holidaysRouter.use(authenticate);

holidaysRouter.get("/", listHolidaysHandler);
holidaysRouter.post("/", authorize("admin"), validateBody(createHolidaySchema), createHolidayHandler);
holidaysRouter.delete("/:id", authorize("admin"), deleteHolidayHandler);
