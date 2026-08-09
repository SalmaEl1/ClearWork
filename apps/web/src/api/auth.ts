import type { AuthResponse, LoginRequest, PublicUser, RegisterRequest } from "@clearwork/shared";
import { apiFetch } from "./client.js";

export function login(input: LoginRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", { method: "POST", body: input });
}

export function register(input: RegisterRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register", { method: "POST", body: input });
}

export function fetchCurrentUser(): Promise<PublicUser> {
  return apiFetch<PublicUser>("/auth/me");
}
