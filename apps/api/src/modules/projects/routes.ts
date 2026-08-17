import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import {
  assignMemberHandler,
  createProjectHandler,
  deleteProjectHandler,
  exportProjectsHandler,
  getProjectHandler,
  getProjectTasksHandler,
  listMyProjectMembersHandler,
  listMyProjectsHandler,
  listProjectsHandler,
  removeMemberHandler,
  updateProjectHandler,
} from "./controller.js";
import { assignMemberSchema, createProjectSchema, updateProjectSchema } from "./schemas.js";

export const projectsRouter = Router();

// La gestión de proyectos (crear, editar, asignar/quitar miembros) es
// exclusiva del admin. El supervisor tiene su propio acceso, más
// limitado, a través de supervisorProjectsRouter (debajo).
projectsRouter.use(authenticate, authorize("admin"));

projectsRouter.post("/", validateBody(createProjectSchema), createProjectHandler);
projectsRouter.get("/", listProjectsHandler);
// Antes de "/:id": si no, Express trataría "export" como un id.
projectsRouter.get("/export", exportProjectsHandler);
projectsRouter.get("/:id", getProjectHandler);
projectsRouter.get("/:id/tasks", getProjectTasksHandler);
projectsRouter.patch("/:id", validateBody(updateProjectSchema), updateProjectHandler);
projectsRouter.delete("/:id", deleteProjectHandler);
projectsRouter.post("/:id/members", validateBody(assignMemberSchema), assignMemberHandler);
projectsRouter.delete("/:id/members/:userId", removeMemberHandler);

/**
 * Acceso de solo lectura del supervisor a sus propios proyectos: solo lo
 * necesario para gestionar tareas (elegir en qué proyecto, y quién puede
 * ser responsable de una tarea). Nunca ve proyectos ajenos ni puede
 * crear/editar/borrar proyectos ni tocar la membresía — eso sigue siendo
 * exclusivo del admin, arriba.
 */
export const supervisorProjectsRouter = Router();

supervisorProjectsRouter.use(authenticate, authorize("supervisor"));
supervisorProjectsRouter.get("/", listMyProjectsHandler);
supervisorProjectsRouter.get("/:id/members", listMyProjectMembersHandler);
