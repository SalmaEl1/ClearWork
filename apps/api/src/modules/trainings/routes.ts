import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { createTrainingHandler, deleteTrainingHandler, listTrainingsHandler } from "./controller.js";

/** El catálogo lo crea y borra solo el admin; el supervisor solo necesita
 * leerlo, para elegir qué asignar. */
export const trainingsRouter = Router();

trainingsRouter.use(authenticate);
trainingsRouter.use(authorize("admin", "supervisor"));

trainingsRouter.get("/", listTrainingsHandler);
trainingsRouter.post("/", authorize("admin"), createTrainingHandler);
trainingsRouter.delete("/:id", authorize("admin"), deleteTrainingHandler);
