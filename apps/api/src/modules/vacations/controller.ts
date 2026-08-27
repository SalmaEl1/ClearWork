import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors.js";
import type { AuthUser } from "../auth/jwt.js";
import { createVacationRequestSchema } from "./schemas.js";
import * as service from "./service.js";

function requireUser(req: Request): AuthUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export async function createVacationRequestHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const input = createVacationRequestSchema.parse(req.body);
    const request = await service.createVacationRequest(user.id, input);
    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
}

export async function listMyVacationRequestsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const requests = await service.listMyVacationRequests(user.id);
    res.status(200).json(requests);
  } catch (err) {
    next(err);
  }
}

export async function cancelVacationRequestHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const request = await service.cancelOwnVacationRequest(user.id, req.params.id as string);
    res.status(200).json(request);
  } catch (err) {
    next(err);
  }
}

export async function listTeamVacationRequestsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const requests = await service.listTeamVacationRequests(user.id);
    res.status(200).json(requests);
  } catch (err) {
    next(err);
  }
}

export async function approveVacationRequestHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const request = await service.approveVacationRequest(user.id, req.params.id as string);
    res.status(200).json(request);
  } catch (err) {
    next(err);
  }
}

export async function rejectVacationRequestHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const request = await service.rejectVacationRequest(user.id, req.params.id as string);
    res.status(200).json(request);
  } catch (err) {
    next(err);
  }
}
