import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors.js";
import type { AuthUser } from "../auth/jwt.js";
import { createLeaveSchema, listLeavesQuerySchema } from "./schemas.js";
import * as service from "./service.js";

function requireUser(req: Request): AuthUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export async function createLeaveHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const input = createLeaveSchema.parse(req.body);
    const leave = await service.createLeave(user.id, user.role, {
      ...input,
      endDate: input.endDate ?? null,
    });
    res.status(201).json(leave);
  } catch (err) {
    next(err);
  }
}

export async function listLeavesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const { userId } = listLeavesQuerySchema.parse(req.query);
    const leaves = await service.listLeaves(user.id, user.role, userId);
    res.status(200).json(leaves);
  } catch (err) {
    next(err);
  }
}

export async function deleteLeaveHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    await service.deleteLeave(user.id, user.role, req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
