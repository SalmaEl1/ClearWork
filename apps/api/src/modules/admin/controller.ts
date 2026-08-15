import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors.js";
import * as service from "./service.js";

function requireAdminId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

export async function createUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function listUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await service.listUsers();
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
}

export async function getUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.getUser(req.params.id as string);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.updateUser(req.params.id as string, req.body, requireAdminId(req));
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

export async function deleteUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteUser(req.params.id as string, requireAdminId(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function resendWelcomeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.resendWelcomeEmail(req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function listActivityHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const events = await service.listRecentActivity();
    res.status(200).json(events);
  } catch (err) {
    next(err);
  }
}
