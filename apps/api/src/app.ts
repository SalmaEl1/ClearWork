import cors from "cors";
import express from "express";
import { corsOrigins } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/routes.js";
import { NotFoundError } from "./shared/errors.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: corsOrigins }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);

  app.use((req, _res, next) => {
    next(new NotFoundError(`No existe la ruta ${req.method} ${req.path}`));
  });

  // Debe ser el último `app.use`: Express lo reconoce como manejador de
  // errores por tener cuatro parámetros en su firma.
  app.use(errorHandler);

  return app;
}
