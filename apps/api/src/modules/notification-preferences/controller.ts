import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors.js";
import type { AuthUser } from "../auth/jwt.js";
import { notificationTypeParamSchema, updatePreferenceSchema } from "./schemas.js";
import * as service from "./service.js";

function requireUser(req: Request): AuthUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export async function listPreferencesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const preferences = await service.listPreferences(user.id);
    res.status(200).json(preferences);
  } catch (err) {
    next(err);
  }
}

export async function updatePreferenceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const { type } = notificationTypeParamSchema.parse(req.params);
    const { channel } = updatePreferenceSchema.parse(req.body);
    const preference = await service.updatePreference(user.id, type, channel);
    res.status(200).json(preference);
  } catch (err) {
    next(err);
  }
}
