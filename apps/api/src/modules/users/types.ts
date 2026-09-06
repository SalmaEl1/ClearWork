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
  hire_date: string; // DATE llega como cadena AAAA-MM-DD, ver db/pool.ts
  created_at: Date;
  updated_at: Date;
};
