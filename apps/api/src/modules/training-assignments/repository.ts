import { pool } from "../../db/pool.js";

export type TrainingAssignmentRow = {
  id: string;
  training_id: string;
  user_id: string;
  assigned_by: string;
  assigned_at: Date;
};

export async function insertTrainingAssignment(
  trainingId: string,
  userId: string,
  assignedBy: string,
): Promise<TrainingAssignmentRow> {
  const result = await pool.query<TrainingAssignmentRow>(
    `INSERT INTO training_assignments (training_id, user_id, assigned_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [trainingId, userId, assignedBy],
  );
  return result.rows[0]!;
}

export async function findTrainingAssignmentById(id: string): Promise<TrainingAssignmentRow | null> {
  const result = await pool.query<TrainingAssignmentRow>(
    "SELECT * FROM training_assignments WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listTrainingAssignmentsForUser(userId: string): Promise<TrainingAssignmentRow[]> {
  const result = await pool.query<TrainingAssignmentRow>(
    "SELECT * FROM training_assignments WHERE user_id = $1 ORDER BY assigned_at DESC",
    [userId],
  );
  return result.rows;
}

export async function listTrainingAssignmentsForUsers(
  userIds: string[],
): Promise<TrainingAssignmentRow[]> {
  if (userIds.length === 0) return [];
  const result = await pool.query<TrainingAssignmentRow>(
    "SELECT * FROM training_assignments WHERE user_id = ANY($1) ORDER BY assigned_at DESC",
    [userIds],
  );
  return result.rows;
}

export async function deleteTrainingAssignmentById(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM training_assignments WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
