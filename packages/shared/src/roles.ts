export const ROLES = ["worker", "supervisor"] as const;
export type Role = (typeof ROLES)[number];

export const TASK_STATUSES = ["pending", "in_progress", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const BREAK_TYPES = ["lunch", "ergonomic"] as const;
export type BreakType = (typeof BREAK_TYPES)[number];
