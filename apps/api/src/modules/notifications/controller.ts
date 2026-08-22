import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors.js";
import type { AuthUser } from "../auth/jwt.js";
import { listNotificationsQuerySchema } from "./schemas.js";
import * as service from "./service.js";

function requireUser(req: Request): AuthUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export async function listNotificationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const { page, pageSize } = listNotificationsQuerySchema.parse(req.query);
    const result = await service.listMyNotifications(user.id, page, pageSize);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUnreadCountHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const count = await service.countMyUnread(user.id);
    res.status(200).json({ count });
  } catch (err) {
    next(err);
  }
}

export async function markNotificationReadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = requireUser(req);
    const notification = await service.markNotificationRead(req.params.id as string, user.id);
    res.status(200).json(notification);
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsReadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = requireUser(req);
    await service.markAllNotificationsRead(user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
