import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors.js";
import * as service from "./service.js";

function requireUserId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

export async function getWorkerDashboardHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dashboard = await service.getWorkerDashboard(requireUserId(req));
    res.status(200).json(dashboard);
  } catch (err) {
    next(err);
  }
}

export async function getSupervisorDashboardHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dashboard = await service.getSupervisorDashboard(requireUserId(req));
    res.status(200).json(dashboard);
  } catch (err) {
    next(err);
  }
}
