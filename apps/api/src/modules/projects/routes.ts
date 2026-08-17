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
  listProjectsHandler,
  removeMemberHandler,
  updateProjectHandler,
} from "./controller.js";
import { assignMemberSchema, createProjectSchema, updateProjectSchema } from "./schemas.js";

export const projectsRouter = Router();

// La gestión de proyectos (crear, editar, asignar/quitar miembros) es
// exclusiva del admin. El supervisor los ve indirectamente a través del
// dashboard y de sus tareas, no de este router.
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
