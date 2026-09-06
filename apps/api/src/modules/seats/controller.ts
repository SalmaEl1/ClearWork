import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors.js";
import type { AuthUser } from "../auth/jwt.js";
import { createSeatReservationSchema, getSeatAvailabilityQuerySchema } from "./schemas.js";
import * as service from "./service.js";

function requireUser(req: Request): AuthUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export async function getSeatAvailabilityHandler(req: Request, res: Response, next: NextFunction) {
  try {
    requireUser(req);
    const { date } = getSeatAvailabilityQuerySchema.parse(req.query);
    const availability = await service.getSeatAvailability(date);
    res.status(200).json(availability);
  } catch (err) {
    next(err);
  }
}

export async function createSeatReservationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const input = createSeatReservationSchema.parse(req.body);
    const reservation = await service.createReservation(user.id, input);
    res.status(201).json(reservation);
  } catch (err) {
    next(err);
  }
}

export async function cancelSeatReservationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    await service.cancelOwnReservation(user.id, req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
