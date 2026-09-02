import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { listPreferencesHandler, updatePreferenceHandler } from "./controller.js";

/** Autoservicio para cualquier rol autenticado: cada persona gestiona
 * solo sus propias preferencias de notificación (issue #112). */
export const notificationPreferencesRouter = Router();

notificationPreferencesRouter.use(authenticate);
notificationPreferencesRouter.get("/", listPreferencesHandler);
notificationPreferencesRouter.patch("/:type", updatePreferenceHandler);
