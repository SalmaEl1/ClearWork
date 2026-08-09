import type { Role } from "@clearwork/shared";

/** Forma cruda de una fila de la tabla `users`, tal como la devuelve `pg`. */
export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: Role;
  weekly_target_hours: string; // NUMERIC llega como string desde pg
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};
