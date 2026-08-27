import type { TrainingDTO } from "@clearwork/shared";
import { NotFoundError } from "../../shared/errors.js";
import * as repo from "./repository.js";
import type { TrainingRow } from "./repository.js";

function toDTO(row: TrainingRow): TrainingDTO {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at.toISOString(),
  };
}

export async function createTraining(title: string): Promise<TrainingDTO> {
  const training = await repo.insertTraining(title);
  return toDTO(training);
}

export async function listTrainings(): Promise<TrainingDTO[]> {
  const rows = await repo.listTrainings();
  return rows.map(toDTO);
}

export async function deleteTraining(id: string): Promise<void> {
  const deleted = await repo.deleteTrainingById(id);
  if (!deleted) throw new NotFoundError("Formación no encontrada");
}
