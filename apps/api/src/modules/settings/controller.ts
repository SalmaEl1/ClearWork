import type { NextFunction, Request, Response } from "express";
import * as service from "./service.js";

export async function getSettingsHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await service.getSettings();
    res.status(200).json(settings);
  } catch (err) {
    next(err);
  }
}

export async function updateSettingsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await service.updateSettings(req.body);
    res.status(200).json(settings);
  } catch (err) {
    next(err);
  }
}
