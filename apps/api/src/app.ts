import cors from "cors";
import express from "express";
import { corsOrigins } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { generalRateLimit } from "./middleware/rateLimit.js";
import { adminActivityRouter, adminUsersRouter } from "./modules/admin/routes.js";
import { authRouter } from "./modules/auth/routes.js";
import { dashboardRouter } from "./modules/dashboard/routes.js";
import { leavesRouter } from "./modules/leaves/routes.js";
import { notificationPreferencesRouter } from "./modules/notification-preferences/routes.js";
import { notificationsRouter } from "./modules/notifications/routes.js";
import { projectsRouter, supervisorProjectsRouter } from "./modules/projects/routes.js";
import { scheduledAbsencesRouter } from "./modules/scheduled-absences/routes.js";
import { settingsRouter } from "./modules/settings/routes.js";
import { tasksRouter } from "./modules/tasks/routes.js";
import { vacationsRouter } from "./modules/vacations/routes.js";
import { workSessionsRouter } from "./modules/work-sessions/routes.js";
import { NotFoundError } from "./shared/errors.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: corsOrigins }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Fuera del límite general: los chequeos de salud no deben poder
  // agotar la cuota de nadie.
  app.use("/api", generalRateLimit);

  app.use("/api/auth", authRouter);
  app.use("/api/work-sessions", workSessionsRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/admin/users", adminUsersRouter);
  app.use("/api/admin/projects", projectsRouter);
  app.use("/api/admin/activity", adminActivityRouter);
  app.use("/api/admin/settings", settingsRouter);
  app.use("/api/supervisor/projects", supervisorProjectsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/notification-preferences", notificationPreferencesRouter);
  app.use("/api/leaves", leavesRouter);
  app.use("/api/vacations", vacationsRouter);
  app.use("/api/scheduled-absences", scheduledAbsencesRouter);

  app.use((req, _res, next) => {
    next(new NotFoundError(`No existe la ruta ${req.method} ${req.path}`));
  });

  // Debe ser el último `app.use`: Express lo reconoce como manejador de
  // errores por tener cuatro parámetros en su firma.
  app.use(errorHandler);

  return app;
}
