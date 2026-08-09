import type { Role } from "./roles.js";

/** Forma pública de un usuario: nunca incluye password_hash. */
export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  supervisorId: string | null;
  weeklyTargetHours: number;
  createdAt: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  supervisorId?: string | null;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthResponse = {
  token: string;
  user: PublicUser;
};
