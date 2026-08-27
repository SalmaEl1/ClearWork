import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  assignTrainingHandler,
  deleteTrainingAssignmentHandler,
  listMyTrainingAssignmentsHandler,
  listTeamTrainingAssignmentsHandler,
} from "./controller.js";

export const trainingAssignmentsRouter = Router();

trainingAssignmentsRouter.use(authenticate);

trainingAssignmentsRouter.get("/mine", authorize("worker"), listMyTrainingAssignmentsHandler);

trainingAssignmentsRouter.post("/", authorize("supervisor"), assignTrainingHandler);
trainingAssignmentsRouter.get("/team", authorize("supervisor"), listTeamTrainingAssignmentsHandler);

trainingAssignmentsRouter.delete(
  "/:id",
  authorize("admin", "supervisor"),
  deleteTrainingAssignmentHandler,
);
