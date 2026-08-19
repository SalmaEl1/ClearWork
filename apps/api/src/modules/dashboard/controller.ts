import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors.js";
import { dashboardQuerySchema } from "./schemas.js";
import * as service from "./service.js";

function requireUserId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

/** `now` desplazado weekOffset semanas: getWorkerDashboard/getSupervisorDashboard
 * ya saben calcular la semana de cualquier fecha que se les pase, así que
 * desplazar "hoy" hacia atrás es toda la lógica que hace falta para pedir
 * una semana pasada — no hace falta tocar el servicio. */
function shiftedNow(weekOffset: number): Date {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + weekOffset * 7);
  return now;
}

export async function getWorkerDashboardHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { weekOffset } = dashboardQuerySchema.parse(req.query);
    const dashboard = await service.getWorkerDashboard(requireUserId(req), shiftedNow(weekOffset));
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
    const { weekOffset } = dashboardQuerySchema.parse(req.query);
    const dashboard = await service.getSupervisorDashboard(requireUserId(req), shiftedNow(weekOffset));
    res.status(200).json(dashboard);
  } catch (err) {
    next(err);
  }
}
