import cors from "cors";
import express from "express";
import { corsOrigins } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { adminUsersRouter } from "./modules/admin/routes.js";
import { authRouter } from "./modules/auth/routes.js";
import { dashboardRouter } from "./modules/dashboard/routes.js";
import { projectsRouter } from "./modules/projects/routes.js";
import { tasksRouter } from "./modules/tasks/routes.js";
import { workSessionsRouter } from "./modules/work-sessions/routes.js";
import { NotFoundError } from "./shared/errors.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: corsOrigins }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/work-sessions", workSessionsRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/admin/users", adminUsersRouter);
  app.use("/api/admin/projects", projectsRouter);

  app.use((req, _res, next) => {
    next(new NotFoundError(`No existe la ruta ${req.method} ${req.path}`));
  });

  // Debe ser el último `app.use`: Express lo reconoce como manejador de
  // errores por tener cuatro parámetros en su firma.
  app.use(errorHandler);

  return app;
}
