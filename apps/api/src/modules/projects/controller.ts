import type { NextFunction, Request, Response } from "express";
import * as service from "./service.js";

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
    const projects = await service.listProjects();
    res.status(200).json(projects);
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
