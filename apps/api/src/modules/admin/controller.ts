import type { NextFunction, Request, Response } from "express";
import * as service from "./service.js";

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
    const user = await service.updateUser(req.params.id as string, req.body);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

export async function deleteUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteUser(req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
