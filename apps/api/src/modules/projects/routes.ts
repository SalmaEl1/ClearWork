import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import {
  createProjectHandler,
  getProjectHandler,
  listProjectsHandler,
  updateProjectHandler,
} from "./controller.js";
import { createProjectSchema, updateProjectSchema } from "./schemas.js";

export const projectsRouter = Router();

// Los proyectos son un recurso exclusivo del supervisor: el teletrabajador
// solo los ve indirectamente, a través de sus tareas.
projectsRouter.use(authenticate, authorize("supervisor"));

projectsRouter.post("/", validateBody(createProjectSchema), createProjectHandler);
projectsRouter.get("/", listProjectsHandler);
projectsRouter.get("/:id", getProjectHandler);
projectsRouter.patch("/:id", validateBody(updateProjectSchema), updateProjectHandler);
