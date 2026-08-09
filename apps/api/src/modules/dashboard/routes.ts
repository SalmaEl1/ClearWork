import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { getSupervisorDashboardHandler, getWorkerDashboardHandler } from "./controller.js";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get("/worker", authorize("worker"), getWorkerDashboardHandler);
dashboardRouter.get("/supervisor", authorize("supervisor"), getSupervisorDashboardHandler);
