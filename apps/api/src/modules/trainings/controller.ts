import type { NextFunction, Request, Response } from "express";
import { createTrainingSchema } from "./schemas.js";
import * as service from "./service.js";

export async function createTrainingHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { title } = createTrainingSchema.parse(req.body);
    const training = await service.createTraining(title);
    res.status(201).json(training);
  } catch (err) {
    next(err);
  }
}

export async function listTrainingsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const trainings = await service.listTrainings();
    res.status(200).json(trainings);
  } catch (err) {
    next(err);
  }
}

export async function deleteTrainingHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteTraining(req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
