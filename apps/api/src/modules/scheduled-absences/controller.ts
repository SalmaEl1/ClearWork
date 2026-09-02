import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors.js";
import type { AuthUser } from "../auth/jwt.js";
import { createScheduledAbsenceSchema } from "./schemas.js";
import * as service from "./service.js";

function requireUser(req: Request): AuthUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export async function createScheduledAbsenceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const input = createScheduledAbsenceSchema.parse(req.body);
    const absence = await service.createScheduledAbsence(user.id, input);
    res.status(201).json(absence);
  } catch (err) {
    next(err);
  }
}

export async function listMyScheduledAbsencesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const absences = await service.listMyScheduledAbsences(user.id);
    res.status(200).json(absences);
  } catch (err) {
    next(err);
  }
}

export async function listTeamMemberScheduledAbsencesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = requireUser(req);
    const absences = await service.listScheduledAbsencesForTeamMember(
      user.id,
      req.params.userId as string,
    );
    res.status(200).json(absences);
  } catch (err) {
    next(err);
  }
}

export async function deleteScheduledAbsenceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    await service.deleteOwnScheduledAbsence(user.id, req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
