import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors.js";
import type { AuthUser } from "../auth/jwt.js";
import { createTrainingAssignmentSchema } from "./schemas.js";
import * as service from "./service.js";

function requireUser(req: Request): AuthUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export async function assignTrainingHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const input = createTrainingAssignmentSchema.parse(req.body);
    const assignment = await service.assignTraining(user.id, input);
    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
}

export async function listMyTrainingAssignmentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const assignments = await service.listMyTrainingAssignments(user.id);
    res.status(200).json(assignments);
  } catch (err) {
    next(err);
  }
}

export async function listTeamTrainingAssignmentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const assignments = await service.listTeamTrainingAssignments(user.id);
    res.status(200).json(assignments);
  } catch (err) {
    next(err);
  }
}

export async function deleteTrainingAssignmentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    await service.deleteTrainingAssignment(user.id, user.role, req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
