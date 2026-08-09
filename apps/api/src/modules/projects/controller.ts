import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors.js";
import * as service from "./service.js";

function requireUserId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

export async function createProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await service.createProject(requireUserId(req), req.body);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

export async function listProjectsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await service.listProjects(requireUserId(req));
    res.status(200).json(projects);
  } catch (err) {
    next(err);
  }
}

export async function getProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await service.getProject(req.params.id as string, requireUserId(req));
    res.status(200).json(project);
  } catch (err) {
    next(err);
  }
}

export async function updateProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await service.updateProject(
      req.params.id as string,
      requireUserId(req),
      req.body,
    );
    res.status(200).json(project);
  } catch (err) {
    next(err);
  }
}
