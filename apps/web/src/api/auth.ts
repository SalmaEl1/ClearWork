import type { AuthResponse, ChangePasswordRequest, LoginRequest, MeResponse } from "@clearwork/shared";
import { apiFetch } from "./client.js";

export function login(input: LoginRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", { method: "POST", body: input });
}

export function fetchCurrentUser(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/auth/me");
}

export function changePassword(input: ChangePasswordRequest): Promise<void> {
  return apiFetch<void>("/auth/password", { method: "PATCH", body: input });
}
