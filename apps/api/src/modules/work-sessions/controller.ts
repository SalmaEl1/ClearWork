import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors.js";
import { clockInSchema, historyQuerySchema, switchTaskSchema } from "./schemas.js";
import * as service from "./service.js";

function requireUserId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

export async function clockInHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = clockInSchema.parse(req.body ?? {});
    const session = await service.clockIn(requireUserId(req), input);
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
}

export async function switchTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = switchTaskSchema.parse(req.body ?? {});
    const session = await service.switchTask(requireUserId(req), input);
    res.status(200).json(session);
  } catch (err) {
    next(err);
  }
}

export async function clockOutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await service.clockOut(requireUserId(req));
    res.status(200).json(session);
  } catch (err) {
    next(err);
  }
}

export async function startBreakHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await service.startBreak(requireUserId(req), req.body.type);
    res.status(200).json(session);
  } catch (err) {
    next(err);
  }
}

export async function endBreakHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await service.endBreak(requireUserId(req));
    res.status(200).json(session);
  } catch (err) {
    next(err);
  }
}

export async function getActiveSessionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const activeSession = await service.getActiveSession(requireUserId(req));
    res.status(200).json({ activeSession });
  } catch (err) {
    next(err);
  }
}

export async function getHistoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { limit } = historyQuerySchema.parse(req.query);
    const sessions = await service.getHistory(requireUserId(req), limit);
    res.status(200).json(sessions);
  } catch (err) {
    next(err);
  }
}
