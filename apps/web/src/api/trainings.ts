import type { CreateTrainingInput, TrainingDTO } from "@clearwork/shared";
import { apiFetch } from "./client.js";

export function fetchTrainings(): Promise<TrainingDTO[]> {
  return apiFetch<TrainingDTO[]>("/trainings");
}

export function createTraining(input: CreateTrainingInput): Promise<TrainingDTO> {
  return apiFetch<TrainingDTO>("/trainings", { method: "POST", body: input });
}

export function deleteTraining(id: string): Promise<void> {
  return apiFetch<void>(`/trainings/${id}`, { method: "DELETE" });
}
