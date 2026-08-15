import type { NextFunction, Request, Response } from "express";
import * as authService from "./service.js";
import { UnauthorizedError } from "../../shared/errors.js";

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function meHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    const user = await authService.getCurrentUser(req.user.id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateProfileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    const user = await authService.updateProfile(req.user.id, req.body);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

export async function changePasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    await authService.changePassword(req.user.id, req.body);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
