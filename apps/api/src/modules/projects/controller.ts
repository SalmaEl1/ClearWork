import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors.js";
import type { AuthUser } from "../auth/jwt.js";
import { exportProjectsQuerySchema, listProjectsQuerySchema } from "./schemas.js";
import * as service from "./service.js";

function requireUser(req: Request): AuthUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export async function createProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await service.createProject(req.body);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

export async function listProjectsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listProjectsQuerySchema.parse(req.query);
    const projects = await service.listProjects(query);
    res.status(200).json(projects);
  } catch (err) {
    next(err);
  }
}

export async function exportProjectsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = exportProjectsQuerySchema.parse(req.query);
    const csv = await service.exportProjectsCsv(filters);
    res.status(200);
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", 'attachment; filename="proyectos.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

export async function getProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await service.getProject(req.params.id as string);
    res.status(200).json(project);
  } catch (err) {
    next(err);
  }
}

export async function getProjectTasksHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const tasks = await service.getProjectTasks(req.params.id as string);
    res.status(200).json(tasks);
  } catch (err) {
    next(err);
  }
}

export async function updateProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await service.updateProject(req.params.id as string, req.body);
    res.status(200).json(project);
  } catch (err) {
    next(err);
  }
}

export async function assignMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await service.assignMember(req.params.id as string, req.body);
    res.status(200).json(project);
  } catch (err) {
    next(err);
  }
}

export async function removeMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await service.removeMember(
      req.params.id as string,
      req.params.userId as string,
    );
    res.status(200).json(project);
  } catch (err) {
    next(err);
  }
}

export async function deleteProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteProject(req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function listMyProjectsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const projects = await service.listMyProjects(user.id);
    res.status(200).json(projects);
  } catch (err) {
    next(err);
  }
}

export async function listMyProjectMembersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = requireUser(req);
    const members = await service.listMyProjectMembers(req.params.id as string, user.id);
    res.status(200).json(members);
  } catch (err) {
    next(err);
  }
}
