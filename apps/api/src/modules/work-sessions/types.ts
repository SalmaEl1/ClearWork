import type { BreakType } from "@clearwork/shared";

export type WorkSessionRow = {
  id: string;
  user_id: string;
  started_at: Date;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type BreakRow = {
  id: string;
  work_session_id: string;
  type: BreakType;
  started_at: Date;
  ended_at: Date | null;
  created_at: Date;
};

export type TaskSegmentRow = {
  id: string;
  work_session_id: string;
  task_id: string | null;
  description: string | null;
  started_at: Date;
  ended_at: Date | null;
};
