import type {
  CreateTrainingAssignmentInput,
  MyTrainingAssignmentDTO,
  TeamTrainingAssignmentDTO,
  TrainingAssignmentDTO,
} from "@clearwork/shared";
import { apiFetch } from "./client.js";

export function assignTraining(input: CreateTrainingAssignmentInput): Promise<TrainingAssignmentDTO> {
  return apiFetch<TrainingAssignmentDTO>("/training-assignments", { method: "POST", body: input });
}

export function fetchMyTrainingAssignments(): Promise<MyTrainingAssignmentDTO[]> {
  return apiFetch<MyTrainingAssignmentDTO[]>("/training-assignments/mine");
}

export function fetchTeamTrainingAssignments(): Promise<TeamTrainingAssignmentDTO[]> {
  return apiFetch<TeamTrainingAssignmentDTO[]>("/training-assignments/team");
}

export function deleteTrainingAssignment(id: string): Promise<void> {
  return apiFetch<void>(`/training-assignments/${id}`, { method: "DELETE" });
}
