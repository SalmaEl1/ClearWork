import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  getUnreadCountHandler,
  listNotificationsHandler,
  markAllNotificationsReadHandler,
  markNotificationReadHandler,
} from "./controller.js";

/** Disponible para cualquier rol autenticado: cada quien ve y gestiona
 * solo sus propias notificaciones (siempre por user.id del token, nunca
 * por un id que llegue en la URL). */
export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get("/", listNotificationsHandler);
notificationsRouter.get("/unread-count", getUnreadCountHandler);
notificationsRouter.post("/read-all", markAllNotificationsReadHandler);
notificationsRouter.patch("/:id/read", markNotificationReadHandler);
