import { pool } from "../../db/pool.js";

export type TrainingRow = {
  id: string;
  title: string;
  created_at: Date;
};

export async function insertTraining(title: string): Promise<TrainingRow> {
  const result = await pool.query<TrainingRow>(
    "INSERT INTO trainings (title) VALUES ($1) RETURNING *",
    [title],
  );
  return result.rows[0]!;
}

export async function listTrainings(): Promise<TrainingRow[]> {
  const result = await pool.query<TrainingRow>("SELECT * FROM trainings ORDER BY title ASC");
  return result.rows;
}

export async function findTrainingById(id: string): Promise<TrainingRow | null> {
  const result = await pool.query<TrainingRow>("SELECT * FROM trainings WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function deleteTrainingById(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM trainings WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
