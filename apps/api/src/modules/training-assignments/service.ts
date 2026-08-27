import type {
  MyTrainingAssignmentDTO,
  Role,
  TeamTrainingAssignmentDTO,
  TrainingAssignmentDTO,
} from "@clearwork/shared";
import { sendMail } from "../../email/mailer.js";
import { trainingAssignedEmailTemplate } from "../../email/templates.js";
import { ForbiddenError, NotFoundError } from "../../shared/errors.js";
import { notify } from "../../shared/notifications.js";
import { listActiveWorkersForSupervisor } from "../projects/repository.js";
import { findTrainingById, listTrainings } from "../trainings/repository.js";
import { findUserById } from "../users/repository.js";
import * as repo from "./repository.js";
import type { TrainingAssignmentRow } from "./repository.js";

function toDTO(row: TrainingAssignmentRow): TrainingAssignmentDTO {
  return {
    id: row.id,
    trainingId: row.training_id,
    userId: row.user_id,
    assignedBy: row.assigned_by,
    assignedAt: row.assigned_at.toISOString(),
  };
}

/** Best-effort, mismo criterio que notifyTaskAssigned en
 * tasks/service.ts: un fallo de envío no debe tumbar la asignación. */
async function notifyTrainingAssigned(userId: string, trainingTitle: string): Promise<void> {
  const worker = await findUserById(userId);
  if (!worker) return;

  try {
    await sendMail(worker.email, trainingAssignedEmailTemplate({ fullName: worker.full_name, trainingTitle }));
  } catch (err) {
    console.error("No se pudo enviar el correo de formación asignada", err);
  }
}

export async function assignTraining(
  supervisorId: string,
  input: { trainingId: string; userId: string },
): Promise<TrainingAssignmentDTO> {
  const training = await findTrainingById(input.trainingId);
  if (!training) throw new NotFoundError("Formación no encontrada");

  const team = await listActiveWorkersForSupervisor(supervisorId);
  if (!team.some((w) => w.id === input.userId)) {
    throw new NotFoundError("Usuario no encontrado");
  }

  const assignment = await repo.insertTrainingAssignment(input.trainingId, input.userId, supervisorId);

  await notify(input.userId, { type: "training_assigned", trainingTitle: training.title });
  await notifyTrainingAssigned(input.userId, training.title);

  return toDTO(assignment);
}

export async function listMyTrainingAssignments(userId: string): Promise<MyTrainingAssignmentDTO[]> {
  const [rows, trainings] = await Promise.all([
    repo.listTrainingAssignmentsForUser(userId),
    listTrainings(),
  ]);
  const titleById = new Map(trainings.map((t) => [t.id, t.title]));
  return rows.map((row) => ({ ...toDTO(row), trainingTitle: titleById.get(row.training_id) ?? "" }));
}

export async function listTeamTrainingAssignments(
  supervisorId: string,
): Promise<TeamTrainingAssignmentDTO[]> {
  const team = await listActiveWorkersForSupervisor(supervisorId);
  const nameById = new Map(team.map((w) => [w.id, w.full_name]));

  const [rows, trainings] = await Promise.all([
    repo.listTrainingAssignmentsForUsers(team.map((w) => w.id)),
    listTrainings(),
  ]);
  const titleById = new Map(trainings.map((t) => [t.id, t.title]));

  return rows.map((row) => ({
    ...toDTO(row),
    trainingTitle: titleById.get(row.training_id) ?? "",
    userFullName: nameById.get(row.user_id) ?? "",
  }));
}

export async function deleteTrainingAssignment(
  actorId: string,
  actorRole: Role,
  assignmentId: string,
): Promise<void> {
  const assignment = await repo.findTrainingAssignmentById(assignmentId);
  if (!assignment) throw new NotFoundError("Asignación no encontrada");

  if (actorRole === "supervisor") {
    const team = await listActiveWorkersForSupervisor(actorId);
    if (!team.some((w) => w.id === assignment.user_id)) {
      throw new NotFoundError("Asignación no encontrada");
    }
  } else if (actorRole === "worker") {
    throw new ForbiddenError();
  }

  await repo.deleteTrainingAssignmentById(assignmentId);
}
