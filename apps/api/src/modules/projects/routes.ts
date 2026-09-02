import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import {
  assignMemberHandler,
  assignMemberToMyProjectHandler,
  createProjectHandler,
  deleteProjectHandler,
  exportProjectsHandler,
  getMyProjectHandler,
  getProjectForWorkerHandler,
  getProjectHandler,
  getProjectTasksHandler,
  listMyProjectMembersHandler,
  listMyProjectsHandler,
  listProjectsHandler,
  listWorkersForAssignmentHandler,
  removeMemberFromMyProjectHandler,
  removeMemberHandler,
  updateMyProjectHandler,
  updateProjectHandler,
} from "./controller.js";
import {
  assignMemberSchema,
  createProjectSchema,
  updateMyProjectSchema,
  updateProjectSchema,
} from "./schemas.js";

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
 * Acceso del supervisor a sus propios proyectos: puede editar nombre y
 * descripción, y asignar/quitar miembros, pero nunca ve proyectos ajenos
 * ni puede crearlos, archivarlos, borrarlos o reasignar quién los
 * supervisa — eso sigue siendo exclusivo del admin, arriba.
 */
export const supervisorProjectsRouter = Router();

supervisorProjectsRouter.use(authenticate, authorize("supervisor"));
supervisorProjectsRouter.get("/", listMyProjectsHandler);
// Antes de "/:id": si no, Express trataría "workers" como un id.
supervisorProjectsRouter.get("/workers", listWorkersForAssignmentHandler);
supervisorProjectsRouter.get("/:id", getMyProjectHandler);
supervisorProjectsRouter.get("/:id/members", listMyProjectMembersHandler);
supervisorProjectsRouter.patch(
  "/:id",
  validateBody(updateMyProjectSchema),
  updateMyProjectHandler,
);
supervisorProjectsRouter.post(
  "/:id/members",
  validateBody(assignMemberSchema),
  assignMemberToMyProjectHandler,
);
supervisorProjectsRouter.delete("/:id/members/:userId", removeMemberFromMyProjectHandler);

/**
 * Acceso de solo lectura del trabajador a su propio proyecto: sin
 * gestión de ningún tipo, solo ver los datos (incluidos los del
 * cliente) del proyecto del que es miembro ahora mismo.
 */
export const workerProjectRouter = Router();

workerProjectRouter.use(authenticate, authorize("worker"));
workerProjectRouter.get("/", getProjectForWorkerHandler);
