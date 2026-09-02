import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors.js";
import type { AuthUser } from "../auth/jwt.js";
import { logTaskTimeSchema, taskListQuerySchema } from "./schemas.js";
import * as service from "./service.js";

function requireUser(req: Request): AuthUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export async function createTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const task = await service.createTask(user.id, req.body);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

export async function listTasksHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const filters = taskListQuerySchema.parse(req.query);
    const tasks = await service.listTasks(user.id, user.role, filters);
    res.status(200).json(tasks);
  } catch (err) {
    next(err);
  }
}

export async function getTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const task = await service.getTaskDetail(req.params.id as string, user.id, user.role);
    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
}

export async function updateTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const task = await service.updateTask(req.params.id as string, user.id, req.body);
    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
}

export async function updateTaskStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = requireUser(req);
    const task = await service.updateTaskStatus(
      req.params.id as string,
      user.id,
      user.role,
      req.body.status,
    );
    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
}

export async function updateTaskProgressHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = requireUser(req);
    const task = await service.updateTaskProgress(
      req.params.id as string,
      user.id,
      user.role,
      req.body.progressPercentage,
    );
    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
}

export async function logTaskTimeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const input = logTaskTimeSchema.parse(req.body);
    const task = await service.logTaskTime(req.params.id as string, user.id, user.role, input);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

export async function deleteTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    await service.deleteTask(req.params.id as string, user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
