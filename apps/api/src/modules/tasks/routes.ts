import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import {
  createTaskHandler,
  deleteTaskHandler,
  getTaskHandler,
  listTasksHandler,
  updateTaskHandler,
  updateTaskStatusHandler,
} from "./controller.js";
import { createTaskSchema, updateTaskSchema, updateTaskStatusSchema } from "./schemas.js";

export const tasksRouter = Router();

tasksRouter.use(authenticate);

// Listar y ver el detalle están disponibles para ambos roles; el propio
// servicio decide el alcance según el rol (sus tareas vs. las de su equipo).
tasksRouter.get("/", listTasksHandler);
tasksRouter.get("/:id", getTaskHandler);

// Cambiar el estado también está disponible para ambos roles: es la
// interacción diaria del trabajador con sus tareas.
tasksRouter.patch(
  "/:id/status",
  validateBody(updateTaskStatusSchema),
  updateTaskStatusHandler,
);

// Crear, editar el resto de campos y borrar son exclusivos del supervisor.
tasksRouter.post("/", authorize("supervisor"), validateBody(createTaskSchema), createTaskHandler);
tasksRouter.patch(
  "/:id",
  authorize("supervisor"),
  validateBody(updateTaskSchema),
  updateTaskHandler,
);
tasksRouter.delete("/:id", authorize("supervisor"), deleteTaskHandler);
