import type { TaskStatus } from "@clearwork/shared";

export type TaskRow = {
  id: string;
  project_id: string;
  assignee_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  progress_percentage: number;
  /** 'AAAA-MM-DD', tal cual la devuelve PostgreSQL (ver db/pool.ts). */
  due_date: string | null;
  completed_at: Date | null;
  /** NUMERIC llega como string desde pg (igual que weekly_target_hours,
   * ver users/types.ts); null si la tarea no lleva estimación. */
  estimated_hours: string | null;
  created_at: Date;
  updated_at: Date;
};

export type TaskTimeEntryRow = {
  id: string;
  task_id: string;
  logged_by: string;
  minutes: number;
  description: string;
  logged_at: Date;
};

/** Una fila es de cambio de estado (to_status) o de avance
 * (to_progress_percentage), nunca las dos cosas — ver migración 023. */
export type TaskHistoryRow = {
  id: string;
  task_id: string;
  from_status: TaskStatus | null;
  to_status: TaskStatus | null;
  from_progress_percentage: number | null;
  to_progress_percentage: number | null;
  changed_by: string;
  work_session_id: string | null;
  changed_at: Date;
};
