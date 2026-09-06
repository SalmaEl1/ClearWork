import type { NextFunction, Request, Response } from "express";
import { createHolidaySchema, listHolidaysQuerySchema } from "./schemas.js";
import * as service from "./service.js";

export async function listHolidaysHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { year } = listHolidaysQuerySchema.parse(req.query);
    const holidays = await service.listHolidaysForYear(year ?? new Date().getUTCFullYear());
    res.status(200).json(holidays);
  } catch (err) {
    next(err);
  }
}

export async function createHolidayHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createHolidaySchema.parse(req.body);
    const holiday = await service.createHoliday(input);
    res.status(201).json(holiday);
  } catch (err) {
    next(err);
  }
}

export async function deleteHolidayHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteHoliday(req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
