import type { AdminUserSummary } from "@clearwork/shared";
import { NotFoundError } from "../../shared/errors.js";
import {
  listActiveMembershipsWithProjectNames,
  type WorkerCurrentProjectRow,
} from "../projects/repository.js";
import { listUsersByRole, toPublicUser, updateUserById } from "../users/repository.js";
import { createAccount } from "../users/service.js";
import type { UserRow } from "../users/types.js";
import type { z } from "zod";
import type { createUserSchema, updateUserSchema } from "./schemas.js";

type CreateUserInput = z.infer<typeof createUserSchema>;
type UpdateUserInput = z.infer<typeof updateUserSchema>;

function toAdminUserSummary(
  user: UserRow,
  projectByUser: Map<string, WorkerCurrentProjectRow>,
): AdminUserSummary {
  const membership = projectByUser.get(user.id);
  return {
    ...toPublicUser(user),
    currentProjectId: membership?.project_id ?? null,
    currentProjectName: membership?.project_name ?? null,
  };
}

async function currentProjectsByUser(): Promise<Map<string, WorkerCurrentProjectRow>> {
  const memberships = await listActiveMembershipsWithProjectNames();
  return new Map(memberships.map((m) => [m.user_id, m]));
}

export async function createUser(input: CreateUserInput): Promise<AdminUserSummary> {
  const user = await createAccount(input);
  return toAdminUserSummary(user, new Map());
}

export async function listUsers(): Promise<AdminUserSummary[]> {
  const [supervisors, workers, projectByUser] = await Promise.all([
    listUsersByRole("supervisor"),
    listUsersByRole("worker"),
    currentProjectsByUser(),
  ]);

  return [...supervisors, ...workers].map((u) => toAdminUserSummary(u, projectByUser));
}

export async function updateUser(
  userId: string,
  input: UpdateUserInput,
): Promise<AdminUserSummary> {
  const updated = await updateUserById(userId, input);
  if (!updated) throw new NotFoundError("Usuario no encontrado");

  const projectByUser = await currentProjectsByUser();
  return toAdminUserSummary(updated, projectByUser);
}
