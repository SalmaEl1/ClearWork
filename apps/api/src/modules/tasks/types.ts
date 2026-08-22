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
  created_at: Date;
  updated_at: Date;
};

export type TaskStatusHistoryRow = {
  id: string;
  task_id: string;
  from_status: TaskStatus | null;
  to_status: TaskStatus;
  changed_by: string;
  work_session_id: string | null;
  changed_at: Date;
};
